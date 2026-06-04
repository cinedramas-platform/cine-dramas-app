// T3.08 — Client structured logging.
//
// Leveled logger that (a) prints readable structured lines in dev and (b) feeds
// Sentry breadcrumbs so the events leading up to a crash ship with it. error()
// also reports to Sentry as an exception. A tenant/user context is attached to
// every line and kept in sync with the auth session (see setLogContext).
import { Sentry, isSentryEnabled, captureException } from '@/lib/sentry';

type Level = 'debug' | 'info' | 'warn' | 'error';

let ctx: { tenantId?: string; userId?: string } = {};

/** Keep log context in sync with the signed-in user (call on auth change). */
export function setLogContext(next: { tenantId?: string; userId?: string }): void {
  ctx = next;
}

function emit(level: Level, msg: string, extra?: Record<string, unknown>) {
  const fields = { ...ctx, ...(extra ?? {}) };

  if (__DEV__) {
    const tag = `[${level}]`;
    if (level === 'error') console.error(tag, msg, fields);
    else if (level === 'warn') console.warn(tag, msg, fields);
    else console.log(tag, msg, fields);
  }

  if (isSentryEnabled) {
    // Sentry severity uses 'warning', not 'warn'.
    Sentry.addBreadcrumb({
      level: level === 'warn' ? 'warning' : level,
      message: msg,
      data: fields,
    });
  }
}

export const logger = {
  debug: (msg: string, extra?: Record<string, unknown>) => emit('debug', msg, extra),
  info: (msg: string, extra?: Record<string, unknown>) => emit('info', msg, extra),
  warn: (msg: string, extra?: Record<string, unknown>) => emit('warn', msg, extra),
  /** Log + report an error to Sentry. */
  error: (msg: string, error?: unknown, extra?: Record<string, unknown>) => {
    emit('error', msg, { ...extra, error: error instanceof Error ? error.message : error });
    if (error !== undefined) captureException(error, { msg, ...ctx, ...extra });
  },
};
