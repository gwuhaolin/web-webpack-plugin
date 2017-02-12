const path = require('path');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const { WebPlugin } = require('../../index');

module.exports = {
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        publicPath: '//js.cdn'
    },
    entry: {
        A: './a',
        B: './b',
    },
    module: {
        loaders: [
            {
                test: /\.css$/,
                loaders: ExtractTextPlugin.extract({
                    fallback: 'style-loader',
                    use: ['css-loader'],
                }),
            },
        ]
    },
    plugins: [
        new ExtractTextPlugin({
            filename: '[name].css',
        }),
        new WebPlugin({
            filename: 'index.html',
            template: './template.html',
            stylePublicPath: '//css.cdn',
        }),
    ]
};