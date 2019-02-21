const fs = require('fs');
const path = require('path');
const parse5 = require('parse5');
const querystring = require('querystring');
const url = require('url');
const fileType = require('file-type');
const util = require('./util');

/**
 * get webpack compilation output files chunk by chunkName
 * @param compilation
 * @param chunkName
 * @returns {*} relate files for chunkName
 */
function getChunkFiles(compilation, chunkName) {
	const { chunks } = compilation;
	for (let i = 0; i < chunks.length; i++) {
		let chunk = chunks[i];
		if (chunk.name === chunkName) {
			return chunk.files;
		}
	}
	return [];
}

/**
 * surround parse5 node with [if IE] comment
 * @param nodes
 * @param parentNode
 * @returns {[*]}
 */
function surroundWithIE(nodes = [], parentNode) {
	const eleString = parse5.serialize({
		childNodes: nodes,
	});
	return [
		{
			nodeName: '#comment',
			data: `[if IE]>${eleString}<![endif]`,
			parentNode,
		},
	];
}

/**
 * surround nodes with comment
 * @param nodes
 * @param parentNode
 * @returns {[*]}
 */
function commentNodes(nodes, parentNode) {
	// don't surround comment nodes with comment
	if (nodes[0].nodeName === '#comment') {
		return nodes;
	}
	const eleString = parse5.serialize({
		childNodes: nodes,
	});
	return [
		{
			nodeName: '#comment',
			data: eleString,
			parentNode,
		},
	];
}

/**
 * a script resource or a style resource in HTMLDocument
 */
class Resource {
	/**
	 * make a Resource with parse5 Node in HTMLDocument
	 * @param node a parse5 Node
	 * @param options options from WebPlugin constructor
	 *
	 * type can be:
	 * script
	 * style
	 * other
	 */
	constructor(node, options) {
		// options from WebPlugin constructor
		this.options = options;
		this.node = node;
		const { nodeName, attrs = [] } = node;
		if (nodeName === 'script') {
			// script src tag
			// eg: <script src=""></script>
			for (let i = 0; i < attrs.length; i++) {
				const attr = attrs[i];
				if (attr.name === 'src' && typeof attr.value === 'string') {
					const src = attr.value;
					this.type = 'script';
					this.parseQuery(src);
					break;
				}
			}
			if (options.crossorigin) {
				// 给script标签加入 crossorigin=anonymous 属性，方便跨域错误上报
				util.assignParse5Attrs(this.node.attrs, [
					{
						name: 'crossorigin',
						value: 'anonymous',
					},
				]);
			}
		} else if (nodeName === 'link') {
			// stylesheet tag
			// eg: <link rel="stylesheet" href="">
			let rel, href;
			for (let i = 0; i < attrs.length; i++) {
				const attr = attrs[i];
				if (attr.name === 'rel') {
					rel = attr.value;
				} else if (attr.name === 'href') {
					href = attr.value;
				}
			}
			if (rel === 'stylesheet' && typeof href === 'string') {
				this.type = 'style';
				this.parseQuery(href);
			}
		} else if (nodeName === '#comment') {
			// any comment
			// eg: <!--SCRIPT-->
			this.data = node.data;
			this.type = 'comment';
		} else {
			for (let i = 0; i < attrs.length; i++) {
				const { name, value } = attrs[i];
				if (name === 'href' || name === 'src') {
					this.type = 'other';
					this.otherAttrIndex = i;
					this.parseQuery(value);
					break;
				}
			}
		}
		this.outputNodes = [node];
	}

	parseQuery(queryStr) {
		const arr = queryStr.split('?', 2);
		this.chunkName = arr[0];

		const query = querystring.parse(arr[1]);
		this.resourceAttr = {
			dist: query['_dist'] !== undefined,
			inline: query['_inline'] !== undefined,
			dev: query['_dev'] !== undefined,
			ie: query['_ie'] !== undefined,
		};
		// clean resourceAttr as others will be used as htmlAttr
		delete query['_dist'];
		delete query['_inline'];
		delete query['_dev'];
		delete query['_ie'];

		let htmlAttrs = Object.keys(query).map((attrName) => {
			return {
				name: attrName,
				value: query[attrName],
			};
		});
		util.assignParse5Attrs(this.node.attrs, htmlAttrs);
	}

