import { createContext, useContext, useEffect } from 'react';
import { useConfigStore, type ThemeConfig } from '@/stores/configStore';

const defaultTheme: ThemeConfig = {
  primary: '#E50914',
  secondary: '#141414',
  accent: '#E50914',
  background: '#000000',
  text: '#FFFFFF',
  fontFamily: 'System',
};

const ThemeContext = createContext<ThemeConfig>(defaultTheme);

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const config = useConfigStore((s) => s.config);
  const loadCachedConfig = useConfigStore((s) => s.loadCachedConfig);
  const fetchConfig = useConfigStore((s) => s.fetchConfig);

  useEffect(() => {
    loadCachedConfig().then(() => fetchConfig());
  }, []);

  const theme = config?.theme ?? defaultTheme;

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
