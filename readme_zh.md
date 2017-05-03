web应用需要加载的资源都需要在 webpack 的 entry里配置，最后输出对应的代码块，但是要让web应用运行起来还需要通过html加载这些资源放在浏览器里运行。webpack只做了资源打包的工作还缺少把这些加载到html里运行的功能，本插件补足了这个功能。

# 安装
```bash
npm i web-webpack-plugin --save-dev
```
```js
const { WebPlugin, AutoWebPlugin } = require('web-webpack-plugin');
```

# 功能列表


## 输出html文件 [demo](https://github.com/gwuhaolin/web-webpack-plugin/tree/master/demo/out-html)

**webpack配置**
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
            requires: ['A', 'B'],
        }),
    ]
};
```

将会输出一个`index.html`文件，这个文件将会自动引入 entry `A` 和 `B` 生成的js文件，

**输出的html:**
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

**输出的目录结构**
```
├── A.js
├── B.js
└── index.html
```


## 使用html模版 [demo](https://github.com/gwuhaolin/web-webpack-plugin/tree/master/demo/use-template)

**webpack配置**
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
            requires: ['A', 'B'],
        }),
    ]
};
```

**html模版**
通过html模版你可以很方便清晰的描述资源应该注入的位置

```html
<!DOCTYPE html>
<html lang="zh-cn">
<head>
    <meta charset="UTF-8">
    <!--加载一个在webpack里配置输出的chunk文件-->
    <script src="B"></script>
    <!--直接加载一个本地的文件的原内容，不走webpack的打包逻辑-->
    <link rel="stylesheet" href="./reset.min.css?_inline">
    <!--直接加载一个本地的文件的原内容，不走webpack的打包逻辑-->
    <script src="./google-analyze.js"></script>
</head>
<body>
<!--SCRIPT-->
<footer>web-webpack-plugin</footer>
</body>
</html>
```
- 在html模版里通过`<script src="B"></script>` 引入需要的entry，`src="B"` 中的B为chunk配置的名称
- 注释`<!--SCRIPT-->` 代表除开通过`<script src></script>`引入的资源外，在 requires 里配置的剩下的依赖的资源应该被注入的地方，如果模版没有出现`<!--SCRIPT-->`就放在`body`标签的最后
    
**输出的html:**
```html
<!DOCTYPE html>
<html lang="zh-cn">
<head>
    <meta charset="UTF-8">
    <!--加载一个在webpack里配置输出的chunk文件-->
    <script src="B.js"></script>
    <!--直接加载一个本地的文件的原内容，不走webpack的打包逻辑-->
    <style>body {
        background-color: rebeccapurple;
    }</style>
    <!--直接加载一个本地的文件的原内容，不走webpack的打包逻辑-->
    <script src="google-analyze.js"></script>
</head>
<body>
<script src="A.js"></script>
<footer>web-webpack-plugin</footer>

</body>
</html>
```    



## 配置资源属性 [demo](https://github.com/gwuhaolin/web-webpack-plugin/tree/master/demo/config-resource)
针对每一个html依赖的资源，有如下属性可以配置：
- `_dist` 只有在生产环境下才引入该资源
- `_dev` 只有在开发环境下才引入该资源
- `_inline` 把该资源的内容潜入到html里
- `_ie` 只有IE浏览器才需要引入的资源，通过 `[if IE]>resource<![endif]` 注释实现

配置这些属性的方式有两种：

### 在html模版里配置

**webpack配置**
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

