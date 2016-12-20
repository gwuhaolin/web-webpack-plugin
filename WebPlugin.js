const fs = require('fs');
const parse5 = require('parse5');
const DefinePlugin = require('webpack/lib/DefinePlugin');
const HtmlParser = require('./htmlParser');

function isProduction(compiler) {
    let plugins = compiler.options.plugins;
    let definePlugin = plugins.find(plugin => plugin instanceof DefinePlugin);
    if (definePlugin instanceof DefinePlugin) {
        return definePlugin.definitions['process.env.NODE_ENV'] === '"production"';
    } else {
        return false;
    }
}

function WebPlugin(options) {
    this.options = options;
    this.htmlParser = new HtmlParser(options.template)
}

WebPlugin.prototype.apply = function (compiler) {
    let { htmlParser, options } = this;
    global._isProduction = isProduction(compiler);

    compiler.plugin('emit', function (compilation, callback) {
        htmlParser.scripts.forEach(scriptResource => {
            scriptResource.out(compilation);
        });
        htmlParser.styles.forEach(scriptResource => {
            scriptResource.out(compilation);
        });
        let htmlOut = parse5.serialize(htmlParser.document);
        compilation.assets[options.filename] = {
            source: () => {
                return htmlOut;
            },
            size: () => {
                return Buffer.byteLength(htmlOut, 'utf8');
            }
        }
        callback();
    });
};

module.exports = WebPlugin;