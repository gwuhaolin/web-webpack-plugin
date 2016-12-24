# 安装
```bash
npm i web-webpack-plugin --save-dev
```
```js
const WebWebpackPlugin = require('web-webpack-plugin');
const { WebPlugin, AutoWebPlugin } = WebWebpackPlugin;
```


# 输出html文件 [demo](https://github.com/gwuhaolin/web-webpack-plugin/tree/master/demo/out-html)
```js
module.exports = {
    entry: {
        A: './a',
        B: './b',
    },
    plugins: [
        new WebPlugin({
            // 输出的html文件名称，必填，注意不要重名，重名会覆盖相互文件。
            filename: 'index.html',
            // 该html文件依赖的entry，必须是一个数组。依赖的资源的注入顺序按照数组的顺序。
            require: ['A', 'B'],
        }),
    ]
};
```

将会输出一个`index.html`文件，这个文件将会自动引入 entry `A` 和 `B` 生成的js文件，输出的html如下:
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body>
<script src="A.js"></script>
<script src="B.js"></script>
</body>
</html>
```
输出的文件目录结构
```
├── A.js
├── B.js
└── index.html
```


# 使用html模版 [demo](https://github.com/gwuhaolin/web-webpack-plugin/tree/master/demo/use-template)
```js
module.exports = {
    entry: {
        A: './a',
        B: './b',
    },
    plugins: [
        new WebPlugin({
            filename: 'index.html',
            // html模版文件路径（相对于webpack.config.js的完整路径）
            template: './template.html',
            require: ['A', 'B'],
        }),
    ]
};
```
```html
<!DOCTYPE html>
<html lang="zh-cn">
<head>
    <meta charset="UTF-8">
    <script src="B"></script>
</head>
<body>
<!--SCRIPT-->
<footer>web-webpack-plugin</footer>
</body>
</html>
```
- 在html模版里通过`<script src="B"></script>` 引入需要的entry，`src="B"` 中的B为chunk配置的名称
- 注释`<!--SCRIPT-->` 代表除开通过`<script src></script>`引入的资源外，在 require 里配置的剩下的依赖的资源应该被注入的地方，如果模版没有出现`<!--SCRIPT-->`就放在`body`标签的最后
    
输出的html为：
```html
<!DOCTYPE html>
<html lang="zh-cn">
<head>
    <meta charset="UTF-8">
    <script src="B.js"></script>
</head>
<body>
<script src="A.js"></script>
<footer>web-webpack-plugin</footer>
</body>
</html>
```    


# 配置资源属性 [demo](https://github.com/gwuhaolin/web-webpack-plugin/tree/master/demo/config-resource)
针对每一个html依赖的资源，有如下属性可以配置：
- `_dist` 只有在生产环境下才引入该资源
- `_dev` 只有在开发环境下才引入该资源
- `_inline` 把该资源的内容潜入到html里
- `_ie` 只有IE浏览器才需要引入的资源，通过 `[if IE]>resource<![endif]` 注释实现

配置这些属性的方式有两种：

### 在html模版里配置
```js
module.exports = {
    entry: {
        'ie-polyfill': './ie-polyfill',
        inline: './inline',
        dev: './dev',
        googleAnalytics: './google-analytics',
    },
    plugins: [
        new WebPlugin({
            filename: 'index.html',
            template: './template.html'
        }),
    ]
};
```
template.html
```html
<!DOCTYPE html>
<html lang="zh-cn">
<head>
    <meta charset="UTF-8">
    <script src="inline?_inline"></script>
    <script src="ie-polyfill?_ie"></script>
</head>
<body>
<script src="dev?_dev"></script>
<script async src="googleAnalytics?_dist"></script>
</body>
</html>
```
[输出的html文件](https://github.com/gwuhaolin/web-webpack-plugin/blob/master/demo/config-resource/dist-template/index.html)

### 在`webpack.config.js`里配置
```js
module.exports = {
    plugins: [
        new WebPlugin({
            filename: 'index.html',
            require: {
                'ie-polyfill': {
                    _ie: true
                },
                'inline': {
                    _inline: true,
                    _dist: true
                },
                'dev': {
                    _dev: true
                },
                'googleAnalytics': {
                    _dist: true
                }
            }
        }),
    ]
};
```
[输出的html文件](https://github.com/gwuhaolin/web-webpack-plugin/blob/master/demo/config-resource/dist-js/index.html)


# 自动探测html入口 [demo](https://github.com/gwuhaolin/web-webpack-plugin/tree/master/demo/auto-plugin)
`AutoWebPlugin` 可以找到一个目录下所有的页面入口，自动为所有的页面入口配置一个`WebPlugin`输出对应的html，使用如下：
```js
module.exports = {
    plugins: [
        new AutoWebPlugin(
            // 所有页面的入口目录
            './src/', 
            {
            // 所有页面采用的模版文件
            template: './src/template.html',
            // 当前页面的javascript入口文件，如果为空就使用当前page目录下的 index.js 作为入口 
            entity: null,
            // 提取出所有页面公共的代码，放到common里,如果为空就不提取出所有页面公共的代码。使用 `CommonsChunkPlugin` 完成
            commonsChunk: 'common',
        }),
    ]
};
```
### template 属性
`template` 当template为字符串是，我看作为html模版文件的路径（相对于webpack.config.js的路径）。
在复杂的情况下你可以设置template为一个函数，如下使用当前页面目录下的index.html文件作为当前页面的模版文件
```js
const path = require('path');
module.exports = {
    plugins: [
        new AutoWebPlugin('./src/', {
            // 所有页面采用的模版文件
            template: (pageName) => {
                return path.resolve('./src',pageName,'index.html');
            },
        }),
    ]
};
```
### entity 属性
entity 属性 和 template 类似，同样也支持回调函数应对复杂情况。但是如果 entity 为空就使用当前页面目录下的 index.jsx? 作为入口 