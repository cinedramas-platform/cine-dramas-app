// T3.10 — RLS isolation tests.
//
// Integration test: runs against the LOCAL Supabase Postgres (`supabase start`).
// Two users in two tenants are impersonated by setting the `authenticated` role +
// `request.jwt.claims`, exactly how PostgREST runs queries for a logged-in user.
// Asserts tenant/user isolation on the payment tables (wallets, coin_transactions,
// episode_unlocks) plus entitlements, watch_progress, and series.
//
// Requires the local stack running. If the DB is unreachable the suite SKIPS (so
// `npm test` stays green in environments without a DB). CI that wants to enforce
// RLS should run `supabase start` first so these execute for real.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';

const DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

// A seeded episode (dev-tenant) used to satisfy FK on episode_unlocks / watch_progress.
const SEED_EPISODE_ID = 'c1111111-0001-0001-0001-000000000001';

const A = {
  tenant: 'rls-tenant-a',
  userId: randomUUID(),
  authId: randomUUID(),
  seriesId: randomUUID(),
};
const B = {
  tenant: 'rls-tenant-b',
  userId: randomUUID(),
  authId: randomUUID(),
  seriesId: randomUUID(),
};

let client: Client;
let dbAvailable = false;

function claims(u: typeof A) {
  return JSON.stringify({ sub: u.authId, tenant_id: u.tenant, role: 'authenticated' });
}

/** Run `fn` as the given user (authenticated role + jwt claims) inside a rolled-back tx. */
async function asUser<T>(u: typeof A, fn: () => Promise<T>): Promise<T> {
  await client.query('BEGIN');
  try {
    await client.query('SET LOCAL ROLE authenticated');
    await client.query("SELECT set_config('request.jwt.claims', $1, true)", [claims(u)]);
    return await fn();
  } finally {
    await client.query('ROLLBACK'); // discards role/claims + any writes
  }
}

async function countAs(u: typeof A, sql: string, params: unknown[]): Promise<number> {
  return asUser(u, async () => {
    const res = await client.query(sql, params);
    return Number(res.rows[0].count);
  });
}

/** Like `it`, but skips when the local DB isn't available. */
const dbit = (name: string, fn: () => Promise<void>) =>
  it(name, async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    await fn();
  });

beforeAll(async () => {
  client = new Client({ connectionString: DB_URL });
  try {
    await client.connect();
    dbAvailable = true;
  } catch (e) {
    console.warn(
      `[rls.test] Skipping — local Supabase DB unreachable at ${DB_URL}. Run \`supabase start\`. (${(e as Error).message})`,
    );
    return;
  }

  // Fixtures (as superuser — bypasses RLS).
  for (const t of [A, B]) {
    await client.query(
      `INSERT INTO tenants (id, name, mode, status, mux_env_key, revenuecat_api_key)
       VALUES ($1, $2, 'silo', 'active', 'test', 'test')
       ON CONFLICT (id) DO NOTHING`,
      [t.tenant, t.tenant],
    );
    await client.query(
      `INSERT INTO users (id, tenant_id, auth_id, email) VALUES ($1, $2, $3, $4)`,
      [t.userId, t.tenant, t.authId, `${t.tenant}@test.local`],
    );
    await client.query(
      `INSERT INTO series (id, tenant_id, title, category, status)
       VALUES ($1, $2, $3, 'drama', 'published')`,
      [t.seriesId, t.tenant, `${t.tenant} series`],
    );
    await client.query(
      `INSERT INTO wallets (tenant_id, user_id, coin_balance, bonus_balance) VALUES ($1, $2, 100, 5)`,
      [t.tenant, t.userId],
    );
    await client.query(
      `INSERT INTO coin_transactions (tenant_id, user_id, amount, bonus_amount, kind, balance_after, bonus_after)
       VALUES ($1, $2, 100, 0, 'purchase', 100, 5)`,
      [t.tenant, t.userId],
    );
    await client.query(
      `INSERT INTO episode_unlocks (tenant_id, user_id, episode_id, coins_spent) VALUES ($1, $2, $3, 80)`,
      [t.tenant, t.userId, SEED_EPISODE_ID],
    );
    await client.query(
      `INSERT INTO entitlements (tenant_id, user_id, tier) VALUES ($1, $2, 'premium')`,
      [t.tenant, t.userId],
    );
    await client.query(
      `INSERT INTO watch_progress (tenant_id, user_id, episode_id, position_seconds, completed)
       VALUES ($1, $2, $3, 42, false)`,
      [t.tenant, t.userId, SEED_EPISODE_ID],
    );
  }
});

