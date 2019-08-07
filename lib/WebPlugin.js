const path = require('path');
const fs = require('fs');
const querystring = require('querystring');
const { SyncHook } = require('tapable');

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
	 * options.templateCompiler { function(pageName,templateFullPath)=>htmlString }
	 *      use to compile org template file after read to new template
	 *
	 * options.filename {string} require
	 *      output html filename
	 *
	 * options.requires {Array}
	 *      this html's require entry list, will use list's order to place require entry
	 *
	 * options.stylePublicPath {string}
	 *      publicPath for css file,for js file will use webpack.publicPath
	 *
	 * options.crossorigin {boolean}
	 *      add crossorigin attr in page script tag
	 *
	 * options.overwriteResourcePathInHTML {function} (fileName,webpackOutputPublicPath,htmlOutputURL)=> realOutputPath
	 *      overwrite resource path calc logic
	 *
	 * options.outputPagemap {boolean}
	 *      whether output a pagemap.json file which contain all pages has been resolved with AutoWebPlugin in this way:
	 *      {
	 *          "page name": "page url",
	 *          ...
	 *      }
	 *
	 * options.outputPagemapFilename {string}
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
			Object.keys(requires).forEach((chunkName) => {
				newRequires.push(
					`${chunkName}?${querystring.stringify(requires[chunkName])}`,
				);
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
				options.templateContent = options.templateCompiler(
					options.pageName,
					options.template,
					options.entryPath,
				);
			} else {
				options.templateContent = fs.readFileSync(options.template, {
					encoding: 'utf8',
				});
			}
		}
		this.htmlDocument = new HTMLDocument(options);
	}

	// call by webpack
	apply(compiler) {
		const { options } = this;
		const { template, requires, filename, outputPagemap, outputPagemapFilename } = options;

		// inject hooks
		compiler.hooks.webPluginBeforeEmitHTML = new SyncHook(['htmlDocument']);

		// get webpack compiler's env
		if (global._isProduction === undefined) {
			global._isProduction = util.isProduction(compiler);
		}
		if (global._isExtractStyle === undefined) {
			global._isExtractStyle = util.isExtractStyle(compiler);
		}

		// user may use Default template
		if (typeof template === 'string') {
			// watch for file changed event
			compiler.hooks.watchRun.tap('WebPlugin', (watching) => {
				// 发生变化的文件列表
				const changedTimes = watching.watchFileSystem.watcher.mtimes;
				// 如果 HTML 模版文件发生了变化就重新编译模版文件
				if (changedTimes[template] !== undefined) {
					// html template file has changed, re build this.htmlDocument
					this.buildHtmlDocument();
				}
			});

			// add html template file to file dependencies after compile, to let webpack watch html template file change and emit watch-run event
			// 把 HTML 模版文件添加到文件依赖列表，好让 Webpack 去监听 HTML 模块文件，在 HTML 模版文件发生变化时重新启动一次编译
			compiler.hooks.afterCompile.tap('WebPlugin', (compilation) => {
				if (typeof template === 'string') {
					const notHas =
						Array.from(compilation.fileDependencies).findIndex(
							(filePath) => filePath === template,
						) === -1;
					if (notHas) {
						compilation.fileDependencies.add(template);
					}
				}
			});
		}

		// 在有新的输出被输出时，重新生成 HTML
		compiler.hooks.emit.tap('WebPlugin', (compilation) => {
			// HotUpdateCompilation should be ignore for html will not change
			// 如果是 HotUpdateCompilation 导致的输出，可以不要重新生成 HTML
			if (util.isHotUpdateCompilation(compilation)) {
				return;
			}

			// 确保所有依赖的资源都被考虑到
			this.htmlDocument.ensureRequires(requires);
			// out scripts to html document
			this.htmlDocument.scriptResources.forEach((scriptResource) => {
				scriptResource.out(compilation);
			});
			// out styles to html document
			this.htmlDocument.stylesResources.forEach((styleResource) => {
				styleResource.out(compilation);
			});
			// out others to html document
			this.htmlDocument.otherResources.forEach((otherResource) => {
				otherResource.out(compilation);
			});

			// get html document string
			compiler.hooks.webPluginBeforeEmitHTML.call(this.htmlDocument);
			const htmlOut = this.htmlDocument.serialize();
			// add it to webpack output files
			util.addFileToWebpackOutput(compilation, filename, htmlOut);

			// logic for outputPagemap
			if (outputPagemap) {
				const outJson = util.getDependenciesFilesForChunks(requires, compilation);
				outJson.html = filename;
				util.outPagemap(outJson, outputPagemap, compilation, outputPagemapFilename);
			}
		});
	}
}

module.exports = WebPlugin;
