const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { AutoWebPlugin } = require('../../index');

const autoWebPlugin = new AutoWebPlugin({
	home: 'src/home',
	login: 'src/login',
}, {
	template: './src/template.html',
	outputPagemap: true,
});

module.exports = {
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].js',
		publicPath: 'https://cdn.cn/',
	},
	entry: autoWebPlugin.entry({
	}),
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
		autoWebPlugin,
	],
};
