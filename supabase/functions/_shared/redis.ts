const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

async function redisCommand(command: unknown[]): Promise<unknown> {
  if (!redisUrl || !redisToken) return null;

  const res = await fetch(redisUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${redisToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  const data = await res.json();
  return data.result;
}

export async function cacheGet(key: string): Promise<string | null> {
  try {
    const result = await redisCommand(['GET', key]);
    return result as string | null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  try {
    await redisCommand(['SET', key, value, 'EX', ttlSeconds]);
  } catch {
    // Cache write failure is non-fatal
  }
}
