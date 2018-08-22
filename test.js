/* eslint-disable no-console */
const assert = require('assert');
const { execSync, spawn } = require('child_process');

const webpack = spawn('npm', ['run', 'demo']);
webpack.stdout.pipe(process.stdout);

webpack.on('close', (code) => {
	assert.equal(code, 0, '😡 webpack should run complete successful!');
	const change = execSync('git ls-files -dom demo').toString();
	assert.equal(
		change.length,
		0,
		`😡 webpack compile out in demo has changed, review these files:\n${change}`
	);
	console.info('😘 webpack compile out in demo not change, test pass~');
});
