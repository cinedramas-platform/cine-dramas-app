import Constants from 'expo-constants';
import Purchases, {
  type CustomerInfo,
  type PurchasesOfferings,
  type PurchasesPackage,
  LOG_LEVEL,
} from 'react-native-purchases';

let initialized = false;

export async function initRevenueCat(userId: string): Promise<void> {
  if (initialized) return;

  const apiKey = Constants.expoConfig?.extra?.revenuecatApiKey;

  if (!apiKey) return;

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  await Purchases.configure({ apiKey, appUserID: userId });
  initialized = true;
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

export async function getOfferings(): Promise<PurchasesOfferings> {
  return Purchases.getOfferings();
}

export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export async function logOutRevenueCat(): Promise<void> {
  if (!initialized) return;
  try {
    await Purchases.logOut();
  } catch {
    // ignore if not configured
  }
  initialized = false;
}

export function hasPremiumEntitlement(info: CustomerInfo): boolean {
  return typeof info.entitlements.active['premium'] !== 'undefined';
}
