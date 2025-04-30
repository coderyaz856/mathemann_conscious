// frontend/config-overrides.js
const webpack = require('webpack');

module.exports = function override(config, env) {
    // Add fallback configurations for Node.js core modules
    config.resolve = {
        ...config.resolve, // Preserve existing resolve configurations
        fallback: {
            buffer: require.resolve('buffer/'),
            crypto: require.resolve('crypto-browserify'),
            stream: require.resolve('stream-browserify'),
            util: require.resolve('util/'),
            vm: require.resolve('vm-browserify'),
            process: require.resolve('process/browser')
        }
    };

    // Add plugins to provide global variables
    config.plugins = [
        ...config.plugins, // Preserve existing plugins
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
            process: 'process/browser'
        })
    ];

    return config;
};