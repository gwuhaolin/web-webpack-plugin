const parse5 = require('parse5');
const querystring = require('querystring');
const url = require('url');
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
                util.replaceNodesWithNodes(outputNodes, newNodes);
                this.outputNodes = newNodes;
            } else { // 找不到对应的输出文件
                // 如果在 compilation.chunks 里找到了 this.chunkName 对应的入口，但是找不到对应的输出文件，就把 outputNodes 从文档流去除
                // 比如 this.chunkName 是 之后动态生成的 common 入口
                if (compilation.chunks.findIndex(chunk => chunk.name === this.chunkName) > -1) {
                    // newNodes为空，调用把 outputNodes 从文档流去除
                    util.replaceNodesWithNodes(outputNodes, newNodes);
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
                        newNodes.push(util.mockScriptNode({
                            content: source.source(),
                            parentNode,
                        }))
                    } else {
                        // load this javascript file with src
                        newNodes.push(util.mockScriptNode({
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
                        newNodes.push(util.mockStyleNode({
                            content: source.source(),
                            parentNode,
                        }))
                    } else {
                        // load this javascript file with src
                        newNodes.push(util.mockStyleNode({
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

module.exports = Resource;