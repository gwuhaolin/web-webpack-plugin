# 预编译模版

在[一些场景下](https://github.com/gwuhaolin/web-webpack-plugin/issues/6)，你可能需要使用模版引擎预处理模版后再交给 `web-webpack-plugin` 去处理，要使用模版引擎需要使用`templateCompiler`属性，`WebPlugin` 和 `AutoWebPlugin` 都支持，具体使用如下：

```js
const autoPlugin = new AutoWebPlugin('./pages', {
	template: './template.ejs',
	// 定义一个函数，告诉你当前页面的 pageName 和 使用的模版的 文件完整路径 templateFullPath，你返回一个模版引擎处理后的HTML字符串内容。
	templateCompiler: function(pageName, templateFullPath) {
		const ejsTemplate = fs.readFileSync(templateFullPath, {
			encoding: 'utf8',
		});
		return ejs.render(ejsTemplate, {
			title: pageName,
		});
	},
});
```

对于`WebPlugin`用法和`AutoWebPlugin`完全一样。
