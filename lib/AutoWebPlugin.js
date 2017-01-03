const fs = require('fs');
const path = require('path');
const CommonsChunkPlugin = require('webpack/lib/optimize/CommonsChunkPlugin');
const WebPlugin = require('./WebPlugin');
const util = require('./util');

/**
 * list only dir in dir
 * @param dir dir hold dir list
 * @returns {Array}
 */
function getDirsInDir(dir) {
    let files = fs.readdirSync(dir);
    let ret = [];
    files.forEach(fileName => {
        if (fs.lstatSync(path.resolve(dir, fileName)).isDirectory()) {
            ret.push(fileName);
        }
    });
    return ret;
}

class AutoWebPlugin {

    constructor(pageDir, options) {
        options = Object.assign({}, options);
        let { template, entity, commonsChunk } = options;
        this.commonsChunk = commonsChunk;
        let pageNames = getDirsInDir(pageDir);
        let entityMap = {};
        // find out all page entry in pageDir,and get every page's html template path and js entityPath
        pageNames.forEach(pageName => {
            entityMap[pageName] = {}
            if (typeof template === 'string') {
                // template config is html template file full path
                entityMap[pageName].template = template;
            } else if (typeof template === 'function') {
                // template config is function,ask user for detail
                entityMap[pageName].template = template(pageName)
            }
            if (typeof entity === 'string' && entity.length > 0) {
                // entity config is entity file full path
                entityMap[pageName].entityPath = entity
            } else if (typeof entity === 'function') {
                // entity config is function,ask user for detail
                entityMap[pageName].entityPath = entity(pageName)
            } else {
                // use page dir's index.js or index.jsx as page entry
                entityMap[pageName].entityPath = path.resolve(pageDir, pageName, '')
            }
        });
        this.entityMap = entityMap;
    }

    apply(compiler) {
        global._isProduction = util.isProduction(compiler);
        global._isExtractStyle = util.isExtractStyle(compiler);
        let { options } = compiler;
        let { entityMap, commonsChunk } = this;
        let useCommonsChunk = typeof commonsChunk === 'string';
        Object.keys(entityMap).forEach(entityName => {
            let { template, entityPath } = entityMap[entityName];
            if (!options.entry.hasOwnProperty(entityName)) {
                options.entry[entityName] = [entityPath];
            }
            new WebPlugin({
                template: template,
                filename: `${entityName}.html`,
                requires: useCommonsChunk ? [commonsChunk, entityName] : [entityName]
            }).apply(compiler);
        });
        if (useCommonsChunk) {
            // get all pages's commons chunk
            new CommonsChunkPlugin({
                name: commonsChunk,
                chunks: Object.keys(entityMap)
            }).apply(compiler);
        }
    }

}

module.exports = AutoWebPlugin;