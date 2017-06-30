/* eslint-disable no-console */
const { execSync } = require('child_process');

const webpack = execSync('npm run demo').toString();
console.log(webpack);
const change = execSync('git ls-files -m demo').toString();
if (change.length > 0) {
	console.error(`😡 webpack compile out in demo has changed, review these files:\n${change}`);
	process.exit(1);
} else {
	console.info('😘 webpack compile out in demo not change, test pass~');
}