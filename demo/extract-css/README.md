# 从JS中提取出CSS
有些时候webpack生产的chunk里包含了一些CSS代码，这些代码会通过JS注入到HTML HEAD里来加载。如果你想把JS里的CSS提取出来你可以使用`extract-text-webpack-plugin`插件提取。
提取后这个chunk会输出2个文件，一个是纯JS，一个是纯CSS。
这种情况下在使用`WebPlugin`时，你需要把提取出的CSS注入进去，如下：
webpack配置：
```js
  module: {
    loaders: [
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: 'css-loader'
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
```
这样webpack会生成4个名叫 1, 2, 3, 4 的chunk，并且他们里面的CSS都被提取出来了。所以在HTML模版中你需要这样注入提取的CSS
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