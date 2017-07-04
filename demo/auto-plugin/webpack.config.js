const path = require('path');
const fs = require('fs');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const { AutoWebPlugin } = require('../../index');

module.exports = {
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].js',
		publicPath: 'https://cdn.cn/'
	},
	entry: {
		ie_polyfill: './src/ie_polyfill',
		polyfill: './src/polyfill',
	},
	module: {
		loaders: [
			{
				test: /\.css$/,
				loader: ExtractTextPlugin.extract({
					fallback: 'style-loader',
					use: 'css-loader'
				})
			}
		]
	},
	plugins: [
		new ExtractTextPlugin('[name].css'),
		new AutoWebPlugin('./src/', {
			ignorePages: ['ignore'],
			template: './src/template.html',
			commonsChunk: {
				name: 'common',// name prop is require
				minChunks: 2,
			},
			outputPagemap: true,
		}),
	]
};