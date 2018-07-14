const path = require('path');
const { AutoWebPlugin } = require('../../index');

const autoPlugin = new AutoWebPlugin('./src/', {
	filename: (pageName) => `${pageName}++`,
});

module.exports = {
	entry: autoPlugin.entry(),
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].js',
	},
	plugins: [autoPlugin],
};
