const fs = require('fs');
const parse5 = require('parse5');
const clone = require('clone');

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
 * whether is webpack compiler is in Production env
 * only if webpack use DefinePlugin to define
 * process.env.NODE_ENV==="production"
 * will return true else return false
 * @param compiler
 * @returns {boolean}
 */
function isProduction(compiler) {
    let plugins = compiler.options.plugins;
    for (let i = 0; i < plugins.length; i++) {
        let plugin = plugins[i];
        try {
            if (plugin.definitions['process.env.NODE_ENV'] === '"production"') {
                return true;
            }
        } catch (_) {
        }
    }
    return false;
}

function cloneDocument(node) {
    return clone(node, true);
}

/**
 * cache parser5 return document to avoid parse same file multi times
 * @type {{htmlFilePath:document}}
 */
const htmlParseCacheMap = {};

/**
 * get parser5 document by html file path
 * if htmlFilePath is null,will use DefaultHtmlTemplate as template
 * @param htmlFilePath
 * @returns {*}
 */
function parseHTML(htmlFilePath) {
    let htmlString = DefaultHtmlTemplate;
    if (htmlParseCacheMap.hasOwnProperty(htmlFilePath)) {
        return cloneDocument(htmlParseCacheMap[htmlFilePath]);
    } else {
        if (typeof htmlFilePath === 'string') {
            htmlString = fs.readFileSync(htmlFilePath, 'utf8');
        }
        let document = parse5.parse(htmlString);
        htmlParseCacheMap[htmlFilePath] = document;
        return cloneDocument(document);
    }
}

module.exports = {
    replaceNodeWithNew,
    mockScriptNode,
    isProduction,
    parseHTML
}