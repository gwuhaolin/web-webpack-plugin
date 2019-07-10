# 管理多个单页应用

`AutoWebPlugin` 可以自动管理多个单页应用。简单使用如下

```js
const path = require('path');
const { AutoWebPlugin } = require('../../index');

const autoWebPlugin = new AutoWebPlugin({
	home: 'src/home',
	login: 'src/login',
}, {
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
		autoWebPlugin,
	],
};
```