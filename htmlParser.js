const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const parse5 = require('parse5');

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
    console.error('WebPlugin', `can't find resource ${chunkName} in chunks`);
}

function replaceNodeWithNew(node, nodes = []) {
    const childNodes = node.parentNode.childNodes;
    let index = childNodes.findIndex(childNode => childNode === node);
    childNodes.splice(index, 1, ...nodes);
}

function mockScriptNode(options = { src, content }) {
    let { src, content } = options;
    if (typeof src === 'string') {
        return {
            nodeName: 'script',
            tagName: 'script',
            attrs: [{ name: 'src', value: src }]
        };
    } else if (typeof content === 'string') {
        return {
            nodeName: 'script',
            tagName: 'script',
            attrs: [],
            childNodes: [{
                nodeName: "#text",
                value: content
            }]
        };
    }
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
                    this.base = arr[0];
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
                this.base = arr[0];
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
        let isProduction = global._isProduction;
        let { base, node, query, type } = this;
        let { assets } = compilation;
        if (query.dev && isProduction === true) {
            replaceNodeWithNew(node)
            return;
        }
        if (query.dist && isProduction === false) {
            replaceNodeWithNew(node)
            return;
        }
        let newNodes = [];
        switch (type) {
            case 'script':
                let fileNames = getChunkFiles(compilation, base);
                fileNames.forEach(fileName => {
                    if (fileName.endsWith('.js')) {
                        let source = assets[fileName];
                        if (query.inline) {
                            newNodes.push(mockScriptNode({
                                content: source.source()
                            }))
                        } else {
                            newNodes.push(mockScriptNode({
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
        replaceNodeWithNew(node, newNodes);
    }
}

class HtmlParser {

    constructor(htmlFilePath) {
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
    }

    _findScriptStyleTagComment(node) {
        node.childNodes.forEach(childNode => {
            let resource = new Resource(childNode);
            let { type } = resource;
            if (type === 'script') {
                this.scripts.push(resource);
            } else if (type === 'style') {
                this.styles.push(resource);
            } else if (type === 'comment') {
                this.comments.push(resource);
            }
        })
    }

}

module.exports = HtmlParser;