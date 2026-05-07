import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { CustomerInfo, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import {
  initRevenueCat,
  getCustomerInfo,
  getOfferings,
  purchasePackage,
  restorePurchases,
  hasPremiumEntitlement,
  logOutRevenueCat,
} from '@/services/revenuecat';
import { invokeFunction } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import type { EntitlementResponse } from '@/types/entitlements';

export function useEntitlements() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user?.id) {
      initRevenueCat(user.id);
    }
    return () => {
      logOutRevenueCat();
    };
  }, [user?.id]);

  const serverQuery = useQuery<EntitlementResponse>({
    queryKey: ['entitlements', user?.id],
    queryFn: () => invokeFunction<EntitlementResponse>('user-entitlements'),
    enabled: !!user,
    staleTime: 60_000,
  });

  const customerQuery = useQuery<CustomerInfo>({
    queryKey: ['revenuecat-customer', user?.id],
    queryFn: getCustomerInfo,
    enabled: !!user,
    staleTime: 60_000,
    retry: false,
  });

  const hasPremium =
    serverQuery.data?.is_active ||
    (customerQuery.data ? hasPremiumEntitlement(customerQuery.data) : false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['entitlements'] });
    queryClient.invalidateQueries({ queryKey: ['revenuecat-customer'] });
  };

  return {
    hasPremium,
    tier: serverQuery.data?.tier ?? 'free',
    expiresAt: serverQuery.data?.expires_at ?? null,
    isLoading: serverQuery.isLoading,
    customerInfo: customerQuery.data ?? null,
    invalidate,
  };
}

export function useOfferings() {
  const user = useAuthStore((s) => s.user);

  return useQuery<PurchasesOfferings>({
    queryKey: ['revenuecat-offerings'],
    queryFn: getOfferings,
    enabled: !!user,
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function usePurchase() {
  const queryClient = useQueryClient();

  const purchase = async (pkg: PurchasesPackage): Promise<CustomerInfo> => {
    const info = await purchasePackage(pkg);
    queryClient.invalidateQueries({ queryKey: ['entitlements'] });
    queryClient.invalidateQueries({ queryKey: ['revenuecat-customer'] });
    return info;
  };

  const restore = async (): Promise<CustomerInfo> => {
    const info = await restorePurchases();
    queryClient.invalidateQueries({ queryKey: ['entitlements'] });
    queryClient.invalidateQueries({ queryKey: ['revenuecat-customer'] });
    return info;
  };

  return { purchase, restore };
}
