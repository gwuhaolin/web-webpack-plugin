const fs = require('fs');
const querystring = require('querystring');
const util = require('./util');
const HTMLDocument = require('./HTMLDocument');

/**
 * an WebPlugin handle a html page
 */
class WebPlugin {

    /**
     * @param options
     * options.template {string}
     *      html template
     * options.filename {string} require
     *      output html filename
     * options.require {Array}
     *      this html's require entry list, will use list's order to place require entry
     * options.stylePublicPath {string}
     *      publicPath for css file,for js file will use webpack.publicPath
     * @constructor
     */
    constructor(options) {
        this.options = options;
        this.htmlDocument = new HTMLDocument(options.template);
        let { requires } = options;
        // if requires is object then convert it to querystring array
        if (typeof requires === 'object' && requires.constructor === Object) {
            let newRequires = [];
            Object.keys(requires).forEach(chunkName => {
                newRequires.push(`${chunkName}?${querystring.stringify(requires[chunkName])}`);
            });
            requires = newRequires;
        } else if (requires === undefined) {
            requires = [];
        }
        options.requires = requires;
    }

    apply(compiler) {
        let { htmlDocument, options } = this;
        // get webpack compiler's env
        if (global._isProduction === undefined) {
            global._isProduction = util.isProduction(compiler);
        }
        if (global._isExtractStyle === undefined) {
            global._isExtractStyle = util.isExtractStyle(compiler);
        }

        //noinspection JSUnresolvedFunction
        compiler.plugin('emit', function (compilation, callback) {

            // HotUpdateCompilation should be ignore for html will not change
            if (util.isHotUpdateCompilation(compilation)) {
                callback();
                return;
            }

            htmlDocument.ensureRequires(options.requires);
            // out scripts to html document
            htmlDocument.scriptResources.forEach(scriptResource => {
                scriptResource.out(compilation, compilation.compiler.options.output.publicPath);
            });
            // out styles to html document
            htmlDocument.stylesResources.forEach(scriptResource => {
                scriptResource.out(compilation, options.stylePublicPath || compilation.compiler.options.output.publicPath);
            });

            // get html document string
            let htmlOut = htmlDocument.serialize();
            // add it to webpack output files
            //noinspection JSUnresolvedVariable
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
    }
}

module.exports = WebPlugin;