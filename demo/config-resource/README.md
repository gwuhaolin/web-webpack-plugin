# 在webpack里直接通过JS配置资源注入到HTML
通过配置webpack的entry，webpack为我们生产了一系列chunk。但是我们需要把这些chunk注入到HTML里才可以在浏览器里运行起来。
`WebPlugin`可以方便的帮你把chunk注入到HTML里。
```js
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
    })
```
通过`requires`属性可以配置chunk注入到HTML里的方式。`requires`的值可以是一个数组或是一个object。
- 为数组时，数组里的每一项都是chunk的名称。
- 为object时，可以配置每个chunk的注入方式

支持以下注入方式
- `_dist` 只有在生产环境下才引入该资源
- `_dev` 只有在开发环境下才引入该资源
- `_inline` 把该资源的内容潜入到html里
- `_ie` 只有IE浏览器才需要引入的资源，通过 `[if IE]>resource<![endif]` 注释实现

这种方式没有使用HTML模版，`WebPlugin`会采用默认的模版来生成一个HTML。如果你想要更细粒度的控制chunk的注入位置，你最好[使用模版](https://github.com/gwuhaolin/web-webpack-plugin/tree/master/demo/use-template)。