	out(compilation) {
		let {
			publicPath: webpackOutputPublicPath = '',
		} = compilation.compiler.options.output;
		if (this.type === 'style' && this.options.stylePublicPath) {
			webpackOutputPublicPath = this.options.stylePublicPath;
		}
		const { _isProduction } = global;
		const parentNode = this.node.parentNode;
		const { overwriteResourcePathInHTML } = this.options;
		const { chunkName, outputNodes, resourceAttr, type } = this;
		const { assets } = compilation;
		const htmlOutputURL = url.resolve(
			webpackOutputPublicPath,
			this.options.filename
		);
		let newNodes = [];

		// add a file to newNodes
		const outToNewNodes = (fileName, fileContent) => {
			// 计算资源输出路径
			let resourceRelative2HTMLPath;
			if (overwriteResourcePathInHTML) {
				resourceRelative2HTMLPath = overwriteResourcePathInHTML(
					fileName,
					webpackOutputPublicPath,
					htmlOutputURL
				);
			} else {
				// resource should load in URL relative to html output path
				resourceRelative2HTMLPath = url.resolve(
					webpackOutputPublicPath,
					fileName
				);
				resourceRelative2HTMLPath = util.urlRelative(
					htmlOutputURL,
					resourceRelative2HTMLPath
				);
				resourceRelative2HTMLPath = url.resolve(
					webpackOutputPublicPath,
					resourceRelative2HTMLPath
				);
			}

			if (type === 'script') {
				// output js file only
				if (fileName.endsWith('.js')) {
					if (resourceAttr.inline) {
						// inline javascript content to script
						newNodes.push(
							util.mockScriptNode({
								content: fileContent,
								parentNode,
								attrs: this.node.attrs,
							})
						);
					} else {
						// load this javascript file with src
						newNodes.push(
							util.mockScriptNode({
								src: resourceRelative2HTMLPath,
								parentNode,
								attrs: this.node.attrs,
							})
						);
					}
				}
			} else if (type === 'style') {
				// output css file only
				if (fileName.endsWith('.css')) {
					if (resourceAttr.inline) {
						// inline style content to script
						newNodes.push(
							util.mockStyleNode({
								content: fileContent,
								parentNode,
								attrs: this.node.attrs,
							})
						);
					} else {
						// load this style file with src
						newNodes.push(
							util.mockStyleNode({
								href: resourceRelative2HTMLPath,
								parentNode,
								attrs: this.node.attrs,
							})
						);
					}
				}
			} else if (type === 'other') {
				// load this other file with URL
				let urlContent;
				if (resourceAttr.inline) {
					// 这里 fileContent 是 Buffer 类型
					// 如果是要inline的其它资源，直接URL base64编码进去
					urlContent = `data:${
						fileType(fileContent).mime
					};base64,${fileContent.toString('base64')}`;
				} else {
					urlContent = resourceRelative2HTMLPath;
				}
				this.node.attrs[this.otherAttrIndex].value = urlContent;
				newNodes.push(this.node);
			}
		};

		// use newNodes to replace this.outputNodes
		const outToOutputNodes = () => {
			if (newNodes.length > 0) {
				// 只要找到了对应的文件就输出
				// only if has find chunk file for this entry should out put it,else ignore it

				// 因为 surroundWithIE 必定会 生成一个 node，这会影响 outToOutputNodes 里 对 newNodes.length 的判断，需把这段判断逻辑放到 outToOutputNodes里的 输出之前
				if (resourceAttr.ie) {
					newNodes = surroundWithIE(newNodes, parentNode);
				}

				util.replaceNodesWithNodes(outputNodes, newNodes);
				this.outputNodes = newNodes;
			} else {
				// 找不到对应的输出文件
				if (
					compilation.chunks.findIndex(
						(chunk) => chunk.name === this.chunkName
					) > -1
				) {
					// 如果在 compilation.chunks 里找到了 this.chunkName 对应的入口，但是找不到对应的输出文件，就把 outputNodes 从文档流去除
					// 比如 this.chunkName 是 之后动态生成的 common 入口
					// newNodes为空，调用把 outputNodes 从文档流去除
					util.replaceNodesWithNodes(outputNodes, newNodes);
					this.outputNodes = newNodes;
				} else {
					// 如果在 compilation.entrypoints 里找不到 this.chunkName 对应的入口
					// 就认为这是一个直接导入本地文件的资源。
					// 提前过滤调部分 URL 地址，提高性能，例如 http://url.cn/1.js  //url.cn/1.js  data:image/png;base64,iVBORw0K
					if (
						this.chunkName &&
						!/(https?|data|:)?\/\/.+\..+.*/.test(this.chunkName) &&
						!/mailto:.*@.*/.test(this.chunkName)
					) {
						// 相对于模版文件去解析资源文件地址
						const filePath = path.resolve(
							path.dirname(this.options.template || '.'),
							this.chunkName
						);
						try {
							// 去读取对应的文件
							// 如果这个文件存在就认为这是一个直接导入本地文件的资源。
							const fileContent = fs.readFileSync(filePath, {
								// 如果是 文本文件 'script', 'style' 就读出文本，其它的按照二进制格式读取
								encoding:
									['script', 'style'].indexOf(this.type) >= 0
										? 'utf8'
										: undefined,
							});

							// 从文件的路径中解析出文件的名称
							const filename = util.getFilenameByFilePath(filePath);

							// 对于非inline的资源需要输出
							if (!resourceAttr.inline) {
								// 通过webpack把本地文件输出
								util.addFileToWebpackOutput(compilation, filename, fileContent);
							}

							// 添加文件名称和内容到新节点 以供输出到HTML文档
							outToNewNodes(filename, fileContent);

							// 因为 surroundWithIE 必定会 生成一个 node，这会影响 outToOutputNodes 里 对 newNodes.length 的判断，需把这段判断逻辑放到 outToOutputNodes里的 输出之前
							if (resourceAttr.ie) {
								newNodes = surroundWithIE(newNodes, parentNode);
							}

							util.replaceNodesWithNodes(outputNodes, newNodes);
							this.outputNodes = newNodes;
						} catch (err) {
							//读取文件失败,本地文件不存在，删除这个节点
							util.replaceNodesWithNodes(outputNodes, newNodes);
							this.outputNodes = newNodes;
						}
					}
					// 剩下的情况就把outputNodes 保留在文档流里不动outputNodes。
					// 比如引入自定义url http://qq.com/hi.js
				}
			}
		};

		if (resourceAttr.dev && _isProduction === true) {
			// remove dev only resource
			newNodes = commentNodes(outputNodes, parentNode);
			outToOutputNodes();
		} else if (resourceAttr.dist && _isProduction === false) {
			// remove dist only resource
			newNodes = commentNodes(outputNodes, parentNode);
			outToOutputNodes();
		} else {
			const fileNames = getChunkFiles(compilation, chunkName);
			fileNames.forEach((fileName) => {
				const source = assets[fileName];
				outToNewNodes(fileName, source.source());
			});
			outToOutputNodes();
		}
	}
}

module.exports = Resource;
