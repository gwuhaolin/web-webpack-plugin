const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const { AutoWebPlugin } = require('../../index');

const autoPlugin = new AutoWebPlugin('./pages', {
	template: './template.ejs',
	templateCompiler: function(pageName, templateFullPath) {
		const ejsTemplate = fs.readFileSync(templateFullPath, {
			encoding: 'utf8',
		});
		return ejs.render(ejsTemplate, {
			title: pageName,
			filename: './template.ejs',
		});
	},
});

module.exports = {
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].js',
	},
	entry: autoPlugin.entry(),
	plugins: [autoPlugin],
};
