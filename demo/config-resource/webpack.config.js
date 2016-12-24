const WebWebpackPlugin = require('../../index');
const { WebPlugin } = WebWebpackPlugin;

module.exports = {
    output: {
        path: 'dist-js',
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
            require: {
                'ie-polyfill': {
                    _ie: true
                },
                'inline': {
                    _inline: true,
                    _dist: true
                },
                'dev': {
                    _dev: true
                },
                'googleAnalytics': {
                    _dist: true
                }
            }
        }),
    ]
};