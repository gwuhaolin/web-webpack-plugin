const path = require('path');
const { AutoWebPlugin } = require('../../index');

module.exports = {
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    entry: {
        ie_polyfill: './src/ie_polyfill',
        polyfill: './src/polyfill',
    },
    plugins: [
        new AutoWebPlugin('./src/', {
            ignorePages: ['ignore'],
            template: './src/template.html',
            commonsChunk: {
                name: 'common',// name prop is require
                minChunks: 2,
            },
            entity: ''
        }),
    ]
};