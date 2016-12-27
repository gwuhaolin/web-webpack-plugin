const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const url = require('url');
const parse5 = require('parse5');
const util = require('./util');

// default html template when no template is config
const DefaultHtmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body>
<!--SCRIPT-->
</body>
</html>
`

/**
 * replace a parse5 node will new nodes
 * this will change node.parentNode
 * if you want remove node from parentNode call replaceNodeWithNew(node)
 * @param node this node will been remove
 * @param nodes new nodes will insert into node's position
 */
function replaceNodeWithNew(node, nodes = []) {
    const childNodes = node.parentNode.childNodes;
    let index = childNodes.findIndex(childNode => childNode === node);
    childNodes.splice(index, 1, ...nodes);
}

/**
 * mock a script node for parse5
 * @param options
 * options.src {string}
 *      script tag's src attr
 * options.content {string}
 *      script tag's javascript content
 * options.parentNode {parse5.Node}
 *      script node's parentNode
 * @returns {*}
 */
function mockScriptNode(options) {
    let { src, content, parentNode } = options;
    if (typeof src === 'string') {
        return {
            nodeName: 'script',
            tagName: 'script',
            parentNode,
            attrs: [{ name: 'src', value: src }]
        };
    } else if (typeof content === 'string') {
        const scriptNode = {
            nodeName: 'script',
            tagName: 'script',
            parentNode,
            attrs: []
        };
        const textNode = {
            nodeName: "#text",
            value: content,
            parentNode: scriptNode
        }
        scriptNode.childNodes = [textNode];
        return scriptNode;
    }
}

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

/**
 * clone a parser5 node
 * @param node
 * @returns {Node}
 */
function cloneNode(node) {
    let ret = Object.assign({}, node);
    delete ret.parentNode;
    ret = JSON.parse(JSON.stringify(ret));
    ret.parentNode = node.parentNode;
    return ret;
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
            replaceNodeWithNew(node)
            return;
        }
        if (query.dist && _isProduction === false) {
            // remove dist only resource
            replaceNodeWithNew(node)
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
                            newNodes.push(mockScriptNode({
                                content: source.source()
                            }))
                        } else {
                            // load this javascript file with src
                            newNodes.push(mockScriptNode({
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
            replaceNodeWithNew(node, newNodes);
        }
    }

    clone() {
        const ret = Object.assign({}, this);
        ret.node = cloneNode(this.node);
        return ret;
    }
}

class HTMLDocument {

    /**
     * get parser5 document by html file path
     * if htmlFilePath is null,will use DefaultHtmlTemplate as template
     * @param htmlFilePath
     */
    constructor(htmlFilePath) {
        /**
         * parse5 document
         */
        this.document = null;
        /**
         * parse5 head Node
         */
        this.headNode = null;
        /**
         * parse5 body Node
         */
        this.bodyNode = null;
        /**
         * all script Resource this page required
         * @type {Array}
         */
        this.scriptResources = [];
        /**
         * all style Resource this page required
         * @type {Array}
         */
        this.stylesResources = [];
        /**
         * all comment Resource this page has
         * @type {Array}
         */
        this.commentResources = [];

        let htmlString = DefaultHtmlTemplate;
        if (HTMLDocument.CacheMap.hasOwnProperty(htmlFilePath)) {
            return HTMLDocument.CacheMap[htmlFilePath].clone();
        } else {
            if (typeof htmlFilePath === 'string') {
                htmlFilePath = path.resolve('.', htmlFilePath);
                htmlString = fs.readFileSync(htmlFilePath, 'utf8');
            }
            this.document = parse5.parse(htmlString);
            this._findOutAll();
            HTMLDocument.CacheMap[htmlFilePath] = this.clone();
        }
    }

    _findOutAll() {
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
    }

    _findScriptStyleTagComment(node) {
        node.childNodes.forEach(childNode => {
            let resource = new Resource(childNode);
            let { type } = resource;
            if (type === 'script') {
                this.scriptResources.push(resource);
            } else if (type === 'style') {
                this.stylesResources.push(resource);
            } else if (type === 'comment') {
                this.commentResources.push(resource);
            }
        })
    }

    /**
     * make sure all required resource this html be inject in this.scriptResources and this.stylesResources
     * @param requires {Array}
     */
    ensureRequires(requires) {
        this.scriptResources.forEach(scriptResource => {
            let { type, chunkName } = scriptResource;
            if (type === 'script') {
                // remove has inject chunk from require chunks
                let index = requires.findIndex(one => one === chunkName);
                if (index >= 0) {
                    requires.splice(index, 1);
                }
            }
        });
        // this html require chunks is left after load chunks by html tag in html template
        if (requires.length > 0) {
            // find out <!--SCRIPT--> comment in html template
            // <!--SCRIPT--> is the position inject left require script
            for (let i = 0; i < this.commentResources.length; i++) {
                let commentResource = this.commentResources[i];
                if (commentResource.data === 'SCRIPT') {
                    let leftScripts = requires.map(chunkName => {
                        return mockScriptNode({
                            src: chunkName,
                            parentNode: commentResource.node.parentNode
                        })
                    });
                    replaceNodeWithNew(commentResource.node, leftScripts);
                    this._findScriptStyleTagComment({
                        childNodes: leftScripts
                    });
                    return;
                }
            }

            // if can't find <!--SCRIPT--> in html template,
            // inject left require script in body tag's end
            let leftScripts = requires.map(chunkName => {
                return mockScriptNode({
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

    /**
     * get html string
     * @returns {string}
     */
    serialize() {
        return parse5.serialize(this.document);
    }

    /**
     * clone this for reuse it to improve performance
     * @returns {HTMLDocument}
     */
    clone() {
        const ret = Object.assign({}, this);
        ret.headNode.childNodes = ret.headNode.childNodes.slice(0);
        ret.bodyNode.childNodes = ret.bodyNode.childNodes.slice(0);
        ret.stylesResources = this.stylesResources.map(stylesResource => stylesResource.clone());
        ret.scriptResources = this.scriptResources.map(scriptResource => scriptResource.clone());
        ret.commentResources = this.commentResources.map(commentResource => commentResource.clone());
        return ret;
    }

}

/**
 * cache parser5 return document to avoid parse same file multi times
 * @type {{htmlFilePath:document}}
 */
HTMLDocument.CacheMap = {};

module.exports = HTMLDocument;