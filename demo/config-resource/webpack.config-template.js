const WebWebpackPlugin = require('../../index');
const { WebPlugin } = WebWebpackPlugin;

module.exports = {
    output: {
        path: './dist-template',
        filename: '[name].js',
    },
    entry: {
        'ie-polyfill': './ie-polyfill',
        inline: './inline',
        dev: './dev',
        googleAnalytics: './google-analytics',
    },
    plugins: [
        new WebPlugin({
            filename: 'index.html',
            template: './template.html'
        }),
    ]
};