const path = require('path');
const { AutoWebPlugin } = require('../../index');

module.exports = {
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    entry: {},
    plugins: [
        new AutoWebPlugin('./pages', {
            preEntrys: ['./polyfill'],
            postEntrys: ['./google-analytics']
        }),
    ]
};