# 直接注入本地文件

`WebPlugin`除了可以注入 webpack 生成的 chunk 外，还可以直接读取本地文件原封不动的注入到 HTML 里去。如下：

```html
<!DOCTYPE html>
<html lang="zh-cn">
<head>
  <!--reset.css is a local file-->
  <link rel="stylesheet" href="./reset.css?_inline">
  <!--A is a chunk define in webpack-->
  <script src="A"></script>
  <!--jquery.js is a local file,this will load direct without packed by webpack,support config-->
  <script src="./jquery.js"></script>
  <!--load local file ie-polyfill.js direct with config-->
  <script src="./ie-polyfill.js?_ie"></script>
</head>
<body>
</body>
</html>
```

如果资源路径类似：

* `./jquery.js` 以`./` `/` `../` 这些开头的就认为是要读取本地文件
* `A` 这样的直接是一个单词，就认为是 webpack chunk

同时支持 JS 和 CSS
