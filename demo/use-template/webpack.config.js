const WebWebpackPlugin = require('../../index');
const { WebPlugin } = WebWebpackPlugin;

module.exports = {
    output: {
        path: 'dist',
        filename: '[name].js',
    },
    entry: {
        A: './a',
        B: './b',
    },
    plugins: [
        new WebPlugin({
            filename: 'index.html',
            template: './template.html',
            require: ['A', 'B'],
        }),
    ]
};