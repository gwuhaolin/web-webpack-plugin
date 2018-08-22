# AutoWebPlugin 可以自定义输出的 html 文件名称

`AutoWebPlugin` 可以自定义输出的 html 文件名称的逻辑，只需给 filename 传一个 function 即可。这个函数定义为：`(pageName)=> newPageName`，

加入配置如下，有一个 page 的目录名称为`login`，则`pageName='login'`，实际输出的 html 文件名称为`login++.html`。

```js
new AutoWebPlugin('./src/', {
	filename: (pageName) => `${pageName}++`,
});
```
