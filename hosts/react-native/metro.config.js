const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [path.resolve(__dirname, '../../.runtime/sdk/react-native')],
  resolver: {nodeModulesPaths: [path.join(__dirname, 'node_modules')], disableHierarchicalLookup: true},
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
