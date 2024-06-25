const importProviders = require('./import-providers');

function importPlugins({ providerPaths }) {
  const outputs = [];
  const auths = [];
  const caches = [];
  const providers = importProviders(providerPaths);

  return [...outputs, ...auths, ...caches, ...providers];
}

module.exports = importPlugins;
