const parse5 = require('parse5');
const Resource = require('./Resource');
const util = require('./util');

/**
 * default html template when no template is config
 * @type {string}
 */
const DefaultHtmlTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body>
<!--SCRIPT-->
</body>
</html>
`;

/**
 * HTML Document Model
 */
class HTMLDocument {
	/**
	 * get parser5 document by html file path
	 * if htmlTemplateFilePath is null,will use DefaultHtmlTemplate as template
	 * @param options options from WebPlugin constructor
	 */
	constructor(options) {
		/**
		 * options from WebPlugin constructor
		 */
		this.options = options;
		/**
		 * parse5 document
		 */
		this.document = null;
		/**
		 * parse5 head Node
		 */
		this.headNode = null;
		/**
		 * parse5 body Node
		 */
		this.bodyNode = null;
		/**
		 * all script Resource this page required
		 * @type {Array}
		 */
		this.scriptResources = [];
		/**
		 * all style Resource this page required
		 * @type {Array}
		 */
		this.stylesResources = [];
		/**
		 * all style Resource this page required
		 * @type {Array}
		 */
		this.otherResources = [];
		/**
		 * inject position for required left scripts
		 */
		this.scriptInjectCommentNode = null;
		/**
		 * inject position for required left styles
		 */
		this.styleInjectCommentNode = null;

		const { templateContent = DefaultHtmlTemplate } = options;
		this.document = parse5.parse(templateContent);
		this._findOutAll();
	}

	/**
	 * find out all html tag may inject resource and head & body tag
	 *
	 * e.g:
	 * <script src="dev?_dev"></script>
	 * <script async src="./google-analytics.js?_dist"></script>
	 * <link rel="stylesheet" href="3?_ie">
	 * <link rel="shortcut icon" href="//9.url.cn/edu/lego_modules/edu-ui/0.0.1/img/nohash/favicon.ico">
	 * <img src="./logo.png?_dev">
	 *
	 * @private
	 */
	_findOutAll() {
		this.document.childNodes.forEach((node) => {
			if (node.nodeName === 'html') {
				node.childNodes.forEach((node) => {
					if (node.nodeName === 'head') {
						this.headNode = node;
						this._findScriptStyleCommentResourceTag(node);
					} else if (node.nodeName === 'body') {
						this.bodyNode = node;
						this._findScriptStyleCommentResourceTag(node);
					}
				});
			}
		});
	}

	/**
	 * find out all script|style|comment tag in html head or body
	 * @param node
	 * @private
	 */
	_findScriptStyleCommentResourceTag(node) {
		const { childNodes = [] } = node;
		childNodes.forEach((childNode) => {
			const resource = new Resource(childNode, this.options);
			const { type } = resource;
			if (type === 'script') {
				this.scriptResources.push(resource);
			} else if (type === 'style') {
				this.stylesResources.push(resource);
			} else if (type === 'comment') {
				if (resource.data.indexOf('SCRIPT') >= 0) {
					this.scriptInjectCommentNode = resource.node;
				} else if (resource.data.indexOf('STYLE') >= 0) {
					this.styleInjectCommentNode = resource.node;
				}
			} else if (type === 'other') {
				this.otherResources.push(resource);
				// this kind of tag may wrap other link tag, e.g
				// <a href="./logo"><img src="./math.png"></a>
				this._findScriptStyleCommentResourceTag(childNode);
			} else if (type === undefined) {
				this._findScriptStyleCommentResourceTag(childNode);
			}
		});
	}

	/**
	 * ensure all required script resource has been inject to html doc
	 * @param requiresScripts
	 * @returns {Array}
	 * @private
	 */
	_ensureRequireScripts(requiresScripts) {
		this.scriptResources.forEach((scriptResource) => {
			const { chunkName } = scriptResource;
			// remove has inject chunk from require chunks
			const index = requiresScripts.findIndex((one) => one === chunkName);
			if (index >= 0) {
				requiresScripts.splice(index, 1);
			}
		});
		let leftScriptNodes = [];
		// this html require chunks is left after load chunks by html tag in html template
		if (requiresScripts.length > 0) {
			if (this.scriptInjectCommentNode !== null) {
				// find out <!--SCRIPT--> comment in html template
				// <!--SCRIPT--> is the position inject left require script
				leftScriptNodes = requiresScripts.map((chunkName) =>
					util.mockScriptNode({
						src: chunkName,
						parentNode: this.scriptInjectCommentNode.parentNode,
						attrs: util.parseAttrFormHTMLComment(this.scriptInjectCommentNode.data)
					})
				);
				util.replaceNodesWithNodes(
					[this.scriptInjectCommentNode],
					leftScriptNodes
				);
			} else {
				// if can't find <!--SCRIPT--> in html template,
				// inject left require script in body tag's end
				leftScriptNodes = requiresScripts.map((chunkName) =>
					util.mockScriptNode({
						src: chunkName,
						parentNode: this.bodyNode,
						attrs: this.scriptInjectCommentNode ? util.parseAttrFormHTMLComment(this.scriptInjectCommentNode.data) : [],
					})
				);
				this.bodyNode.childNodes.push(...leftScriptNodes);
			}
		}
		return leftScriptNodes;
	}

	/**
	 * ensure all required style resource has been inject to html doc
	 * @param requiresStyles
	 * @returns {Array}
	 * @private
	 */
	_ensureRequireStyles(requiresStyles) {
		this.stylesResources.forEach((styleResource) => {
			const { chunkName } = styleResource;
			// remove has inject chunk from require chunks
			const index = requiresStyles.findIndex((one) => one === chunkName);
			if (index >= 0) {
				requiresStyles.splice(index, 1);
			}
		});
		let leftStyleNodes = [];
		// this html require chunks is left after load chunks by html tag in html template
		if (requiresStyles.length > 0) {
			if (this.styleInjectCommentNode !== null) {
				// find out <!--STYLE--> comment in html template
				// <!--STYLE--> is the position inject left require style
				leftStyleNodes = requiresStyles.map((chunkName) =>
					util.mockStyleNode({
						href: chunkName,
						parentNode: this.styleInjectCommentNode.parentNode,
					})
				);
				util.replaceNodesWithNodes(
					[this.styleInjectCommentNode],
					leftStyleNodes
				);
			} else {
				// if can't find <!--STYLE--> in html template,
				// inject left require script in head tag's end
				leftStyleNodes = requiresStyles.map((chunkName) =>
					util.mockStyleNode({
						href: chunkName,
						parentNode: this.headNode,
					})
				);
				this.headNode.childNodes.push(...leftStyleNodes);
			}
		}
		return leftStyleNodes;
	}

	/**
	 * make sure all required resource this html be inject in this.scriptResources and this.stylesResources
	 * @param requires {Array}
	 */
	ensureRequires(requires) {
		const lefts = [];
		lefts.push(...this._ensureRequireScripts([...requires]));
		if (global._isExtractStyle) {
			lefts.push(...this._ensureRequireStyles([...requires]));
		}
		this._findScriptStyleCommentResourceTag({
			childNodes: lefts,
		});
	}

	/**
	 * get html string
	 * @returns {string}
	 */
	serialize() {
		const { htmlMinify } = this.options;
		if (htmlMinify === undefined) {
			if (global._isProduction) {
				util.minifyParse5Node(this.document);
			} else {
				util.prettyParse5Node(this.document);
			}
		} else if (htmlMinify === true) {
			util.minifyParse5Node(this.document);
		} else if (htmlMinify === false) {
			util.prettyParse5Node(this.document);
		} else if (typeof htmlMinify === 'function') {
			return htmlMinify(parse5.serialize(this.document));
		}

		return parse5.serialize(this.document);
	}
}

module.exports = HTMLDocument;
