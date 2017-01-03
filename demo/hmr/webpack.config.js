const path = require('path');
const WebWebpackPlugin = require('../../index');
const { WebPlugin } = WebWebpackPlugin;

module.exports = {
    output: {
        publicPath: '',
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    module: {
        loaders: [
            {
                test: /\.css$/,
                loader: ['style-loader', 'css-loader'],
            }
        ]
    },
    entry: {
        main: './index',
    },
    plugins: [
        new WebPlugin({
            filename: 'index.html',
            template: './template.html',
        }),
    ],
    performance: {
        'hints': false
    },
};