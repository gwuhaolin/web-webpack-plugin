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
	 * options.templateCompiler { function(templateFullPath)=>htmlString }
	 *      use to compile org template file after read to new template
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
		this.options = options;

		// prepare requires
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

		this.buildHtmlDocument();
	}

	// 编译 HTML 模版文件
	buildHtmlDocument() {
		const { options } = this;
		if (typeof options.template === 'string') {
			// user may pass relate path, trans it to abs path
			// 在这里计算绝对路径是因为 用于监听模版变化的watching.compiler.watchFileSystem.watcher.mtimes 里存的是 绝对路径
			options.template = path.resolve('.', options.template);
			// use templateCompiler first
			if (typeof options.templateCompiler === 'function') {
				options.templateContent = options.templateCompiler(options.pageName, options.template);
			} else {
				options.templateContent = fs.readFileSync(options.template, {
					encoding: 'utf8'
				});
			}
		}
		this.htmlDocument = new HTMLDocument(options);
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

		// user may use Default template
		if (typeof options.template === 'string') {
			// watch for file changed event
			compiler.plugin('watch-run', (watching, done) => {
				// 发生变化的文件列表
				const changedTimes = watching.compiler.watchFileSystem.watcher.mtimes;
				// 如果 HTML 模版文件发生了变化就重新编译模版文件
				if (changedTimes[options.template] !== undefined) {
					// html template file has changed, re build this.htmlDocument
					this.buildHtmlDocument();
				}
				done();
			});

			// add html template file to file dependencies after compile, to let webpack watch html template file change and emit watch-run event
			// 把 HTML 模版文件添加到文件依赖列表，好让 Webpack 去监听 HTML 模块文件，在 HTML 模版文件发生变化时重新启动一次编译
			compiler.plugin('after-compile', (compilation, done) => {
				if (typeof options.template === 'string') {
					const notHas = compilation.fileDependencies.findIndex(filePath => filePath === options.template) === -1;
					if (notHas) {
						compilation.fileDependencies.push(options.template);
					}
				}
				done();
			});
		}

		// 在有新的输出被输出时，重新生成 HTML
		compiler.plugin('emit', (compilation, done) => {

			// HotUpdateCompilation should be ignore for html will not change
			// 如果是 HotUpdateCompilation 导致的输出，可以不要重新生成 HTML
			if (util.isHotUpdateCompilation(compilation)) {
				done();
				return;
			}

			// 确保所有依赖的资源都被考虑到
			this.htmlDocument.ensureRequires(options.requires);
			// out scripts to html document
			this.htmlDocument.scriptResources.forEach(scriptResource => {
				scriptResource.out(compilation);
			});
			// out styles to html document
			this.htmlDocument.stylesResources.forEach(styleResource => {
				styleResource.out(compilation);
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