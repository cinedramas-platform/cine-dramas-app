const defaultConfig = require('./default/manifest.json');

const configs = {
  default: {
    ...defaultConfig,
    iconPath: './assets/icon.png',
    splashPath: './assets/splash-icon.png',
  },
};

module.exports = configs;
