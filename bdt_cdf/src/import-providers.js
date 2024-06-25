const fs = require('fs-extra');
const os = require('os');
const path = require('path');
const appConfigPath = path.join(__dirname, '..', 'config', 'default.json');

function importProviders(providers) {
  const { port } = fs.readJSONSync(appConfigPath);
  const providerConfigs = fetchProviderConfigs(providers);

  // This config file must be written before provider modules are required
  const updatedAppConfig = Object.assign({ port }, ...providerConfigs);
  fs.writeJSONSync(appConfigPath, updatedAppConfig, {
    spaces: 2,
    EOL: os.EOL
  });

  return loadProviders(providers);
}

function fetchProviderConfigs(providerDirectories) {
  // loop over sub-directories
  return providerDirectories.map((modulePath) => {
    const providerConfigPath = path.join(modulePath, 'config', 'default.json');
    return fs.readJSONSync(providerConfigPath);
  });
}

function loadProviders(providerPaths) {
  return providerPaths.map((providerPath) => {
    return {
      instance: require(providerPath)
    };
  });
}

module.exports = importProviders;
