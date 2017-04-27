const fs = require('fs');
const path = require('path');
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
    const query = querystring.parse(queryString);
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
    const { chunks } = compilation;
    const chunk = chunks.find(chunk => chunk.name === chunkName);
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
    const eleString = parse5.serialize({
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

    /**
     * make a Resource with parse5 Node in HTMLDocument
     * @param node a parse5 Node
     */
    constructor(node) {
        this.node = node;
        const { nodeName, attrs } = node;
        if (nodeName === 'script') {
            // script src tag
            // eg: <script src=""></script>
            for (let i = 0; i < attrs.length; i++) {
                const attr = attrs[i];
                if (attr.name === 'src' && typeof attr.value === 'string') {
                    const src = attr.value;
                    const arr = src.split('?', 2);
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
                const attr = attrs[i];
                if (attr.name === 'rel') {
                    rel = attr.value;
                } else if (attr.name === 'href') {
                    href = attr.value;
                }
            }
            if (rel === 'stylesheet' && typeof href === 'string') {
                const arr = href.split('?', 2);
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
        const { chunkName, outputNodes, query, type } = this;
        const { assets } = compilation;
        let newNodes = [];

        // add a file to newNodes
        const outToNewNodes = (fileName, fileContent) => {
            if (type === 'script') {
                // output js file only
                if (fileName.endsWith('.js')) {
                    if (query.inline) {
                        // inline javascript content to script
                        newNodes.push(util.mockScriptNode({
                            content: fileContent,
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
            } else if (type === 'style') {
                // output css file only
                if (fileName.endsWith('.css')) {
                    if (query.inline) {
                        // inline javascript content to script
                        newNodes.push(util.mockStyleNode({
                            content: fileContent,
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
            }
        }

        // use newNodes to replace this.outputNodes
        const outToOutputNodes = () => {
            if (newNodes.length > 0) {
                // 只要找到了对应的文件就输出
                // only if has find chunk file for this entry should out put it,else ignore it
                util.replaceNodesWithNodes(outputNodes, newNodes);
                this.outputNodes = newNodes;
            } else {
                // 找不到对应的输出文件
                if (compilation.chunks.findIndex(chunk => chunk.name === this.chunkName) > -1) {
                    // 如果在 compilation.chunks 里找到了 this.chunkName 对应的入口，但是找不到对应的输出文件，就把 outputNodes 从文档流去除
                    // 比如 this.chunkName 是 之后动态生成的 common 入口
                    // newNodes为空，调用把 outputNodes 从文档流去除
                    util.replaceNodesWithNodes(outputNodes, newNodes);
                    this.outputNodes = newNodes;
                } else {
                    // 如果在 compilation.entrypoints 里找不到 this.chunkName 对应的入口 ,就认为这是一个直接导入本地文件的资源。
                    if (this.chunkName) {
                        const filePath = path.resolve('.', this.chunkName);
                        try {
                            // 去读取对应的文件
                            // 如果这个文件存在就认为这是一个直接导入本地文件的资源。
                            const fileContent = fs.readFileSync(filePath, {
                                encoding: 'utf8'
                            });
                            const filename = util.getFilenameByFilePath(filePath);

                            if (query.inline) {
                                // 如果该文件是要inline进本html的
                            } else {
                                // 如果该文件是要通过src加载进本html的
                                util.addFileToWebpackOutput(compilation, filename, fileContent);
                            }
                            outToNewNodes(filename, fileContent);
                            util.replaceNodesWithNodes(outputNodes, newNodes);
                            this.outputNodes = newNodes;
                        } catch (err) {
                            //读取文件失败
                        }
                    }
                    // 剩下的情况就把outputNodes 保留在文档流里不动outputNodes。
                    // 比如引入自定义url http://qq.com/hi.js
                }
            }
        }

        if (query.dev && _isProduction === true) {
            // remove dev only resource
            newNodes = commentNodes(outputNodes, parentNode);
            outToOutputNodes();
            return;
        }
        if (query.dist && _isProduction === false) {
            // remove dist only resource
            newNodes = commentNodes(outputNodes, parentNode);
            outToOutputNodes();
            return;
        }

        const fileNames = getChunkFiles(compilation, chunkName);
        fileNames.forEach(fileName => {
            const source = assets[fileName];
            outToNewNodes(fileName, source.source());
        });

        if (query.ie) {
            newNodes = surroundWithIE(newNodes, parentNode);
        }

        outToOutputNodes();
    }

    clone() {
        const ret = Object.assign({}, this);
        ret.__proto__ = this.__proto__;
        ret.node = cloneNode(this.node);
        return ret;
    }
}

module.exports = Resource;