#!/usr/bin/env node
/*
 * Postinstall: swap @expo/ngrok's bundled ngrok binary for a vendored v3 build.
 *
 * Why: @expo/ngrok@4.1.3 ships ngrok v2.3.41, but ngrok now rejects v2 agents
 * for free accounts (ERR_NGROK_121, min version 3.20.0). Without this swap
 * `expo start --tunnel` fails. Paired with patches/@expo+ngrok+4.1.3.patch,
 * which adapts @expo/ngrok's v2-shaped agent API payload to v3.
 *
 * Vendored binaries live in tools/ngrok/<platform>-<arch>/. Only platforms with
 * a vendored binary are swapped; others are left untouched (script is a no-op).
 * Safe to run repeatedly: skips when the bundled binary is already v3+.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const tag = '[ngrok-v3]';
const log = (m) => console.log(`${tag} ${m}`);

let bundled = null;
try {
  bundled = require('@expo/ngrok-bin');
} catch (e) {
  /* package not installed */
}
if (!bundled || !fs.existsSync(bundled)) {
  log('bundled ngrok binary not found, skipping');
  process.exit(0);
}

const platKey = `${process.platform}-${process.arch}`;
const exeName = process.platform === 'win32' ? 'ngrok.exe' : 'ngrok';
const vendored = path.join(__dirname, '..', 'tools', 'ngrok', platKey, exeName);
if (!fs.existsSync(vendored)) {
  log(`no vendored v3 binary for ${platKey}; leaving bundled binary as-is`);
  process.exit(0);
}

// Skip if the bundled binary is already v3 or newer.
try {
  const out = execFileSync(bundled, ['--version'], { encoding: 'utf8' });
  const m = out.match(/(\d+)\.(\d+)\.(\d+)/);
  if (m && parseInt(m[1], 10) >= 3) {
    log(`bundled binary already v${m[0]}, nothing to do`);
    process.exit(0);
  }
} catch (e) {
  // Version probe failed (e.g. unrunnable v2) — fall through and swap.
}

try {
  const backup = `${bundled}.v2bak`;
  if (!fs.existsSync(backup)) fs.copyFileSync(bundled, backup);
  fs.copyFileSync(vendored, bundled);
  log(`swapped bundled ngrok -> vendored v3 (${platKey})`);
} catch (e) {
  log(`failed to swap binary: ${e.message} (tunnel may not work)`);
  // Non-fatal: never break install over a dev-only tunnel helper.
}
