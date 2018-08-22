# 提取基础运行库

```js
const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { AutoWebPlugin } = require('../../index');

const autoWebPlugin = new AutoWebPlugin('./src/pages', {
	template: './src/template.html',
});

module.exports = {
	mode: 'development',
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].[chunkhash].js',
	},
	entry: autoWebPlugin.entry({
		base: './src/base.ts',
	}),
	optimization: {
		runtimeChunk: {
			name: 'runtime',
		},
		splitChunks: {
			minSize: 0,
			cacheGroups: {
				base: {
					chunks: 'all',
					name: 'base',
					test: 'base',
				},
				common: {
					chunks: 'all',
					name: 'common',
					minChunks: 2,
				},
			},
		},
	},
	resolve: {
		// 先尝试 ts，tsx 后缀的 TypeScript 源码文件
		extensions: ['.ts', '.tsx', '.js'],
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				loader: [MiniCssExtractPlugin.loader, 'css-loader'],
			},
			{
				test: /\.tsx?$/,
				loader: ['ts-loader'],
			},
		],
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: '[contenthash].css',
		}),
		autoWebPlugin,
	],
};
```
