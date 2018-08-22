const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { AutoWebPlugin } = require('../../index');

const autoWebPlugin = new AutoWebPlugin('./src/', {
	ignorePages: ['ignore'],
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
		ie_polyfill: './src/ie_polyfill',
		polyfill: './src/polyfill',
	}),
	optimization: {
		splitChunks: {
			minSize: 0,
			cacheGroups: {
				commons: {
					chunks: 'initial',
					name: 'common',
					minChunks: 2,
				},
			},
		},
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
		autoWebPlugin,
	],
};
