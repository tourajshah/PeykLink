// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// fast-fix for react-i18next and other ESM libraries
config.resolver.sourceExts.push('mjs');
config.resolver.sourceExts.push('cjs');

module.exports = config;