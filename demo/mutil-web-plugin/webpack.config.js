const path = require('path');
const { WebPlugin } = require('../../index');

const common = {
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: '[name].js',
		publicPath: 'https://cdn.cn/',
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				loader: ['style-loader', 'css-loader'],
			},
		],
	},
};

module.exports = [
	{
		...common,
		entry: {
			home: './src/home',
		},
		plugins: [
			new WebPlugin({
				template: './src/template.html',
				outputPagemap: true,
				filename: 'home.html',
			}),
		],
	},
	{
		...common,
		entry: {
			login: './src/login',
		},
		plugins: [
			new WebPlugin({
				template: './src/template.html',
				outputPagemap: true,
				filename: 'login.html',
			}),
		],
	},
];
