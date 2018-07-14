const path = require('path');
const { WebPlugin } = require('../../index');

module.exports = {
	output: {
		path: path.resolve(__dirname, 'dist-template'),
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
			template: './template.html',
		}),
	],
};
