const path = require('path');
const { AutoWebPlugin } = require('../../index');

const autoPlugin = new AutoWebPlugin('./pages', {
	filename: 'index.html',
	templateContent: function (pageName) {
		return `
<!DOCTYPE html>
<html lang="zh-cn">
<head>
	<meta charset="UTF-8">
	<title>${pageName}</title>
</head>
<body>
</body>
</html>`
	},
});

module.exports = {
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].js',
	},
	entry: autoPlugin.entry({}),
	plugins: [
		autoPlugin,
	]
};