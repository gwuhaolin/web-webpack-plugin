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
 * @param oldNodes this nodes will been remove
 * @param newNodes new nodes will insert into oldNodes's position
 */
function replaceNodesWithNodes(oldNodes, newNodes = []) {
    const childNodes = oldNodes[0].parentNode.childNodes;
    let index = 0;
    oldNodes.forEach(oldNode => {
        index = childNodes.findIndex(childNode => childNode === oldNode);
        childNodes.splice(index, 1);
    });
    childNodes.splice(index, 0, ...newNodes);
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
 * mock a script node for parse5
 * @param options
 * options.href {string}
 *      style link tag's href attr
 * options.content {string}
 *      style tag's javascript content
 * options.parentNode {parse5.Node}
 *      style node's parentNode
 * @returns {*}
 */
function mockStyleNode(options) {
    let { href, content, parentNode } = options;
    if (typeof href === 'string') {
        return {
            nodeName: 'link',
            tagName: 'link',
            parentNode,
            attrs: [
                { name: 'rel', value: 'stylesheet' },
                { name: 'href', value: href },
            ]
        };
    } else if (typeof content === 'string') {
        const styleNode = {
            nodeName: 'style',
            tagName: 'style',
            parentNode,
            attrs: []
        };
        const textNode = {
            nodeName: "#text",
            value: content,
            parentNode: styleNode
        }
        styleNode.childNodes = [textNode];
        return styleNode;
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
 * @param parentNode
 * @returns {[*]}
 */
function surroundWithIE(nodes = [], parentNode) {
    let eleString = parse5.serialize({
        childNodes: nodes
    });
    return [{
        nodeName: '#comment',
        data: `[if IE]>${eleString}<![endif]`,
        parentNode
    }]
}

/**
 * surround nodes with comment
 * @param nodes
 * @param parentNode
 * @returns {[*]}
 */
function commentNodes(nodes, parentNode) {
    // don't surround comment nodes with comment
    if (nodes[0].nodeName === '#comment') {
        return nodes;
    }
    const eleString = parse5.serialize({
        childNodes: nodes
    });
    return [{
        nodeName: '#comment',
        data: eleString,
        parentNode
    }];
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

/**
 * a script resource or a style resource in HTMLDocument
 */
class Resource {
    constructor(node) {
        this.node = node;
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
                    this.type = 'script';
                    break;
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
                this.type = 'style';
            }
        } else if (nodeName === '#comment') {
            // any comment
            // eg: <!--SCRIPT-->
            this.data = node.data;
            this.type = 'comment';
        }
        this.outputNodes = [node];
    }

    out(compilation, publicPath) {
        const { _isProduction } = global;
        const parentNode = this.node.parentNode;
        let { chunkName, outputNodes, query, type } = this;
        let { assets } = compilation;
        let newNodes = [];
        const out = () => {
            // 只要找到了对应的文件就输出
            if (newNodes.length > 0) {
                // only if has find chunk file for this entry should out put it,else ignore it
                replaceNodesWithNodes(outputNodes, newNodes);
                this.outputNodes = newNodes;
            } else { // 找不到对应的输出文件
                // 如果在 compilation.chunks 里找到了 this.chunkName 对应的入口，但是找不到对应的输出文件，就把 outputNodes 从文档流去除
                // 比如 this.chunkName 是 之后动态生成的 common 入口
                if (compilation.chunks.findIndex(chunk => chunk.name === this.chunkName) > -1) {
                    // newNodes为空，调用把 outputNodes 从文档流去除
                    replaceNodesWithNodes(outputNodes, newNodes);
                    this.outputNodes = newNodes;
                }
                // 如果在 compilation.entrypoints 里找不到 this.chunkName 对应的入口，比如引入自定义url http://qq.com/hi 就把outputNodes 保留在文档流里不动outputNodes。
            }
        }
        if (query.dev && _isProduction === true) {
            // remove dev only resource
            newNodes = commentNodes(outputNodes, parentNode);
            out();
            return;
        }
        if (query.dist && _isProduction === false) {
            // remove dist only resource
            newNodes = commentNodes(outputNodes, parentNode);
            out();
            return;
        }
        let fileNames = getChunkFiles(compilation, chunkName);
        if (type === 'script') {
            fileNames.forEach(fileName => {
                // output javascript file only
                if (fileName.endsWith('.js')) {
                    let source = assets[fileName];
                    if (query.inline) {
                        // inline javascript content to script
                        newNodes.push(mockScriptNode({
                            content: source.source(),
                            parentNode,
                        }))
                    } else {
                        // load this javascript file with src
                        newNodes.push(mockScriptNode({
                            src: url.resolve(publicPath || '', fileName),
                            parentNode,
                        }))
                    }
                }
            });
        } else if (type === 'style') {
            fileNames.forEach(fileName => {
                // output javascript file only
                if (fileName.endsWith('.css')) {
                    let source = assets[fileName];
                    if (query.inline) {
                        // inline javascript content to script
                        newNodes.push(mockStyleNode({
                            content: source.source(),
                            parentNode,
                        }))
                    } else {
                        // load this javascript file with src
                        newNodes.push(mockStyleNode({
                            href: url.resolve(publicPath || '', fileName),
                            parentNode,
                        }))
                    }
                }
            });
        }
        if (query.ie) {
            newNodes = surroundWithIE(newNodes, parentNode);
        }
        out();
    }

    clone() {
        const ret = Object.assign({}, this);
        ret.__proto__ = this.__proto__;
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
         * inject position for required left scripts
         */
        this.scriptInjectCommentNode = null;
        /**
         * inject position for required left styles
         */
        this.styleInjectCommentNode = null;

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
                if (resource.data === 'SCRIPT') {
                    this.scriptInjectCommentNode = resource.node;
                } else if (resource.data === 'STYLE') {
                    this.styleInjectCommentNode = resource.node;
                }
            }
        })
    }

    _ensureRequireScripts(requiresScripts) {
        this.scriptResources.forEach(scriptResource => {
            let { chunkName } = scriptResource;
            // remove has inject chunk from require chunks
            let index = requiresScripts.findIndex(one => one === chunkName);
            if (index >= 0) {
                requiresScripts.splice(index, 1);
            }
        });
        let leftScriptNodes = [];
        // this html require chunks is left after load chunks by html tag in html template
        if (requiresScripts.length > 0) {
            if (this.scriptInjectCommentNode !== null) {
                // find out <!--SCRIPT--> comment in html template
                // <!--SCRIPT--> is the position inject left require script
                leftScriptNodes = requiresScripts.map(chunkName => mockScriptNode({
                    src: chunkName,
                    parentNode: this.scriptInjectCommentNode.parentNode
                }));
                replaceNodesWithNodes([this.scriptInjectCommentNode], leftScriptNodes);
            } else {
                // if can't find <!--SCRIPT--> in html template,
                // inject left require script in body tag's end
                leftScriptNodes = requiresScripts.map(chunkName => mockScriptNode({
                    src: chunkName,
                    parentNode: this.bodyNode
                }));
                this.bodyNode.childNodes.push(...leftScriptNodes);
            }

        }
        return leftScriptNodes;
    }

    _ensureRequireStyles(requiresStyles) {
        this.stylesResources.forEach(styleResource => {
            let { chunkName } = styleResource;
            // remove has inject chunk from require chunks
            let index = requiresStyles.findIndex(one => one === chunkName);
            if (index >= 0) {
                requiresStyles.splice(index, 1);
            }
        })
        let leftStyleNodes = [];
        // this html require chunks is left after load chunks by html tag in html template
        if (requiresStyles.length > 0) {
            if (this.styleInjectCommentNode !== null) {
                // find out <!--STYLE--> comment in html template
                // <!--STYLE--> is the position inject left require style
                leftStyleNodes = requiresStyles.map(chunkName => mockStyleNode({
                    href: chunkName,
                    parentNode: this.styleInjectCommentNode.parentNode
                }));
                replaceNodesWithNodes([this.styleInjectCommentNode], leftStyleNodes);
            } else {
                // if can't find <!--STYLE--> in html template,
                // inject left require script in head tag's end
                leftStyleNodes = requiresStyles.map(chunkName => mockStyleNode({
                    href: chunkName,
                    parentNode: this.headNode
                }));
                this.headNode.childNodes.push(...leftStyleNodes);
            }
        }
        return leftStyleNodes;
    }

    /**
     * make sure all required resource this html be inject in this.scriptResources and this.stylesResources
     * @param requires {Array}
     */
    ensureRequires(requires) {
        let lefts = [];
        lefts.push(...this._ensureRequireScripts([...requires]));
        if (global._isExtractStyle) {
            lefts.push(...this._ensureRequireStyles([...requires]));
        }
        this._findScriptStyleTagComment({
            childNodes: lefts
        });
    }

    /**
     * get html string
     * @returns {string}
     */
    serialize() {
        // in Production mode drop all comment and blank text
        const mini = (childNodes) => {
            for (let i = childNodes.length - 1; i >= 0; i--) {
                let node = childNodes[i];
                const nodeName = node.nodeName;
                if (nodeName === '#comment' && !node.data.startsWith('[if ')) {
                    childNodes.splice(i, 1);
                } else if (nodeName === '#text') {
                    node.value = node.value.trim();
                    if (node.value.length === 0) {
                        childNodes.splice(i, 1);
                    }
                }
            }
        }
        // pretty html output
        const pretty = (childNodes) => {
            for (let i = childNodes.length - 1; i >= 0; i--) {
                let node = childNodes[i];
                let preNode = childNodes[i - 1];
                if (node.nodeName !== '#text') {
                    if (preNode) {
                        if (preNode.nodeName === '#text' && preNode.value.indexOf('\n') >= 0) {
                            return;
                        }
                    }
                    replaceNodesWithNodes([node], [{
                        nodeName: '#text',
                        value: '\n',
                        parentNode: node.parentNode
                    }, node])
                }
            }
        }
        const f = global._isProduction ? mini : pretty;
        f(this.headNode.childNodes);
        f(this.bodyNode.childNodes);
        return parse5.serialize(this.document);
    }

    /**
     * clone this for reuse it to improve performance
     * @returns {HTMLDocument}
     */
    clone() {
        const ret = Object.assign({}, this);
        ret.__proto__ = this.__proto__;
        ret.headNode.childNodes = [...this.headNode.childNodes];
        ret.bodyNode.childNodes = [...this.bodyNode.childNodes];
        ret.stylesResources = this.stylesResources.map(stylesResource => stylesResource.clone());
        ret.scriptResources = this.scriptResources.map(scriptResource => scriptResource.clone());
        return ret;
    }

}

/**
 * cache parser5 return document to avoid parse same file multi times
 * @type {{htmlFilePath:document}}
 */
HTMLDocument.CacheMap = {};

module.exports = HTMLDocument;