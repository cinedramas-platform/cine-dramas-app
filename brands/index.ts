import defaultConfig from './default/manifest.json';

interface BrandConfig {
  appName: string;
  slug: string;
  tenantId: string;
  ios: { bundleId: string };
  android: { packageName: string };
  supabaseUrl: string;
  supabaseAnonKey: string;
  muxEnvKey: string;
  revenuecatApiKey: string;
  sentryDsn: string;
  sentryProject: string;
  easProjectId: string;
  splashBackgroundColor: string;
  iconPath?: string;
  splashPath?: string;
}

const configs: Record<string, BrandConfig> = {
  default: {
    ...defaultConfig,
    iconPath: './brands/default/icon.png',
    splashPath: './brands/default/splash.png',
  },
};

export default configs;
