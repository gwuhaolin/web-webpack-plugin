const fs = require('fs');
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
`

/**
 * HTML Document Model
 */
class HTMLDocument {

  /**
   * get parser5 document by html file path
   * if htmlTemplateFilePath is null,will use DefaultHtmlTemplate as template
   * @param htmlTemplateFilePath
   */
  constructor(htmlTemplateFilePath) {
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
     * inject position for required left scripts
     */
    this.scriptInjectCommentNode = null;
    /**
     * inject position for required left styles
     */
    this.styleInjectCommentNode = null;
    /**
     * html template file path for this HTMLDocument
     */
    this.htmlTemplateFilePath = htmlTemplateFilePath;

    let htmlString = DefaultHtmlTemplate;
    if (typeof htmlTemplateFilePath === 'string') {
      htmlString = fs.readFileSync(htmlTemplateFilePath, {
        encoding: 'utf8'
      });
    }
    this.document = parse5.parse(htmlString);
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
    //noinspection JSUnresolvedVariable
    this.document.childNodes.forEach(node => {
      if (node.nodeName === 'html') {
        node.childNodes.forEach(node => {
          if (node.nodeName === 'head') {
            this.headNode = node;
            this._findScriptStyleCommentTag(node);
          } else if (node.nodeName === 'body') {
            this.bodyNode = node;
            this._findScriptStyleCommentTag(node);
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
  _findScriptStyleCommentTag(node) {
    node.childNodes.forEach(childNode => {
      const resource = new Resource(childNode, this.htmlTemplateFilePath);
      const { type } = resource;
      if (type === 'script') {
        this.scriptResources.push(resource);
      } else if (type === 'style') {
        this.stylesResources.push(resource);
      } else if (type === 'comment') {
        if (resource.data === 'SCRIPT') {
          this.scriptInjectCommentNode = resource.node;
        } else if (resource.data === 'STYLE') {
          this.styleInjectCommentNode = resource.node;
        }
      }
    })
  }

  /**
   * ensure all required script resource has been inject to html doc
   * @param requiresScripts
   * @returns {Array}
   * @private
   */
  _ensureRequireScripts(requiresScripts) {
    this.scriptResources.forEach(scriptResource => {
      const { chunkName } = scriptResource;
      // remove has inject chunk from require chunks
      const index = requiresScripts.findIndex(one => one === chunkName);
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
        leftScriptNodes = requiresScripts.map(chunkName => util.mockScriptNode({
          src: chunkName,
          parentNode: this.scriptInjectCommentNode.parentNode
        }));
        util.replaceNodesWithNodes([this.scriptInjectCommentNode], leftScriptNodes);
      } else {
        // if can't find <!--SCRIPT--> in html template,
        // inject left require script in body tag's end
        leftScriptNodes = requiresScripts.map(chunkName => util.mockScriptNode({
          src: chunkName,
          parentNode: this.bodyNode
        }));
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
    this.stylesResources.forEach(styleResource => {
      const { chunkName } = styleResource;
      // remove has inject chunk from require chunks
      const index = requiresStyles.findIndex(one => one === chunkName);
      if (index >= 0) {
        requiresStyles.splice(index, 1);
      }
    })
    let leftStyleNodes = [];
    // this html require chunks is left after load chunks by html tag in html template
    if (requiresStyles.length > 0) {
      if (this.styleInjectCommentNode !== null) {
        // find out <!--STYLE--> comment in html template
        // <!--STYLE--> is the position inject left require style
        leftStyleNodes = requiresStyles.map(chunkName => util.mockStyleNode({
          href: chunkName,
          parentNode: this.styleInjectCommentNode.parentNode
        }));
        util.replaceNodesWithNodes([this.styleInjectCommentNode], leftStyleNodes);
      } else {
        // if can't find <!--STYLE--> in html template,
        // inject left require script in head tag's end
        leftStyleNodes = requiresStyles.map(chunkName => util.mockStyleNode({
          href: chunkName,
          parentNode: this.headNode
        }));
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
    this._findScriptStyleCommentTag({
      childNodes: lefts
    });
  }

  /**
   * get html string
   * @returns {string}
   */
  serialize() {
    // in Production mode drop all comment and blank text
    const mini = (childNodes) => {
      for (let i = childNodes.length - 1; i >= 0; i--) {
        const node = childNodes[i];
        const nodeName = node.nodeName;
        if (nodeName === '#comment' && !node.data.startsWith('[if ')) {
          childNodes.splice(i, 1);
        } else if (nodeName === '#text') {
          node.value = node.value.trim();
          if (node.value.length === 0) {
            childNodes.splice(i, 1);
          }
        }
      }
    }
    // pretty html output
    const pretty = (childNodes) => {
      for (let i = childNodes.length - 1; i >= 0; i--) {
        const node = childNodes[i];
        const preNode = childNodes[i - 1];
        if (node.nodeName !== '#text') {
          if (preNode) {
            if (preNode.nodeName === '#text' && preNode.value.indexOf('\n') >= 0) {
              return;
            }
          }
          util.replaceNodesWithNodes([node], [{
            nodeName: '#text',
            value: '\n',
            parentNode: node.parentNode
          }, node])
        }
      }
    }
    const f = global._isProduction ? mini : pretty;
    f(this.headNode.childNodes);
    f(this.bodyNode.childNodes);
    return parse5.serialize(this.document);
  }

}

module.exports = HTMLDocument;