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
 * @returns {parse5.Node}
 */
function mockScriptNode(options = { src, content, parentNode }) {
    let { src, content, parentNode } = options;
    if (typeof src === 'string') {
        return {
            nodeName: 'script',
            tagName: 'script',
            parentNode,
            attrs: [{ name: 'src', value: src }]
        };
    } else if (typeof content === 'string') {
        return {
            nodeName: 'script',
            tagName: 'script',
            parentNode,
            attrs: [],
            childNodes: [{
                nodeName: "#text",
                value: content
            }]
        };
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
    for (var i = 0; i < plugins.length; i++) {
        var plugin = plugins[i];
        try {
            if (plugin.definitions['process.env.NODE_ENV'] === '"production"') {
                return true;
            }
        } catch (_) {
        }
    }
    return false;
}

module.exports = {
    replaceNodeWithNew,
    mockScriptNode,
    isProduction
}