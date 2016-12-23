const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const parse5 = require('parse5');
const util = require('./util');

function parseQuery(queryString) {
    let query = querystring.parse(queryString);
    return {
        dist: query['_dist'] != null,
        inline: query['_inline'] != null,
        dev: query['_dev'] != null,
        ie: query['_ie'] != null,
    }
}

function getChunkFiles(compilation, chunkName) {
    let { chunks } = compilation;
    let chunk = chunks.find(chunk => chunk.name === chunkName);
    if (typeof chunk === 'object') {
        return chunk.files;
    }
    return [];
}


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
            util.replaceNodeWithNew(node)
            return;
        }
        if (query.dist && _isProduction === false) {
            util.replaceNodeWithNew(node)
            return;
        }
        let newNodes = [];
        switch (type) {
            case 'script':
                let fileNames = getChunkFiles(compilation, chunkName);
                fileNames.forEach(fileName => {
                    if (fileName.endsWith('.js')) {
                        let source = assets[fileName];
                        if (query.inline) {
                            newNodes.push(util.mockScriptNode({
                                content: source.source()
                            }))
                        } else {
                            newNodes.push(util.mockScriptNode({
                                src: publicPath + fileName
                            }))
                        }
                    }
                });
                break;
            case 'style':
                break;
            case 'comment':
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

    constructor(htmlFilePath, require) {
        this.require = require || [];
        this.scripts = [];
        this.styles = [];
        this.comments = [];
        const htmlString = fs.readFileSync(htmlFilePath, 'utf8');
        this.document = parse5.parse(htmlString);
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
        if (this.require.length > 0) {

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
            let resource = new Resource(childNode);
            let { type, chunkName } = resource;
            if (type === 'script') {
                this.scripts.push(resource);
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