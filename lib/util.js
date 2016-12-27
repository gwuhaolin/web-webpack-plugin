/**
 * whether is webpack compiler is in Production env
 * only if webpack use DefinePlugin to define
 * process.env.NODE_ENV==="production"
 * will return true else return false
 * @param compiler
 * @returns {boolean}
 */
function isProduction(compiler) {
    let plugins = compiler.options.plugins;
    for (let i = 0; i < plugins.length; i++) {
        let plugin = plugins[i];
        try {
            if (plugin.definitions['process.env.NODE_ENV'] === '"production"') {
                return true;
            }
        } catch (_) {
        }
    }
    return false;
}

module.exports = {
    isProduction,
}