const FUNCTION_URL = 'https://kkjjbjrebeoekindsihw.supabase.co/functions/v1/config';

async function sendRequest(params = {}) {
  const url = new URL(FUNCTION_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString());
  const data = await res.json();
  return { status: res.status, headers: res.headers, data };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  PASS: ${name}`);
  } catch (err) {
    console.log(`  FAIL: ${name}`);
    console.log(`        ${err.message}`);
    process.exitCode = 1;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

console.log('\n=== Config Service Tests ===\n');

// --- AC 1: Returns tenant config ---

console.log('AC 1: GET /config/:tenantId returns theme, features, legal links, rails order');

await test('Valid tenant returns all config fields', async () => {
  const { status, data } = await sendRequest({ tenantId: 'dev-tenant' });
  assert(status === 200, `Expected 200, got ${status}`);
  assert(data.tenant_id === 'dev-tenant', `Wrong tenant_id: ${data.tenant_id}`);
  assert(data.name, 'Missing name');
  assert(data.theme && data.theme.primary, 'Missing theme.primary');
  assert(data.theme.background, 'Missing theme.background');
  assert(data.theme.text, 'Missing theme.text');
  assert(data.theme.fontFamily, 'Missing theme.fontFamily');
  assert(data.features && typeof data.features.auth_required === 'boolean', 'Missing features.auth_required');
  assert(data.legal_urls && data.legal_urls.terms_of_service, 'Missing legal_urls.terms_of_service');
  assert(data.legal_urls.privacy_policy, 'Missing legal_urls.privacy_policy');
  assert(Array.isArray(data.home_rails_order), 'home_rails_order is not an array');
  assert(data.home_rails_order.length > 0, 'home_rails_order is empty');
});

// --- AC 2: Cache-Control header ---

console.log('\nAC 2: Response includes Cache-Control: 600s header');

await test('Cache-Control header is set to 600s', async () => {
  const { headers } = await sendRequest({ tenantId: 'dev-tenant' });
  const cc = headers.get('cache-control');
  assert(cc, 'Missing Cache-Control header');
  assert(cc.includes('max-age=600'), `Expected max-age=600, got: ${cc}`);
  assert(cc.includes('stale-while-revalidate=120'), `Expected swr=120, got: ${cc}`);
});

// --- AC 6: Invalid tenant returns 404 ---

console.log('\nAC 6: Invalid tenant ID returns 404');

await test('Nonexistent tenant returns 404', async () => {
  const { status, data } = await sendRequest({ tenantId: 'nonexistent-tenant' });
  assert(status === 404, `Expected 404, got ${status}`);
  assert(data.error === 'Tenant not found', `Wrong error: ${data.error}`);
});

await test('Missing tenantId returns 400', async () => {
  const { status, data } = await sendRequest({});
  assert(status === 400, `Expected 400, got ${status}`);
});

console.log('\n=== All tests complete ===\n');
