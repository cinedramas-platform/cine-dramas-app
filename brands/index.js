const defaultConfig = require('./default/manifest.json');
const clientAConfig = require('./clientA/manifest.json');

// Brand registry. Each entry merges the brand's manifest.json with the asset
// paths for that brand. APP_VARIANT selects the active entry at build time
// (see app.config.js). New brands: add a manifest.json + assets, register here,
// then run `npm run validate:brands`.
const configs = {
  default: {
    ...defaultConfig,
    iconPath: './assets/icon.png',
    splashPath: './assets/splash-icon.png',
  },
  clientA: {
    ...clientAConfig,
    iconPath: './assets/icon.png',
    splashPath: './assets/splash-icon.png',
  },
};

module.exports = configs;
