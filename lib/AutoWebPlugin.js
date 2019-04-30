const fs = require('fs');
const path = require('path');
const WebPlugin = require('./WebPlugin');
const util = require('./util');

/**
 * list only dir in dir
 * @param dir dir hold dir list
 * @param ignorePages page name list will not ignore by AutoWebPlugin(Not output html file for this page name)
 * @returns {Array}
 */
function getDirsInDir(dir, ignorePages = []) {
	const files = fs.readdirSync(dir);
	const ret = [];
	files.forEach((fileName) => {
		if (
			ignorePages.findIndex((em) => em === fileName) < 0 && // not in ignorePages
			fs.lstatSync(path.resolve(dir, fileName)).isDirectory() // is Directory
		) {
			ret.push(fileName);
		}
	});
	return ret;
}

class AutoWebPlugin {
	/**
	 *
	 * @param pageDir the dir hold all pages
	 * @param options
	 *
	 * options.template {string,function}
	 *      get WebPlugin template
	 *      typeof===string: template config is html template file full path
	 *      typeof===function: template config is function,ask user for detail
	 *
	 * options.templateCompiler { function(pageName,templateFullPath)=>htmlString }
	 *      use to compile org template file to new template
	 *
	 * options.entry {string,function,*}
	 *      get page entryPath
	 *      typeof===string: entry config is entry file full path
	 *      typeof===function: entry config is function,ask user for detail
	 *
	 * options.filename {function,*}
	 *      get WebPlugin output filename,default filename is pageName
	 *      set options.filename as function(pageName)=>filename to add custom logic
	 *
	 * options.preEntrys {Array}
	 *      entry files pre append to page entry for every page
	 *
	 * options.postEntrys {Array}
	 *      entry files post append to page entry for every page
	 *
	 * options.stylePublicPath {string}
	 *      publicPath for css file,for js file will use webpack.publicPath
	 *
	 * options.ignorePages {Array<string>}
	 *      page name list will not ignore by AutoWebPlugin(Not output html file for this page name)
	 *
	 * options.crossorigin {boolean}
	 *      add crossorigin attr in page script tag
	 *
	 * options.requires {string[]}
	 *      pass to WebPlugin for every page
	 *
	 * options.outputPagemap {boolean}
	 *      whether output a pagemap.json file which contain all pages has been resolved with AutoWebPlugin in this way:
	 *      {
	 *          "page name": "page url",
	 *          ...
	 *      }
	 *
	 * options.outputPagemapFilename {string}
	 */
	constructor(pageDir, options) {
		options = Object.assign({}, options);
		this.options = options;
		this.entryMap = {};
		this.webpackEntry = {};
		const {
			template,
			templateCompiler,
			entry,
			filename,
			ignorePages,
			preEntrys,
			postEntrys,
		} = options;
		const pageNames = typeof pageDir === 'string' ? getDirsInDir(pageDir, ignorePages) : Object.keys(pageDir);
		// find out all page entry in pageDir,and get every page's html template path and js entryPath
		pageNames.forEach((pageName) => {
			let templatePath;
			let entryPath;
			let htmlOutputFilename;

			// get WebPlugin template
			if (typeof template === 'string') {
				// template config is html template file full path
				templatePath = template;
			} else if (typeof template === 'function') {
				// template config is function,ask user for detail
				templatePath = template(pageName);
			}

			// get page entryPath
			if (typeof entry === 'string' && entry.length > 0) {
				// entry config is entry file full path
				entryPath = entry;
			} else if (typeof entry === 'function') {
				// entry config is function,ask user for detail
				entryPath = entry(pageName);
			} else {
				// use page dir's index.js or index.jsx as page entry
				if(typeof pageDir === 'string'){
					entryPath = path.resolve(pageDir, pageName, '');
				}else {
					entryPath = path.resolve(pageDir[pageName], '');
				}
			}

			// get WebPlugin output filename,default filename is pageName
			// set options.filename as function(pageName)=>filename to add custom logic
			if (typeof filename === 'function') {
				htmlOutputFilename = filename(pageName);
			} else {
				htmlOutputFilename = pageName;
			}

			this.entryMap[pageName] = {
				templatePath,
				templateCompiler,
				entryPath,
				htmlOutputFilename,
			};

			let pageEntryArray = [entryPath];
			if (Array.isArray(preEntrys)) {
				pageEntryArray = preEntrys.concat(pageEntryArray);
			}
			if (Array.isArray(postEntrys)) {
				pageEntryArray = pageEntryArray.concat(postEntrys);
			}
			this.webpackEntry[pageName] = pageEntryArray;
		});
	}

	// call by webpack
	apply(compiler) {
		global._isProduction = util.isProduction(compiler);
		global._isExtractStyle = util.isExtractStyle(compiler);
		const { options: compilerOptions } = compiler;
		const { entryMap } = this;
		const { outputPagemap, outputPagemapFilename, requires = [], ...otherOptions } = this.options;

		Object.keys(entryMap).forEach((pageName) => {
			// ensure entryMap from pages has been add to webpack entry
			// webpack-dev-server may modify compilerOptions.entry, e.g add webpack-dev-server/client to every entry
			compilerOptions.entry = Object.assign(
				this.webpackEntry,
				compilerOptions.entry,
			);

			// add an WebPlugin for every page to output an html
			const {
				templatePath,
				templateCompiler,
				htmlOutputFilename,
				entryPath,
			} = entryMap[pageName];
			new WebPlugin({
				...otherOptions,
				template: templatePath,
				templateCompiler,
				pageName,
				entryPath,
				filename: `${htmlOutputFilename}.html`,
				requires: requires.concat(pageName),
			}).apply(compiler);
		});

		// logic for pagemap.json
		compiler.hooks.emit.tap('AutoWebPlugin', (compilation) => {
			if (outputPagemap) {
				const outJson = {};
				Object.keys(this.entryMap).forEach((name) => {
					outJson[name] = util.getDependenciesFilesForChunks(requires.concat(name), compilation);
					outJson[name].html = `${this.entryMap[name].htmlOutputFilename}.html`;
				});
				util.outPagemap(outJson, outputPagemap, compilation, outputPagemapFilename);
			}
		});
	}

	/**
	 * this used to overwrite entry option
	 * @param orgEntry
	 * @returns {*}
	 */
	entry(orgEntry) {
		return Object.assign({}, orgEntry, this.webpackEntry);
	}
}

module.exports = AutoWebPlugin;
