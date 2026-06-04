#!/usr/bin/env node
// T3.01 — Brand manifest validator.
//
// Validates every registered brand against brands/manifest.schema.json, checks
// that its referenced icon/splash assets exist and have the right dimensions,
// and guards against collisions (duplicate slug / bundleId / package) that would
// break a white-label build. Exits non-zero on any failure so CI can gate on it.
//
//   npm run validate:brands
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import Ajv from 'ajv';

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ICON_SIZE = 1024; // square icon required by both stores.
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Read a PNG's dimensions from its IHDR chunk. Returns null if not a valid PNG. */
function pngSize(buf) {
  if (buf.length < 24 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const schema = JSON.parse(readFileSync(join(root, 'brands/manifest.schema.json'), 'utf8'));
const configs = require(join(root, 'brands/index.js'));

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(schema);

const errors = [];
const seen = { slug: new Map(), bundleId: new Map(), packageName: new Map() };

function checkUnique(field, value, brand) {
  const prior = seen[field].get(value);
  if (prior) errors.push(`[${brand}] duplicate ${field} "${value}" — also used by [${prior}]`);
  else seen[field].set(value, brand);
}

function checkAsset(brand, label, relPath, { square } = {}) {
  if (!relPath) {
    errors.push(`[${brand}] missing ${label} path in brands/index.js`);
    return;
  }
  const abs = join(root, relPath);
  if (!existsSync(abs)) {
    errors.push(`[${brand}] ${label} not found: ${relPath}`);
    return;
  }
  const size = pngSize(readFileSync(abs));
  if (!size) {
    errors.push(`[${brand}] ${label} is not a valid PNG: ${relPath}`);
    return;
  }
  if (square && (size.width !== ICON_SIZE || size.height !== ICON_SIZE)) {
    errors.push(
      `[${brand}] ${label} must be ${ICON_SIZE}x${ICON_SIZE}, got ${size.width}x${size.height}: ${relPath}`,
    );
  }
}

const brands = Object.keys(configs);
if (brands.length === 0) errors.push('No brands registered in brands/index.js');

for (const brand of brands) {
  const cfg = configs[brand];

  if (!validate(cfg)) {
    for (const e of validate.errors) {
      // ajv v6 exposes dataPath; newer majors use instancePath.
      const path = e.dataPath || e.instancePath || '(root)';
      errors.push(`[${brand}] schema: ${path} ${e.message}`);
    }
  }

  checkUnique('slug', cfg.slug, brand);
  checkUnique('bundleId', cfg.ios?.bundleId, brand);
  checkUnique('packageName', cfg.android?.packageName, brand);

  checkAsset(brand, 'icon', cfg.iconPath, { square: true });
  checkAsset(brand, 'splash', cfg.splashPath);
}

if (errors.length > 0) {
  console.error(`\n✖ Brand validation failed (${errors.length}):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('');
  process.exit(1);
}

console.log(`✓ ${brands.length} brand(s) valid: ${brands.join(', ')}`);
