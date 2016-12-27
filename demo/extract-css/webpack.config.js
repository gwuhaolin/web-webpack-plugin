const ExtractTextPlugin = require('extract-text-webpack-plugin');
const WebWebpackPlugin = require('../../index');
const { WebPlugin } = WebWebpackPlugin;

module.exports = {
    output: {
        path: 'dist',
        filename: '[name].js',
    },
    module: {
        loaders: [
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract({
                    fallbackLoader: 'style-loader',
                    loader: 'css-loader'
                })
            }
        ]
    },
    entry: {
        1: './1',
        2: './2',
        3: './3',
        4: './4',
    },
    plugins: [
        new ExtractTextPlugin('[name].css'),
        new WebPlugin({
            filename: 'index.html',
            template: './template.html',
            requires: ['1', '2', '3', '4']
        }),
    ]
};