afterAll(async () => {
  if (!client) return;
  if (!dbAvailable) {
    await client.end().catch(() => {});
    return;
  }
  // Deleting users cascades all user-scoped rows (ON DELETE CASCADE).
  await client.query(`DELETE FROM users WHERE tenant_id = ANY($1)`, [[A.tenant, B.tenant]]);
  await client.query(`DELETE FROM series WHERE tenant_id = ANY($1)`, [[A.tenant, B.tenant]]);
  await client.query(`DELETE FROM tenants WHERE id = ANY($1)`, [[A.tenant, B.tenant]]);
  await client.end();
});

describe('RLS: payment tables are user-isolated', () => {
  dbit("User A sees own wallet but not User B's", async () => {
    expect(await countAs(A, `SELECT count(*) FROM wallets WHERE user_id = $1`, [A.userId])).toBe(1);
    expect(await countAs(A, `SELECT count(*) FROM wallets WHERE user_id = $1`, [B.userId])).toBe(0);
  });

  dbit('User A cannot see User B coin_transactions', async () => {
    expect(
      await countAs(A, `SELECT count(*) FROM coin_transactions WHERE user_id = $1`, [B.userId]),
    ).toBe(0);
    expect(
      await countAs(A, `SELECT count(*) FROM coin_transactions WHERE user_id = $1`, [A.userId]),
    ).toBe(1);
  });

  dbit('User A cannot see User B episode_unlocks', async () => {
    expect(
      await countAs(A, `SELECT count(*) FROM episode_unlocks WHERE user_id = $1`, [B.userId]),
    ).toBe(0);
    expect(
      await countAs(A, `SELECT count(*) FROM episode_unlocks WHERE user_id = $1`, [A.userId]),
    ).toBe(1);
  });
});

describe('RLS: existing user/tenant tables', () => {
  dbit('User A cannot read User B entitlement', async () => {
    expect(
      await countAs(A, `SELECT count(*) FROM entitlements WHERE user_id = $1`, [B.userId]),
    ).toBe(0);
  });

  dbit('User A cannot read User B watch_progress', async () => {
    expect(
      await countAs(A, `SELECT count(*) FROM watch_progress WHERE user_id = $1`, [B.userId]),
    ).toBe(0);
  });

  dbit('User A sees only own-tenant series', async () => {
    expect(await countAs(A, `SELECT count(*) FROM series WHERE id = $1`, [A.seriesId])).toBe(1);
    expect(await countAs(A, `SELECT count(*) FROM series WHERE id = $1`, [B.seriesId])).toBe(0);
  });
});

describe('RLS: writes are blocked', () => {
  dbit('User A cannot insert watch_progress for another tenant', async () => {
    await expect(
      asUser(A, () =>
        client.query(
          `INSERT INTO watch_progress (tenant_id, user_id, episode_id, position_seconds, completed)
           VALUES ($1, $2, $3, 0, false)`,
          [B.tenant, A.userId, SEED_EPISODE_ID],
        ),
      ),
    ).rejects.toThrow();
  });

  dbit('User A cannot directly insert into wallets (no client insert policy)', async () => {
    await expect(
      asUser(A, () =>
        client.query(
          `INSERT INTO wallets (tenant_id, user_id, coin_balance) VALUES ($1, $2, 999999)`,
          [A.tenant, A.userId],
        ),
      ),
    ).rejects.toThrow();
  });
});
