const path = require('path');
const WebWebpackPlugin = require('../../index');
const { WebPlugin } = WebWebpackPlugin;

module.exports = {
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name]_[chunkhash].js',
        publicPath: '//cdn.com'
    },
    entry: {
        A: './a',
        B: './b',
    },
    plugins: [
        new WebPlugin({
            filename: 'index.html',
            template: './template.html',
        }),
    ]
};