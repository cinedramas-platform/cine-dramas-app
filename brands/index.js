const defaultConfig = require('./default/manifest.json');

const configs = {
  default: {
    ...defaultConfig,
    iconPath: './brands/default/icon.png',
    splashPath: './brands/default/splash.png',
  },
};

module.exports = configs;
