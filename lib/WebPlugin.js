const fs = require('fs');
const querystring = require('querystring');
const parse5 = require('parse5');
const DefinePlugin = require('webpack/lib/DefinePlugin');
const util = require('./util');
const HtmlParser = require('./htmlParser');

/**
 * this compilation is a Hot Update ?
 * use for webpack hot module replace
 * @param compilation
 * @returns {boolean}
 */
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

/**
 * @param options
 * options.template {string}
 *      html template
 * options.filename {string} require
 *      output html filename
 * options.require {Array}
 *      this html's require entry list, will use list's order to place require entry
 * @constructor
 */
function WebPlugin(options) {
    this.options = options;
    const { require } = options;
    if (Array.isArray(require)) {
        this.htmlParser = new HtmlParser(options.template, require);
    } else if (typeof require === 'object' && require !== undefined) {
        let newRequire = [];
        Object.keys(require).forEach(chunkName => {
            newRequire.push(`${chunkName}?${querystring.stringify(require[chunkName])}`);
        });
        this.htmlParser = new HtmlParser(options.template, newRequire);
    } else {
        this.htmlParser = new HtmlParser(options.template, []);
    }
}

WebPlugin.prototype.apply = function (compiler) {
    let { htmlParser, options } = this;
    // get webpack compiler's env
    global._isProduction = util.isProduction(compiler);

    compiler.plugin('emit', function (compilation, callback) {

        // HotUpdateCompilation should be ignore for html will not change
        if (isHotUpdateCompilation(compilation)) {
            callback();
            return;
        }

        // out scripts to html document
        htmlParser.scripts.forEach(scriptResource => {
            scriptResource.out(compilation);
        });

        // out styles to html document
        htmlParser.styles.forEach(scriptResource => {
            scriptResource.out(compilation);
        });

        // get html document string
        let htmlOut = parse5.serialize(htmlParser.document);
        // add it to webpack output files
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