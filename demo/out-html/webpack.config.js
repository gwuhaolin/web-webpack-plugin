const path = require('path');
const { WebPlugin } = require('../../index');

module.exports = {
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].js',
	},
	entry: {
		A: './a',
		B: './b',
	},
	plugins: [
		new WebPlugin({
			filename: 'index.html',
			requires: ['A', 'B'],
		}),
	],
};
