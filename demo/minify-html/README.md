# 压缩输出的HTML
```js
const { minify } = require('html-minifier');
new WebPlugin({
  htmlMinify: (orgHTML) => {
  	return minify(orgHTML, {
  		minifyJS: true,
  	});
  }
})
```
