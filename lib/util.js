const path = require('path');
const DefinePlugin = require('webpack/lib/DefinePlugin');

/**
 * whether is webpack compiler is in Production env
 *
 * if process.env.NODE_ENV from node.js env is production
 * or webpack use DefinePlugin to define process.env.NODE_ENV==="production"
 * will return true else return false
 * @param compiler
 * @returns {boolean}
 */
function isProduction(compiler) {
	if (process.env.NODE_ENV === 'production') {
		// define in nodejs
		return true;
	}
	const plugins = compiler.options.plugins;
	for (let i = 0; i < plugins.length; i++) {
		const plugin = plugins[i];
		try {
			if (plugin.__proto__.constructor === DefinePlugin) {
				if (plugin.definitions['process.env.NODE_ENV'] === '"production"') {
					// define by DefinePlugin
					return true;
				}
			}
		} catch (_) {
			//
		}
	}
	return false;
}

/**
 * add a file to webpack compilation output files
 * @param compilation webpack compilation
 * @param filename output file name
 * @param fileContent output file string content
 */
function addFileToWebpackOutput(compilation, filename, fileContent) {
	compilation.assets[filename] = {
		source: () => {
			return fileContent;
		},
		size: () => {
			return Buffer.byteLength(fileContent, 'utf8');
		}
	};
}

/**
 * is use use extract-text-webpack-plugin ?
 * @param compiler
 * @returns {boolean}
 */
function isExtractStyle(compiler) {
	const plugins = compiler.options.plugins;
	try {
		const ExtractTextPlugin = require('extract-text-webpack-plugin');
		for (let i = 0; i < plugins.length; i++) {
			const plugin = plugins[i];
			if (plugin.__proto__.constructor === ExtractTextPlugin) {
				if (plugin.filename.endsWith('.css')) {
					return true;
				}
			}
		}
	} catch (_) {
		//
	}
	return false;
}

/**
 * this compilation is a Hot Update ?
 * use for webpack hot module replace
 * @param compilation
 * @returns {boolean}
 */
function isHotUpdateCompilation(compilation) {
	const files = Object.keys(compilation.assets);
	for (let i = 0; i < files.length; i++) {
		const name = files[i];
		if (/.+\.hot-update\.js$/.test(name)) {
			return true;
		}
	}
	return false;
}

/**
 * replace a parse5 node will new nodes
 * this will change node.parentNode
 * if you want remove node from parentNode call replaceNodeWithNew(node)
 * @param oldNodes this nodes will been remove
 * @param newNodes new nodes will insert into oldNodes's position
 */
function replaceNodesWithNodes(oldNodes, newNodes = []) {
	const childNodes = oldNodes[0].parentNode.childNodes;
	let index = 0;
	oldNodes.forEach(oldNode => {
		index = childNodes.findIndex(childNode => childNode === oldNode);
		childNodes.splice(index, 1);
	});
	childNodes.splice(index, 0, ...newNodes);
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
 * @returns {*}
 */
function mockScriptNode(options) {
	const { src, content, parentNode } = options;
	if (typeof src === 'string') {
		return {
			nodeName: 'script',
			tagName: 'script',
			parentNode,
			attrs: [{ name: 'src', value: src }]
		};
	} else if (typeof content === 'string') {
		const scriptNode = {
			nodeName: 'script',
			tagName: 'script',
			parentNode,
			attrs: []
		};
		const textNode = {
			nodeName: '#text',
			value: content,
			parentNode: scriptNode
		};
		scriptNode.childNodes = [textNode];
		return scriptNode;
	}
}

/**
 * mock a script node for parse5
 * @param options
 * options.href {string}
 *      style link tag's href attr
 * options.content {string}
 *      style tag's javascript content
 * options.parentNode {parse5.Node}
 *      style node's parentNode
 * @returns {*}
 */
function mockStyleNode(options) {
	const { href, content, parentNode } = options;
	if (typeof href === 'string') {
		return {
			nodeName: 'link',
			tagName: 'link',
			parentNode,
			attrs: [
				{ name: 'rel', value: 'stylesheet' },
				{ name: 'href', value: href },
			]
		};
	} else if (typeof content === 'string') {
		const styleNode = {
			nodeName: 'style',
			tagName: 'style',
			parentNode,
			attrs: []
		};
		const textNode = {
			nodeName: '#text',
			value: content,
			parentNode: styleNode
		};
		styleNode.childNodes = [textNode];
		return styleNode;
	}
}

/**
 * get file's name for a file
 * /data/www/index.html => index.html
 * @param filePath
 * @returns {string}
 */
function getFilenameByFilePath(filePath) {
	const parse = path.parse(filePath);
	return parse.name + parse.ext;
}

/**
 * get publicPath config in webpack
 * @param compilation
 * @returns {*|string}
 */
function getPublicPath(compilation) {
	return compilation.compiler.options.output.publicPath || '';
}

/**
 * serialize parse5 node to html string
 * @param node{Node} parse5 node
 */
function minifyParse5Node(node) {
	const { childNodes = [] } = node;
	for (let i = childNodes.length - 1; i >= 0; i--) {
		const childNode = childNodes[i];
		const nodeName = childNode.nodeName;
		if (nodeName === '#comment' && !childNode.data.startsWith('[if ')) {// remove comments
			childNodes.splice(i, 1);
		} else if (nodeName === '#text') {// remove empty text
			childNode.value = childNode.value.trim();
			if (childNode.value.length === 0) {
				childNodes.splice(i, 1);
			}
		} else {
			minifyParse5Node(childNode);
		}
	}
}

function prettyParse5Node(node) {
	const { childNodes = [] } = node;
	for (let i = childNodes.length - 1; i >= 0; i--) {
		const childNode = childNodes[i];
		// ensure every tag per line
		if (childNode.nodeName !== '#text') {
			const preNode = childNodes[i - 1];
			const nextNode = childNodes[i + 1];
			const newNodes = [childNode];
			if (!(preNode && preNode.nodeName === '#text' && preNode.value.indexOf('\n') >= 0)) {
				newNodes.unshift({
					nodeName: '#text',
					value: '\n',
					parentNode: childNode.parentNode
				})
			}
			if (!(nextNode && nextNode.nodeName === '#text' && nextNode.value.indexOf('\n') >= 0)) {
				newNodes.push({
					nodeName: '#text',
					value: '\n',
					parentNode: childNode.parentNode
				})
			}
			// inject break line tag after pr before now tag
			if (newNodes.length > 1) {
				replaceNodesWithNodes([childNode], newNodes);
			}
			prettyParse5Node(childNode);
		}
	}
}

module.exports = {
	isProduction,
	addFileToWebpackOutput,
	isExtractStyle,
	isHotUpdateCompilation,
	replaceNodesWithNodes,
	mockScriptNode,
	mockStyleNode,
	getFilenameByFilePath,
	getPublicPath,
	minifyParse5Node,
	prettyParse5Node,
};