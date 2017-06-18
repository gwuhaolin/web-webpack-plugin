const path = require('path');
const NamedModulesPlugin = require('webpack/lib/NamedModulesPlugin');
const { AutoWebPlugin, WebPlugin } = require('../../index');

const autoPlugin = new AutoWebPlugin('./pages', {
	template: './template.html',
});

module.exports = {
	output: {
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
	entry: autoPlugin.entry({
		a: './a',
	}),
	plugins: [
		new NamedModulesPlugin(),
		autoPlugin,
		new WebPlugin({
			template: './template.html',
			filename: 'a.html',
			requires: ['a'],
		}),
	]
};