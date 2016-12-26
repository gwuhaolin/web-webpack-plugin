const url = require('url');
const querystring = require('querystring');
const parse5 = require('parse5');
const util = require('./util');

/**
 * get query param from url string
 * @param queryString url string from <script src=queryString> or <link href=queryString>
 * @returns {{dist: boolean, inline: boolean, dev: boolean, ie: boolean}}
 */
function parseQuery(queryString) {
    let query = querystring.parse(queryString);
    return {
        dist: query['_dist'] !== undefined,
        inline: query['_inline'] !== undefined,
        dev: query['_dev'] !== undefined,
        ie: query['_ie'] !== undefined,
    }
}

/**
 * get webpack compilation output files chunk by chunkName
 * @param compilation
 * @param chunkName
 * @returns {*} relate files for chunkName
 */
function getChunkFiles(compilation, chunkName) {
    let { chunks } = compilation;
    let chunk = chunks.find(chunk => chunk.name === chunkName);
    if (typeof chunk === 'object') {
        return chunk.files;
    }
    return [];
}

/**
 * surround parse5 node with [if IE] comment
 * @param nodes
 * @returns {[*]}
 */
function surroundWithIE(nodes = []) {
    let eleString = parse5.serialize({
        childNodes: nodes
    });
    return [{
        nodeName: '#comment',
        data: `[if IE]>\n\t${eleString}\n\t<![endif]`,
    }]
}

class Resource {
    constructor(node) {
        let { nodeName, attrs } = node;
        if (nodeName === 'script') {
            // script src tag
            // eg: <script src=""></script>
            for (let i = 0; i < attrs.length; i++) {
                let attr = attrs[i];
                if (attr.name === 'src' && typeof attr.value === 'string') {
                    const src = attr.value;
                    let arr = src.split('?', 2);
                    this.chunkName = arr[0];
                    this.query = parseQuery(arr[1]);
                    this.node = node;
                    this.type = 'script';
                }
            }
        } else if (nodeName === 'link') {
            // stylesheet tag
            // eg: <link rel="stylesheet" href="">
            let rel, href;
            for (let i = 0; i < attrs.length; i++) {
                let attr = attrs[i];
                if (attr.name === 'rel') {
                    rel = attr.value;
                } else if (attr.name === 'href') {
                    href = attr.value;
                }
            }
            if (rel === 'stylesheet' && typeof href === 'string') {
                let arr = href.split('?', 2);
                this.chunkName = arr[0];
                this.query = parseQuery(arr[1]);
                this.node = node;
                this.type = 'style';
            }
        } else if (nodeName === '#comment') {
            // any comment
            // eg: <!--SCRIPT-->
            this.data = node.data;
            this.node = node;
            this.type = 'comment';
        }
    }

    out(compilation) {
        let publicPath = compilation.compiler.options.output.publicPath;
        const { _isProduction }= global;
        let { chunkName, node, query, type } = this;
        let { assets } = compilation;
        if (query.dev && _isProduction === true) {
            // remove dev only resource
            util.replaceNodeWithNew(node)
            return;
        }
        if (query.dist && _isProduction === false) {
            // remove dist only resource
            util.replaceNodeWithNew(node)
            return;
        }
        let newNodes = [];
        switch (type) {
            case 'script':
                let fileNames = getChunkFiles(compilation, chunkName);
                fileNames.forEach(fileName => {
                    // output javascript file only
                    if (fileName.endsWith('.js')) {
                        let source = assets[fileName];
                        if (query.inline) {
                            // inline javascript content to script
                            newNodes.push(util.mockScriptNode({
                                content: source.source()
                            }))
                        } else {
                            // load this javascript file with src
                            newNodes.push(util.mockScriptNode({
                                src: url.resolve(publicPath || '', fileName)
                            }))
                        }
                    }
                });
                break;
            case 'style':
                // TODO
                break;
            default:
        }
        if (query.ie) {
            newNodes = surroundWithIE(newNodes);
        }
        if (newNodes.length > 0) {
            util.replaceNodeWithNew(node, newNodes);
        }
    }
}

class HtmlParser {

    /**
     *
     * @param htmlFilePath
     *      if htmlFilePath is not an string,will use DefaultHtmlTemplate as html template
     * @param require
     */
    constructor(htmlFilePath, require) {
        this.require = require;
        this.scripts = [];
        this.styles = [];
        this.comments = [];
        this.document = util.parseHTML(htmlFilePath);
        this.document.childNodes.forEach(node => {
            if (node.nodeName === 'html') {
                node.childNodes.forEach(node => {
                    if (node.nodeName === 'head') {
                        this.headNode = node;
                        this._findScriptStyleTagComment(node);
                    } else if (node.nodeName === 'body') {
                        this.bodyNode = node;
                        this._findScriptStyleTagComment(node);
                    }
                });
            }
        });

        // this html require chunks is left after load chunks by html tag in html template
        if (this.require.length > 0) {
            // find out <!--SCRIPT--> comment in html template
            // <!--SCRIPT--> is the position inject left require script
            for (let i = 0; i < this.comments.length; i++) {
                let comment = this.comments[i];
                if (comment.data === 'SCRIPT') {
                    let leftScripts = require.map(chunkName => {
                        return util.mockScriptNode({
                            src: chunkName,
                            parentNode: comment.node.parentNode
                        })
                    });
                    util.replaceNodeWithNew(comment.node, leftScripts);
                    this._findScriptStyleTagComment({
                        childNodes: leftScripts
                    });
                    return;
                }
            }

            // if can't find <!--SCRIPT--> in html template,
            // inject left require script in body tag's end
            let leftScripts = require.map(chunkName => {
                return util.mockScriptNode({
                    src: chunkName,
                    parentNode: this.bodyNode
                })
            });
            this.bodyNode.childNodes.push(...leftScripts);
            this._findScriptStyleTagComment({
                childNodes: leftScripts
            });
        }
    }

    _findScriptStyleTagComment(node) {
        node.childNodes.forEach(childNode => {
            let resource = new Resource(childNode, this.require);
            let { type, chunkName } = resource;
            if (type === 'script') {
                this.scripts.push(resource);
                // remove has inject chunk from require chunks
                let index = this.require.findIndex(one => one === chunkName);
                if (index >= 0) {
                    this.require.splice(index, 1);
                }
            } else if (type === 'style') {
                this.styles.push(resource);
            } else if (type === 'comment') {
                this.comments.push(resource);
            }
        })
    }

}

module.exports = HtmlParser;