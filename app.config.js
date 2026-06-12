const clientConfigs = require('./brands/index');

const variant = process.env.APP_VARIANT || 'default';
const brand = clientConfigs[variant] || clientConfigs['default'];

module.exports = ({ config }) => ({
  ...config,
  owner: process.env.EAS_OWNER || 'vassil_iliev',
  name: brand.appName,
  slug: brand.slug,
  version: '1.0.0',
  orientation: 'portrait',
  icon: brand.iconPath || './assets/icon.png',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  scheme: brand.slug,
  splash: {
    image: brand.splashPath || './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: brand.splashBackgroundColor,
  },
  ios: {
    bundleIdentifier: brand.ios.bundleId,
    supportsTablet: false,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: brand.android.packageName,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: brand.splashBackgroundColor,
    },
    edgeToEdgeEnabled: true,
  },
  web: {
    bundler: 'metro',
    // SPA — routes resolve client-side (auth-gated app; nothing meaningful to
    // prerender) and dynamic catalog ids need no generateStaticParams.
    output: 'single',
    favicon: './assets/favicon.png',
  },
  extra: {
    eas: { projectId: brand.easProjectId },
    supabaseUrl: brand.supabaseUrl,
    supabaseAnonKey: brand.supabaseAnonKey,
    muxEnvKey: brand.muxEnvKey,
    revenuecatApiKey: brand.revenuecatApiKey,
    sentryDsn: brand.sentryDsn,
    tenantId: brand.tenantId,
    brandId: variant,
    tagline: brand.tagline,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'react-native-video',
    'expo-font',
    [
      '@sentry/react-native/expo',
      {
        // Source-map upload only runs in CI when SENTRY_AUTH_TOKEN is set.
        organization: process.env.SENTRY_ORG,
        project: brand.sentryProject,
        url: 'https://sentry.io/',
      },
    ],
  ],
});
