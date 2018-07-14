const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { WebPlugin } = require('../../index');

module.exports = {
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'js/[name].js',
		// publicPath: '//cdn.cn/'
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
			{
				test: /\.(pdf)$/,
				loader: 'file-loader',
				query: {
					name: 'img/[name]_[hash].[ext]',
				},
			},
		],
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: '[name].css',
		}),
		new WebPlugin({
			filename: 'html/index.html',
			template: './template.html',
		}),
	],
};
