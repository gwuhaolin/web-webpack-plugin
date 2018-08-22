# 给 HTML 标签注入属性

有时你需要为 HTML 标签设置一些属性，例如你想为 Webpack 生成的 Chunk B 对应的 `script` 标签带上 `crossorigin=anonymous` 属性，你可以通过在 querystring 中带上非 **\_** 开头的属性名称和对应的值即可。

HTML 模版如下：

```html
<!DOCTYPE html>
<html lang="zh-cn">
<head>
	<meta charset="UTF-8">
	<!--load a chunk file config and output in webpack-->
	<script src="B?crossorigin=anonymous&data-group=abc"></script>
	<!--load a local reset style file direct without local var webpack-->
	<link rel="stylesheet" href="./reset.min.css?_inline&data-group=abc" charset="x-UTF-16LE-BOM">
	<!--load a local google analyze file direct without local var webpack-->
	<script async data-group="123" src="./google-analyze.js"></script>
</head>
<body>
<!--SCRIPT-->
<footer>web-webpack-plugin</footer>
</body>
</html>
```

输出的 HTML：

```html
<!DOCTYPE html>
<html lang="zh-cn">
<head>
	<meta charset="UTF-8">
	<!--load a chunk file config and output in webpack-->
	<script src="B.js" crossorigin="anonymous" data-group="abc"></script>
	<!--load a local reset style file direct without local var webpack-->
	<style rel="stylesheet" charset="x-UTF-16LE-BOM" data-group="abc">body {
    background-color: rebeccapurple;
}</style>
	<!--load a local google analyze file direct without local var webpack-->
	<script async="" data-group="123" src="google-analyze.js"></script>
</head>
<body>
<script src="A.js"></script>
<footer>web-webpack-plugin</footer>

</body>
</html>
```

同时你会发现除了 querystring 中非 **\_** 开头的属性被注入到了输出的 HTML 标签中外，原模版里的自带的属性被会保留原样，如上面的 `charset="x-UTF-16LE-BOM"`。

除此之外，采用在配置文件里配置属性的方式也可以给 HTML 标签注入属性：

```js
new WebPlugin({
	filename: 'index.html',
	requires: {
		'ie-polyfill': {
			_ie: true,
			crossorigin: 'anonymous',
		},
	},
});
```
