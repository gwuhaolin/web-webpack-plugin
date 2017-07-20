const path = require('path');
const { WebPlugin } = require('../../index');
const { minify } = require('html-minifier');

module.exports = {
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].js',
	},
	entry: {
		A: './a',
	},
	plugins: [
		new WebPlugin({
			filename: 'index.html',
			template: './template.html',
			htmlMinify: (orgHTML) => {
				return minify(orgHTML, {
					minifyJS: true,
				});
			}
		}),
	]
};