**html模版**
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
<!--load a local google analyze file direct without local var webpack-->
<script async src="./google-analytics.js?_dist"></script>
</body>
</html>
```
[输出的html文件](https://github.com/gwuhaolin/web-webpack-plugin/blob/master/demo/config-resource/dist-template/index.html)

### 在`webpack.config.js`里配置

**webpack配置**
```js
module.exports = {
    plugins: [
        new WebPlugin({
            filename: 'index.html',
            requires: {
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
                //load a local google analyze file direct without local var webpack
                './google-analytics.js': {
                    _dist: true
                }
            }
        }),
    ]
};
```
[输出的html文件](https://github.com/gwuhaolin/web-webpack-plugin/blob/master/demo/config-resource/dist-js/index.html)



## 自动探测html入口 [demo](https://github.com/gwuhaolin/web-webpack-plugin/tree/master/demo/auto-plugin)
`AutoWebPlugin` 可以找到一个目录下所有的页面入口，自动为所有的页面入口配置一个`WebPlugin`输出对应的html，使用如下：

**webpack配置**
```js
module.exports = {
    plugins: [
        new AutoWebPlugin(
            // 所有页面的入口目录
            './src/', 
            {
            // 所有页面采用的模版文件
            // 如果 template 的类型是 string，template代表模版文件的相对于当前目录根目录的全文件路径
            // 如果 template 的类型是 function，template代表可自定义逻辑的函数 function(pageName)=>newFullPath，告诉你当前页面名称你返回一个新的路径代表当前页面的模版路径
            template: './src/template.html',
            // 当前页面的javascript入口文件，如果为空就使用当前page目录下的 index.js 作为入口
            // 如果 entry 的类型是 string，entry代表入口文件的相对于当前目录根目录的全文件路径
            // 如果 entry 的类型是 function，entry代表可自定义逻辑的函数 function(pageName)=>newFullPath，告诉你当前页面名称你返回一个新的路径代表当前页面的入口路径
            entry: null,
            // 提取出所有页面公共的代码,如果为空就不做提取操作。
            // 透传给 `CommonsChunkPlugin` 插件的属性
            commonsChunk: {
                 name: 'common',// 必填属性,输出的文件名称
                 minChunks: 2,// 来自 CommonsChunkPlugin 插件
            },
            // 在所有入口页面的entry前插入
            preEntrys:['./path/to/file1.js'],
            // 在所有入口页面的entry后插入
            postEntrys:['./path/to/file2.js'],
            // 是否输出一个名叫 pagemap.json 的文件，这个文件包含所有被AutoWebPlugin解析到的2入口页面，文件格式如下
            // {"page name": "page url",}
            outputPagemap: true,
        }),
    ]
};
```

**源代码目录结构**
```
── src
│   ├── home
│   │   └── index.js
│   ├── ie_polyfill.js
│   ├── login
│   │   └── index.js
│   ├── polyfill.js
│   ├── signup
│   │   └── index.js
│   └── template.html
```

**输出的目录结构**
```
├── dist
│   ├── common.js
│   ├── home.html
│   ├── home.js
│   ├── ie_polyfill.js
│   ├── login.html
│   ├── login.js
│   ├── polyfill.js
│   ├── signup.html
│   └── signup.js
```
`AutoWebPlugin`插件找出了`./src/`目录下所有的目录`home login signup`,针对这3个目录分别读取目录里的`index.js`作为入口，生成三个html文件`home.html login.html signup.html`

### ignorePages attribute
`ignorePages` 被忽略的页面名称列表，被忽略的页面将不会被AutoWebPlugin处理产生对于的html文件，类型是元素为字符串的数组。

### template 属性
`template` 当template为字符串是，我看作为html模版文件的路径（相对于webpack.config.js的路径）。
在复杂的情况下你可以设置template为一个函数，如下使用当前页面目录下的index.html文件作为当前页面的模版文件

**webpack配置**
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
### entry 属性
entry 属性 和 template 类似，同样也支持回调函数应对复杂情况。但是如果 entry 为空就使用当前页面目录下的 `index.jsx?` 作为入口



## 配置 publicPath [demo](https://github.com/gwuhaolin/web-webpack-plugin/tree/master/demo/public-path)


## 加载 css [demo](https://github.com/gwuhaolin/web-webpack-plugin/tree/master/demo/extract-css)
每个 entry 对应的 resource 可能会包含 css 代码。
如果你想把css代码提取出来单独加载而不是潜入在js里加载你需要先使用
[extract-text-webpack-plugin](https://github.com/webpack/extract-text-webpack-plugin) 
分离出css代码，剩下的事情交给我，我会自动像上面处理js一样处理css

**webpack配置**
```js
// webpack.config.js
module.exports = {
    module: {
        loaders: [
            {
                test: /\.css$/,
                loader: ExtractTextPlugin.extract({
                    fallbackLoader: 'style-loader',
                    loader: 'css-loader'
                })
            }
        ]
    },
    entry: {
        1: './1',
        2: './2',
        3: './3',
        4: './4',
    },
    plugins: [
        new ExtractTextPlugin('[name].css'),
        new WebPlugin({
            filename: 'index.html',
            template: './template.html',
            requires: ['1', '2', '3', '4']
        }),
    ]
};
```

**html模版**
```html
<!DOCTYPE html>
<html lang="zh-cn">
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="1">
    <link rel="stylesheet" href="2?_inline">
    <link rel="stylesheet" href="3?_ie">
    <script src="1"></script>
    <!--STYLE-->
</head>
<body>
<script src="2"></script>
<!--SCRIPT-->
<footer>footer</footer>
</body>
</html>
```

**输出的html:**
```html
<!DOCTYPE html>
<html lang="zh-cn">
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="1.css">
    <style>
    /**2.css**/
    body {
        background-color: rebeccapurple;
    }</style>
    <!--[if IE]>
    <link rel="stylesheet" href="3.css">
    <![endif]-->
    <script src="1.js"></script>
    <link rel="stylesheet" href="4.css">
</head>
<body>
<script src="2.js"></script>
<script src="3.js"></script>
<script src="4.js"></script>
<footer>footer</footer>
</body>
</html>
```

**输出的目录结构**
```
├── 1.css
├── 1.js
├── 2.css
├── 2.js
├── 3.css
├── 3.js
├── 4.css
├── 4.js
└── index.html
```
 
 
# 区分环境
这个插件会考虑 **开发环境** 和 **生产环境** 两种情况。有且仅当`process.env.NODE_ENV = production`是才认为当前环境是 **生产环境**，其它的都认为是开发环境。
`webpack -p` 参数会通过 DefinePlugin 定义 `NODE_ENV=production`。


# 支持的 node.js 版本
本插件使用了很多es6语法，支持最新的 node.js LTS 版本

# 项目实践
- [Redemo](https://github.com/gwuhaolin/redemo)
