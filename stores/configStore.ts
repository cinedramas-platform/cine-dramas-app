import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { invokeFunction } from '@/services/api';

const STORAGE_KEY = 'CINEDRAMAS_TENANT_CONFIG';

export type ThemeConfig = {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  fontFamily: string;
};

export type FeatureFlags = {
  auth_required: boolean;
  downloads_enabled: boolean;
  offline_mode: boolean;
  ads_enabled: boolean;
};

export type LegalUrls = {
  terms_of_service: string;
  privacy_policy: string;
  support: string;
};

export type TenantConfig = {
  tenant_id: string;
  name: string;
  theme: ThemeConfig;
  features: FeatureFlags;
  legal_urls: LegalUrls;
  home_rails_order: string[];
};

type ConfigState = {
  config: TenantConfig | null;
  isLoaded: boolean;
  isError: boolean;
  loadCachedConfig: () => Promise<void>;
  fetchConfig: () => Promise<void>;
};

export const useConfigStore = create<ConfigState>((set, get) => ({
  config: null,
  isLoaded: false,
  isError: false,

  loadCachedConfig: async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        set({ config: JSON.parse(cached), isLoaded: true });
      }
    } catch {
      // Cache miss is not an error
    }
  },

  fetchConfig: async () => {
    const tenantId = Constants.expoConfig?.extra?.tenantId;
    if (!tenantId) {
      set({ isError: true });
      return;
    }

    try {
      const config = await invokeFunction<TenantConfig>('config', { tenantId });
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      set({ config, isLoaded: true, isError: false });
    } catch {
      if (!get().config) {
        set({ isError: true });
      }
    }
  },
}));
