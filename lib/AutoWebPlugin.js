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

/**
 * is module in node_modules
 * @param compiler webpack compiler
 * @param moduleName
 * @returns {boolean}
 */
function hasModule(compiler, moduleName) {
    const resolveModules = compiler.options.resolve.modules;
    if (Array.isArray(resolveModules)) {
        for (let i = 0; i < resolveModules.length; i++) {
            const modulePath = resolveModules[i];
            try {
                const has = fs.lstatSync(path.resolve(modulePath, moduleName)).isDirectory();
                if (has) {
                    return true;
                }
            } catch (_) {
            }
        }
    }
    return false;
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
        const _isProduction = util.isProduction(compiler);
        global._isProduction = _isProduction;
        global._isExtractStyle = util.isExtractStyle(compiler);
        let { options } = compiler;
        let devServer = options.devServer || {};
        let { entityMap, commonsChunk } = this;
        let useCommonsChunk = typeof commonsChunk === 'string';
        Object.keys(entityMap).forEach(entityName => {
            let { template, entityPath } = entityMap[entityName];
            if (!options.entry.hasOwnProperty(entityName)) {
                // inject webpack-dev-server/client and webpack/hot/dev-server for every entry when env is dev
                const entryList = [];
                if (!_isProduction) {
                    entryList.push('webpack/hot/dev-server');
                    if (hasModule(compiler, 'webpack-dev-server')) {
                        entryList.push(`webpack-dev-server/client?http://localhost:${devServer.port || 8080}/`);
                    }
                }
                entryList.push(entityPath);
                options.entry[entityName] = entryList;
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