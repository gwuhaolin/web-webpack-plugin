function replaceNodeWithNew(node, nodes = []) {
    const childNodes = node.parentNode.childNodes;
    let index = childNodes.findIndex(childNode => childNode === node);
    childNodes.splice(index, 1, ...nodes);
}

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