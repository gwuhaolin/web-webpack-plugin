# 管理多个单页应用

`AutoWebPlugin` 可以自动管理多个单页应用。简单使用如下

```js
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
```

以上配置会让`AutoWebPlugin`找出`./src/`目录下的所有目录，为每个目录生产一个 HTML 作为单页应用的入口。

* `ignorePages` 属性用了忽略名叫`ignore`的目录，不为这个目录生产 HTML 入口
* `template` 属性指出所有单页应用生产 HTML 入口时公用的 HTML 模版，模版语法和`WebPlugin`里一致。
* `outputPagemap` 属性用来输出一个叫`pagemap.json`的文件，里面存放了`AutoWebPlugin`找出的所有单页应用的名称和 URL 的映射关系。

`AutoWebPlugin`还支持很多配置选项，你可以[在这里看到](https://github.com/gwuhaolin/web-webpack-plugin/blob/master/lib/AutoWebPlugin.js#L33)。

更多关于`AutoWebPlugin`的资料可以参考以下文章：

* [webpack 原理与实战](https://github.com/gwuhaolin/blog/issues/4)
* [webpack2 终极优化](https://github.com/gwuhaolin/blog/issues/2)
