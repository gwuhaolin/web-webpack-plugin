const path = require('path');
const { WebPlugin } = require('../../index');
const DefinePlugin = require('webpack/lib/DefinePlugin');

module.exports = [
	{
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: '[name].js',
		},
		entry: {
			A: './a',
		},
		plugins: [
			new DefinePlugin({
				NAME: JSON.stringify('AA'),
			}),
			new WebPlugin({
				filename: 'a.html',
				requires: ['A', 'B'],
			}),
		],
	},
	{
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: '[name].js',
		},
		entry: {
			B: './b',
		},
		plugins: [
			new DefinePlugin({
				NAME: JSON.stringify('BB'),
			}),
			new WebPlugin({
				filename: 'b.html',
				requires: ['A', 'B'],
			}),
		],
	},
];
