const path = require('path');
const NamedModulesPlugin = require('webpack/lib/NamedModulesPlugin');
const { WebPlugin } = require('../../index');

module.exports = {
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
  },
  module: {
    loaders: [
      {
        test: /\.css$/,
        loader: ['style-loader', 'css-loader'],
      }
    ]
  },
  entry: {
    main: './index',
  },
  plugins: [
    new NamedModulesPlugin(),
    new WebPlugin({
      filename: 'index.html',
      template: './template.html',
    }),
  ],
  performance: {
    'hints': false
  },
};