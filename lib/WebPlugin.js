const path = require('path');
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
	 *
	 * options.template {string}
	 *      html template path
	 *
	 * options.templateContent {string}
	 *      html template content, high priority than template
	 *
	 * options.filename {string} require
	 *      output html filename
	 *
	 * options.require {Array}
	 *      this html's require entry list, will use list's order to place require entry
	 *
	 * options.stylePublicPath {string}
	 *      publicPath for css file,for js file will use webpack.publicPath
	 *
	 * @constructor
	 */
	constructor(options) {
		// user may pass relate path, trans it to abs path
		if (typeof options.template === 'string' && !options.templateContent) {
			options.templateContent = fs.readFileSync(path.resolve('.', options.template), {
				encoding: 'utf8'
			});
		}
		this.options = options;
		this.htmlDocument = new HTMLDocument(options);
		let { requires } = options;
		// if requires is object then convert it to querystring array
		if (typeof requires === 'object' && requires.constructor === Object) {
			const newRequires = [];
			Object.keys(requires).forEach(chunkName => {
				newRequires.push(`${chunkName}?${querystring.stringify(requires[chunkName])}`);
			});
			requires = newRequires;
		} else if (requires === undefined) {
			requires = [];
		}
		options.requires = requires;
	}

	// call by webpack
	apply(compiler) {
		const { options } = this;
		// get webpack compiler's env
		if (global._isProduction === undefined) {
			global._isProduction = util.isProduction(compiler);
		}
		if (global._isExtractStyle === undefined) {
			global._isExtractStyle = util.isExtractStyle(compiler);
		}

		// if pass template option, then watch template file change for hot reload
		if (typeof options.template === 'string') {
			// watch for file changed event
			compiler.plugin('watch-run', (watching, done) => {
				// noinspection JSUnresolvedVariable
				const changedTimes = watching.compiler.watchFileSystem.watcher.mtimes;
				if (changedTimes[options.template] !== undefined) {
					// html template file has changed, re build this.htmlDocument
					this.htmlDocument = new HTMLDocument(options);
				}
				done();
			});

			// add html template file to file dependencies after compile, to let webpack watch html template file change and emit watch-run event
			compiler.plugin('after-compile', (compilation, done) => {
				if (typeof options.template === 'string') {
					const { fileDependencies } = compilation;
					const notHas = fileDependencies.findIndex(filePath => filePath === options.template) === -1;
					if (notHas) {
						fileDependencies.push(options.template);
					}
				}
				done();
			});
		}

		compiler.plugin('emit', (compilation, done) => {

			// HotUpdateCompilation should be ignore for html will not change
			if (util.isHotUpdateCompilation(compilation)) {
				done();
				return;
			}

			this.htmlDocument.ensureRequires(options.requires);
			// out scripts to html document
			this.htmlDocument.scriptResources.forEach(scriptResource => {
				scriptResource.out(compilation);
			});
			// out styles to html document
			this.htmlDocument.stylesResources.forEach(scriptResource => {
				scriptResource.out(compilation);
			});
			// out others to html document
			this.htmlDocument.otherResources.forEach(otherResource => {
				otherResource.out(compilation);
			});

			// get html document string
			const htmlOut = this.htmlDocument.serialize();
			// add it to webpack output files
			util.addFileToWebpackOutput(compilation, options.filename, htmlOut);
			done();
		});
	}
}

module.exports = WebPlugin;