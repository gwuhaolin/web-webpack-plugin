const path = require('path');
const { WebPlugin } = require('../../index');

module.exports = {
	output: {
		path: path.resolve(__dirname, 'dist-js'),
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
			requires: {
				'ie-polyfill': {
					_ie: true,
					crossorigin: 'anonymous',
				},
				inline: {
					_inline: true,
					_dist: true,
				},
				dev: {
					_dev: true,
				},
				//load a local google analyze file direct without local var webpack
				'./google-analytics.js': {
					_dist: true,
				},
			},
		}),
	],
};
