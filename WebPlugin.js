const fs = require('fs');
const parse5 = require('parse5');
const DefinePlugin = require('webpack/lib/DefinePlugin');
const util = require('./util');
const HtmlParser = require('./htmlParser');

function isHotUpdateCompilation(compilation) {
    let files = Object.keys(compilation.assets);
    for (let i = 0; i < files.length; i++) {
        let name = files[i];
        if (/.+\.hot-update\.js$/.test(name)) {
            return true;
        }
    }
    return false;
}

function WebPlugin(options) {
    this.options = options;
    this.htmlParser = new HtmlParser(options.template, options.require)
}

WebPlugin.prototype.apply = function (compiler) {
    let { htmlParser, options } = this;
    global._isProduction = util.isProduction(compiler);

    compiler.plugin('emit', function (compilation, callback) {
        if (isHotUpdateCompilation(compilation)) {
            callback();
            return;
        }
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