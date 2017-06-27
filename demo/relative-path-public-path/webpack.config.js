const path = require('path');
const ExtractTextPlugin = require("extract-text-webpack-plugin");
const { WebPlugin } = require('../../index');

module.exports = {
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'js/[name].js',
		publicPath: '//cdn.cn/'
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
			{
				test: /\.(pdf)$/,
				loader: 'file-loader',
				query: {
					name: 'img/[name]_[hash].[ext]',
				},
			},
		]
	},
	plugins: [
		new ExtractTextPlugin({
			filename: 'css/[name].css',
		}),
		new WebPlugin({
			filename: 'html/index.html',
			template: './template.html',
		}),
	]
};