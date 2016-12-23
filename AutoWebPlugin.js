const fs = require('fs');
const path = require('path');
const CommonsChunkPlugin = require('webpack/lib/optimize/CommonsChunkPlugin');
const WebPlugin = require('./WebPlugin');
const util = require('./util');

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

const DefaultOption = {
    entity: '',
};

function AutoWebPlugin(pageDir, options) {
    options = Object.assign({}, DefaultOption, options);
    let { template, entity, commonsChunk } = options;
    this.commonsChunk = commonsChunk;
    let pageNames = getDirsInDir(pageDir);
    let entityMap = {};
    pageNames.forEach(pageName => {
        entityMap[pageName] = {}
        if (typeof template === 'string') {
            entityMap[pageName].template = template;
        } else if (typeof template === 'function') {
            entityMap[pageName].template = template(pageName)
        } else {
            entityMap[pageName].template = path.resolve(pageDir, pageName, 'index.html');
        }
        if (typeof entity === 'string') {
            entityMap[pageName].entityPath = path.resolve(pageDir, pageName, entity)
        } else if (typeof entity === 'function') {
            entityMap[pageName].entityPath = entity(pageName)
        }
    });

    this.entityMap = entityMap;
}

AutoWebPlugin.prototype.apply = function (compiler) {
    const _isProduction = util.isProduction(compiler);
    let { options } = compiler;
    let devServer = options.devServer || {};
    let { entityMap, commonsChunk } = this;
    let useCommonsChunk = typeof commonsChunk === 'string';
    Object.keys(entityMap).forEach(entityName => {
        let { template, entityPath } = entityMap[entityName];
        if (!options.entry.hasOwnProperty(entityName)) {
            options.entry[entityName] = _isProduction ? entityPath : [`webpack-dev-server/client?http://localhost:${devServer.port || 8080}/`, 'webpack/hot/dev-server', entityPath];
        }
        new WebPlugin({
            template: template,
            filename: `${entityName}.html`,
            require: useCommonsChunk ? [commonsChunk, entityName] : [entityName]
        }).apply(compiler);
    });
    if (useCommonsChunk) {
        new CommonsChunkPlugin({
            name: commonsChunk,
            chunks: Object.keys(entityMap)
        }).apply(compiler);
    }
};

module.exports = AutoWebPlugin;