const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { WebPlugin } = require('../../index');

module.exports = {
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].js',
		publicPath: '//js.cdn',
	},
	entry: {
		A: './a',
		B: './b',
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				loader: [MiniCssExtractPlugin.loader, 'css-loader'],
			},
		],
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: '[name].css',
		}),
		new WebPlugin({
			filename: 'index.html',
			template: './template.html',
			stylePublicPath: '//css.cdn',
		}),
	],
};
