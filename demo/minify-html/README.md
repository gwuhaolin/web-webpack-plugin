# 使用HTML模版配置资源注入到HTML
通过配置webpack的entry，webpack为我们生产了一系列chunk。但是我们需要把这些chunk注入到HTML里才可以在浏览器里运行起来。
`WebPlugin`可以方便的帮你把chunk注入到HTML里。
```js
        new WebPlugin({
          filename: 'index.html',
          template: './template.html',
          requires: ['A', 'B'],
        }),
```


使用HTML模版可以更细粒度的控制chunk的注入位置。同时你还可以控制每个chunk注入到HTML里的方式，通过`?_inline&_dev`这样querystring的方式来配置属性。

支持以下注入方式
- `_dist` 只有在生产环境下才引入该资源
- `_dev` 只有在开发环境下才引入该资源
- `_inline` 把该资源的内容潜入到html里
- `_ie` 只有IE浏览器才需要引入的资源，通过 `[if IE]>resource<![endif]` 注释实现


通过`requires`属性可以指明这个页面依赖哪些chunk，如果你在HTML模版里没有注入完`requires`指明的所有chunk，那么`WebPlugin`会自动找出剩下遗漏的部分帮你补充进去，补充的方式如下
- 剩余的所有JS注入到 `<!--SCRIPT-->` 所在的位置，`<!--SCRIPT-->` 不存在是注入到BODY标签的最后。
- 剩余的所有CSS注入到 `<!--STYLE-->` 所在的位置，`<!--STYLE-->` 不存在是注入到HEAD标签的最后。