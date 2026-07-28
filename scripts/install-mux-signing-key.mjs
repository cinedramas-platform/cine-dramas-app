#!/usr/bin/env node
// Installs a Mux signing key into `tenants.mux_signing_key_id` /
// `tenants.mux_signing_private_key`, the per-tenant storage the
// playback-token function reads (see supabase/functions/_shared/mux-jwt.ts).
//
// Storage format: the base64 body of the PKCS#1 DER — i.e. the .pem file with
// its `-----BEGIN/END RSA PRIVATE KEY-----` lines and newlines stripped.
// mux-jwt.ts re-wraps it into PKCS#8 before signing.
//
// Usage:
//   node scripts/install-mux-signing-key.mjs \
//     --pem ~/Downloads/mux-signing-key-<KEY_ID>.pem \
//     --tenant dev-tenant \
//     [--key-id <KEY_ID>]        # defaults to the id parsed from the filename
//     [--out /tmp/rotate.sql]    # write SQL here instead of applying
//
// With SUPABASE_DB_URL set it applies the UPDATE directly via psql; otherwise it
// writes a .sql file for you to run in the Supabase SQL editor.
//
// The key material is never printed to stdout. Delete the generated .sql (and
// the downloaded .pem) once applied.

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : undefined;
};

const pemPath = flag('pem');
const tenant = flag('tenant');
const outPath = flag('out');

if (!pemPath || !tenant) {
  console.error('Usage: --pem <file.pem> --tenant <tenant_id> [--key-id <id>] [--out <file.sql>]');
  process.exit(1);
}

const keyId = flag('key-id') ?? basename(pemPath).replace(/^mux-signing-key-/, '').replace(/\.pem$/, '');
if (!keyId || keyId === basename(pemPath)) {
  console.error('Could not derive the key id from the filename — pass --key-id explicitly.');
  process.exit(1);
}

const pem = readFileSync(pemPath, 'utf8');
if (!/-----BEGIN RSA PRIVATE KEY-----/.test(pem)) {
  console.error('Not a PKCS#1 PEM ("BEGIN RSA PRIVATE KEY"). Mux signing keys download in this format.');
  process.exit(1);
}

const body = pem
  .replace(/-----BEGIN RSA PRIVATE KEY-----/, '')
  .replace(/-----END RSA PRIVATE KEY-----/, '')
  .replace(/\s+/g, '');

if (!/^[A-Za-z0-9+/=]+$/.test(body)) {
  console.error('PEM body is not clean base64 after stripping headers.');
  process.exit(1);
}

console.log(`key id : ${keyId}`);
console.log(`tenant : ${tenant}`);
console.log(`key material: ${body.length} base64 chars (not printed)`);

// Single-quoted SQL literal; base64 cannot contain a quote, and it is validated
// above, so no escaping is needed.
const sql = `UPDATE public.tenants
   SET mux_signing_key_id = '${keyId}',
       mux_signing_private_key = '${body}',
       updated_at = NOW()
 WHERE id = '${tenant}';
`;

if (process.env.SUPABASE_DB_URL && !outPath) {
  execFileSync('psql', [process.env.SUPABASE_DB_URL, '-v', 'ON_ERROR_STOP=1', '-c', sql], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  console.log('Applied via psql.');
} else {
  const target = outPath ?? 'mux-signing-key-rotate.sql';
  writeFileSync(target, sql, { mode: 0o600 });
  console.log(`Wrote SQL to ${target} (chmod 600) — run it in the Supabase SQL editor, then delete it.`);
}
