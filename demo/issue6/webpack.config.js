const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
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
	},
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
		rules: [
			{
				test: /\.css$/,
				loader: [MiniCssExtractPlugin.loader, 'css-loader'],
			},
		],
	},
	plugins: [
		new MiniCssExtractPlugin({
			filename: '[name].css',
		}),
		autoPlugin,
	],
};
