# 管理多个单页应用
`AutoWebPlugin` 可以自动管理多个单页应用。简单使用如下
```js
    new AutoWebPlugin('./src/', {
      ignorePages: ['ignore'],
      template: './src/template.html',
      commonsChunk: {
        name: 'common',// name prop is require
        minChunks: 2,
      },
      outputPagemap: true,
    })
```
以上配置会让`AutoWebPlugin`找出`./src/`目录下的所有目录，为每个目录生产一个HTML作为单页应用的入口。
- `ignorePages` 属性用了忽略名叫`ignore`的目录，不为这个目录生产HTML入口
- `template` 属性指出所有单页应用生产HTML入口时公用的HTML模版，模版语法和`WebPlugin`里一致。
- `commonsChunk` 属性用来为`AutoWebPlugin`找出的所有单页应用抽离公共代码，用webpack自带的`CommonsChunkPlugin`实现。`commonsChunk`的配置属性和`CommonsChunkPlugin`一样。
- `outputPagemap` 属性用来输出一个叫`pagemap.json`的文件，里面存放了`AutoWebPlugin`找出的所有单页应用的名称和URL的映射关系。

`AutoWebPlugin`还支持很多配置选项，你可以[在这里看到](https://github.com/gwuhaolin/web-webpack-plugin/blob/master/lib/AutoWebPlugin.js#L33)。

更多关于`AutoWebPlugin`的资料可以参考以下文章：
- [webpack原理与实战](https://github.com/gwuhaolin/blog/issues/4)
- [webpack2 终极优化](https://github.com/gwuhaolin/blog/issues/2)