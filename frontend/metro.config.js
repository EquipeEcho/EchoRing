const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Keep the local development server responsive alongside Docker and the editor.
config.maxWorkers = 2;

module.exports = config;
