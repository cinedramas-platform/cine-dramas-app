import { useEffect, useState } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/authStore';

const ONBOARDED_KEY = 'cinedramas_has_onboarded';

let _onOnboardedChange: ((val: boolean) => void) | null = null;

export async function markOnboarded() {
  await AsyncStorage.setItem(ONBOARDED_KEY, '1');
  _onOnboardedChange?.(true);
}

export function useProtectedRoute() {
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    _onOnboardedChange = setHasOnboarded;
    AsyncStorage.getItem(ONBOARDED_KEY).then((val) => {
      setHasOnboarded(val === '1');
    });
    return () => {
      _onOnboardedChange = null;
    };
  }, []);

  useEffect(() => {
    if (!navigationState?.key) return;
    if (isLoading || hasOnboarded === null) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';

    if (!hasOnboarded && !inOnboarding) {
      router.replace('/onboarding');
      return;
    }

    if (hasOnboarded && !isAuthenticated && !inAuthGroup && !inOnboarding) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, isLoading, hasOnboarded, segments, router, navigationState?.key]);
}
