const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const { AutoWebPlugin } = require('../../index');

const autoPlugin = new AutoWebPlugin('./src/', {
	template: './src/template.ejs',
	templateCompiler: (pageName, templateFullPath) => {
		const ejsTemplate = fs.readFileSync(templateFullPath, {
			encoding: 'utf8',
		});
		return ejs.render(ejsTemplate, {
			pageName,
		});
	}
});

module.exports = {
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].js',
	},
	entry: autoPlugin.entry({
		polyfill: './src/polyfill',
	}),
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
	plugins: [
		new ExtractTextPlugin('[name].css'),
		autoPlugin,
	]
};