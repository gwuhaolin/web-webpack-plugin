const fs = require('fs');
const path = require('path');
const CommonsChunkPlugin = require('webpack/lib/optimize/CommonsChunkPlugin');
const WebPlugin = require('./WebPlugin');

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

function AutoWebPlugin(pageDir, options = {
    template: 'index.html',
    entity: '',
    commonsChunk: 'common'
}) {
    let { template, entity, commonsChunk } = options;
    this.commonsChunk = commonsChunk;
    let pageNames = getDirsInDir(pageDir);
    let entityMap = {};
    pageNames.forEach(pageName => {
        entityMap[pageName] = {}
        if (typeof template === 'string') {
            entityMap[pageName].template = path.resolve(pageDir, pageName, template);
        } else if (typeof template === 'function') {
            entityMap[pageName].template = template(pageName)
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
    let { options } = compiler;
    let { entityMap, commonsChunk } = this;
    Object.keys(entityMap).forEach(entityName => {
        let { template, entityPath } = entityMap[entityName];
        if (!options.entry.hasOwnProperty(entityName)) {
            options.entry[entityName] = entityPath;
        }
        new WebPlugin({
            template: template,
            filename: `${entityName}.html`,
        }).apply(compiler);
    });
    if (typeof commonsChunk === 'string') {
        new CommonsChunkPlugin({
            name: commonsChunk,
            chunks: Object.keys(entityMap)
        }).apply(compiler);
    }
};

module.exports = AutoWebPlugin;