const path = require('path');
const fs = require('fs-extra');
const klawSync = require('klaw-sync');
const config = require('config');
const Koop = require('../framework/core');

const routes = require('./routes');
const importPlugins = require('./import-plugins');

// plugins need to be imported before Koop instantiation
const providerPaths = fetchProviderModulePaths('../providers');
const plugins = importPlugins({
  providerPaths
});

// initiate a koop app
const koop = new Koop({ logLevel: 'info' });

// register koop plugins
plugins.forEach((plugin) => {
  koop.register(plugin.instance, plugin.options);
});

// add additional routes
routes.forEach((route) => {
  route.methods.forEach((method) => {
    koop.server[method](route.path, route.handler);
  });
});

// start the server
koop.server.listen(config.port, () => koop.log.info(`Server listening at ${config.port}`));

function fetchProviderModulePaths(relativePath) {
  // Path to providers directory
  const pathToProviders = path.join(__dirname, relativePath);

  if (fs.existsSync(pathToProviders)) {
    const providerDirectories = klawSync(pathToProviders, { nofile: true, depthLimit: 0 });
    return providerDirectories.map((item) => item.path);
  }

  return [];
}
