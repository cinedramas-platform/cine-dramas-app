// T3.08 — Structured logging for edge functions.
//
// Emits one-line JSON to stdout (picked up by Supabase log drains). Every line
// carries the fields the API conventions require: timestamp, level, tenant_id,
// user_id, request_id, endpoint, method — plus status_code / latency_ms /
// cache_status on the per-request access line.
//
// Usage:
//   serve('unlock-episode', async (req, log) => {
//     ...resolve user...
//     log.setUser(user.id, tenantId);   // enriches all subsequent lines
//     log.info('unlock attempt', { episodeId });
//     return jsonResponse(data);        // access line emitted automatically
//   });

type Level = 'debug' | 'info' | 'warn' | 'error';

export type Logger = {
  /** Attach the resolved user + tenant to all subsequent lines (incl. access log). */
  setUser: (userId: string | null, tenantId: string | null) => void;
  /** Mark how the response was served, for the access line. */
  setCacheStatus: (status: 'HIT' | 'MISS' | 'BYPASS') => void;
  /** Per-request id (from X-Request-ID or generated). */
  readonly requestId: string;
  debug: (msg: string, extra?: Record<string, unknown>) => void;
  info: (msg: string, extra?: Record<string, unknown>) => void;
  warn: (msg: string, extra?: Record<string, unknown>) => void;
  error: (msg: string, extra?: Record<string, unknown>) => void;
};

type LoggerInternal = Logger & {
  _access: (statusCode: number, latencyMs: number) => void;
};

function makeLogger(fnName: string, method: string, requestId: string): LoggerInternal {
  let userId: string | null = null;
  let tenantId: string | null = null;
  let cacheStatus: 'HIT' | 'MISS' | 'BYPASS' = 'BYPASS';

  const base = () => ({
    timestamp: new Date().toISOString(),
    request_id: requestId,
    endpoint: fnName,
    method,
    tenant_id: tenantId,
    user_id: userId,
  });

  const emit = (level: Level, msg: string, extra?: Record<string, unknown>) => {
    const line = { level, msg, ...base(), ...(extra ?? {}) };
    const out = JSON.stringify(line);
    if (level === 'error') console.error(out);
    else if (level === 'warn') console.warn(out);
    else console.log(out);
  };

  return {
    requestId,
    setUser: (u, t) => {
      userId = u;
      tenantId = t;
    },
    setCacheStatus: (s) => {
      cacheStatus = s;
    },
    debug: (msg, extra) => emit('debug', msg, extra),
    info: (msg, extra) => emit('info', msg, extra),
    warn: (msg, extra) => emit('warn', msg, extra),
    error: (msg, extra) => emit('error', msg, extra),
    _access: (statusCode, latencyMs) => {
      const level: Level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
      emit(level, 'request', {
        status_code: statusCode,
        latency_ms: latencyMs,
        cache_status: cacheStatus,
      });
    },
  };
}

/**
 * Wrap a Deno.serve handler with structured request logging.
 * The handler receives the request and a per-request Logger; the access line
 * (status_code + latency_ms + cache_status) is emitted automatically after it
 * returns, and uncaught errors are logged + turned into a 500.
 */
export function serve(
  fnName: string,
  handler: (req: Request, log: Logger) => Promise<Response>,
): void {
  Deno.serve(async (req) => {
    const start = performance.now();
    const requestId = req.headers.get('X-Request-ID') ?? crypto.randomUUID();
    const log = makeLogger(fnName, req.method, requestId);

    try {
      const res = await handler(req, log);
      log._access(res.status, Math.round(performance.now() - start));
      // Echo the request id so clients/Cloudflare can correlate.
      res.headers.set('X-Request-ID', requestId);
      return res;
    } catch (err) {
      log.error('unhandled exception', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      log._access(500, Math.round(performance.now() - start));
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'X-Request-ID': requestId },
      });
    }
  });
}
