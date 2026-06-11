import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_500Medium_Italic,
  PlayfairDisplay_600SemiBold,
} from '@expo-google-fonts/playfair-display';
import {
  Geist_300Light,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import {
  GeistMono_400Regular,
  GeistMono_500Medium,
} from '@expo-google-fonts/geist-mono';
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { useAuthStore } from '@/stores/authStore';
import { Colors } from '@/constants/theme';
import { initSentry, setUserContext, Sentry } from '@/lib/sentry';
import { setLogContext } from '@/lib/logger';
import { setupNetworkMonitor } from '@/lib/network';

// Initialise crash reporting before anything renders. No-ops without a DSN.
initSentry();
// Bridge connectivity into React Query + replay queued writes on reconnect.
setupNetworkMonitor();

function NavigationLayout() {
  const { isLoading, hydrate, user } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Keep Sentry's user/tenant tags in sync with the auth session.
  useEffect(() => {
    setUserContext(user ? { id: user.id, tenantId: user.tenantId } : null);
    setLogContext(user ? { userId: user.id, tenantId: user.tenantId } : {});
  }, [user]);

  useProtectedRoute();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.bg }}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.ink,
        contentStyle: { backgroundColor: Colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="series/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="player/[episodeId]" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="paywall" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="coins" options={{ headerShown: false }} />
      <Stack.Screen name="unlock" options={{ headerShown: false, presentation: 'modal' }} />
    </Stack>
  );
}

function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_500Medium_Italic,
    PlayfairDisplay_600SemiBold,
    Geist_300Light,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryProvider>
          <ThemeProvider>
            <StatusBar style="light" />
            <NavigationLayout />
          </ThemeProvider>
        </QueryProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

// Sentry.wrap adds navigation + render performance instrumentation.
// Transparent passthrough when Sentry is disabled.
export default Sentry.wrap(RootLayout);
