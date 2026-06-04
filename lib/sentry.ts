// T3.07 — Sentry crash reporting with tenant tags.
//
// Wrapper around @sentry/react-native. Init is DSN-guarded: when the brand
// manifest ships no `sentryDsn` (dev/local), every export below is a safe no-op
// so the app runs identically without a Sentry project. Every event is tagged
// with the build-time tenant (from app.config `extra`) and, once a user signs
// in, the runtime tenant from their JWT — so crashes are filterable per tenant.
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';

const extra = Constants.expoConfig?.extra ?? {};
const dsn: string = extra.sentryDsn ?? '';
const buildTenantId: string = extra.tenantId ?? 'unknown';
const brandId: string = extra.brandId ?? 'unknown';

/** True only when a DSN is configured for this brand build. */
export const isSentryEnabled = dsn.length > 0;

/**
 * Initialise Sentry. Call once, as early as possible (before the root renders).
 * No-ops when the brand has no DSN.
 */
export function initSentry(): void {
  if (!isSentryEnabled) return;

  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    // Performance tracing: sample modestly in prod, fully in dev.
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Don't send PII automatically; we set user context explicitly below.
    sendDefaultPii: false,
  });

  // Build-time tenant is known immediately; refined on sign-in.
  Sentry.setTag('tenant_id', buildTenantId);
  Sentry.setTag('brand_id', brandId);
}

/**
 * Attach the signed-in user + their JWT tenant to all subsequent events.
 * The runtime tenant_id overrides the build-time tag (matters on Hub builds
 * where one app serves multiple tenants).
 */
export function setUserContext(user: { id: string; tenantId: string } | null): void {
  if (!isSentryEnabled) return;

  if (!user) {
    Sentry.setUser(null);
    Sentry.setTag('tenant_id', buildTenantId);
    return;
  }

  Sentry.setUser({ id: user.id });
  if (user.tenantId) {
    Sentry.setTag('tenant_id', user.tenantId);
  }
}

/** Manually report a caught error with optional structured context. */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!isSentryEnabled) {
    if (__DEV__) console.error('[sentry:disabled]', error, context);
    return;
  }
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export { Sentry };
