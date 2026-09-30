const { getDefaultConfig } = require('expo/metro-config');

// Expo SDK 54 configures monorepo watch folders and pnpm resolution automatically.
module.exports = getDefaultConfig(__dirname);
