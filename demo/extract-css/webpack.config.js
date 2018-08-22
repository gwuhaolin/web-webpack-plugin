const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { WebPlugin } = require('../../index');

module.exports = {
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].js',
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				loader: [MiniCssExtractPlugin.loader, 'css-loader'],
			},
		],
	},
	entry: {
		1: './1',
		2: './2',
		3: './3',
		4: './4',
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: '[name].css',
		}),
		new WebPlugin({
			filename: 'index.html',
			template: './template.html',
			requires: ['1', '2', '3', '4'],
		}),
	],
	mode: 'development',
};
