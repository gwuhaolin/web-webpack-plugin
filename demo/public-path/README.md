# 设置PublicPath
生产环境下最好把生产的JS和CSS发布到CDN上去，以加速你的网站加载速度。这时候你需要配置PublicPath。
- 要配置JS文件的PublicPath，如下：
```js
      module.exports = {
        output: {
          publicPath: '//js.cdn'
        }
      };
```

- 要配置CSS文件的 PublicPath，如下：
```js
      new WebPlugin({
        stylePublicPath: '//css.cdn',
      })
```

- 其他资源的 PublicPath，如下：
```js
      {
        test: /\.css$/,
        loaders: ExtractTextPlugin.extract({
          // 通过css加载的文件都放在9.url.cn
          publicPath: CND.img,
          fallback: 'style-loader',
          use: ['css-loader?minimize'],
        }),
      },
```