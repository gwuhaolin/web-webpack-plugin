# web plugin for webpack

## 安装
```bash
npm i web-webpack-plugin --save-dev
```
```js
const WebWebpackPlugin = require('web-webpack-plugin');
const { WebPlugin, AutoWebPlugin } = WebWebpackPlugin;
```


## 输出html文件
```js
module.exports = {
    entry: {
        A: './a',
        B: './b',
    },
    plugins: [
        new WebPlugin({
            filename: 'index.html',
            require: ['A', 'B'],
        }),
    ]
};
```

- `filename` 输出的html文件名称，必填，注意不要重名，重名会覆盖相互文件。
- `require` 该html文件依赖的entry，必须是一个数组。依赖的资源的注入顺序按照数组的顺序。

将会输出一个`index.html`文件，这个文件将会自动引入 entry `app` 生成的js文件，输出的html如下:
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


## 使用html模版
```js
module.exports = {
    entry: {
        A: './a',
        B: './b',
    },
    plugins: [
        new WebPlugin({
            filename: 'index.html',
            template: './template.html',
            require: ['A', 'B'],
        }),
    ]
};
```
- `template` html模版文件路径（相对于webpack.config.js的完整路径）
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
文件目录结构为：
```
├── A.js
├── B.js
└── index.html
```


## 配置资源属性
针对每一个html依赖的资源，有如下属性可以配置：
- `_dist` 只有在生产环境下才引入该资源
- `_dev` 只有在开发环境下才引入该资源
- `_inline` 把该资源的内容潜入到html里
- `_ie` 只有IE浏览器才需要引入的资源，通过 `[if IE]>resource<![endif]` 注释实现

配置这些属性的方式有两种：

#### 在html模版里配置
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
[输出的html文件]()

#### 在`webpack.config.js`里配置
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
[输出的html文件]()


## 自动探测html入口