import crypto from 'node:crypto';

const FUNCTION_URL = 'https://kkjjbjrebeoekindsihw.supabase.co/functions/v1/webhooks-mux';
const WEBHOOK_SECRET = 'test_webhook_secret_for_cd34';
const TEST_ASSET_ID = 'test-asset-webhook-cd34';

function signPayload(body, secret, timestampOverride) {
  const timestamp = timestampOverride ?? Math.floor(Date.now() / 1000);
  const payload = `${timestamp}.${body}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return { header: `t=${timestamp},v1=${signature}`, timestamp };
}

async function sendWebhook(body, headers = {}) {
  const res = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
  const data = await res.json();
  return { status: res.status, data };
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

console.log('\n=== Mux Webhook Handler Tests ===\n');

// --- AC 6: Invalid signatures return 401 ---

console.log('AC 6: Invalid signatures return 401, valid events return 200');

await test('Missing mux-signature header returns 401', async () => {
  const body = JSON.stringify({ id: 'test-no-sig', type: 'video.asset.ready', data: { id: 'x' } });
  const { status, data } = await sendWebhook(body);
  assert(status === 401, `Expected 401, got ${status}: ${JSON.stringify(data)}`);
});

await test('Wrong secret returns 401', async () => {
  const body = JSON.stringify({ id: 'test-wrong-secret', type: 'video.asset.ready', data: { id: 'x' } });
  const { header } = signPayload(body, 'wrong_secret');
  const { status, data } = await sendWebhook(body, { 'mux-signature': header });
  assert(status === 401, `Expected 401, got ${status}: ${JSON.stringify(data)}`);
});

// --- AC 2: Stale events rejected ---

console.log('\nAC 2: Stale events (outside timestamp tolerance) are rejected');

await test('Stale timestamp (10 min ago) returns 401', async () => {
  const body = JSON.stringify({ id: 'test-stale', type: 'video.asset.ready', data: { id: 'x' } });
  const staleTs = Math.floor(Date.now() / 1000) - 600;
  const { header } = signPayload(body, WEBHOOK_SECRET, staleTs);
  const { status, data } = await sendWebhook(body, { 'mux-signature': header });
  assert(status === 401, `Expected 401, got ${status}: ${JSON.stringify(data)}`);
});

// --- AC 1: Verifies HMAC-SHA256 signature ---

console.log('\nAC 1: Webhook endpoint verifies Mux HMAC-SHA256 signature');

await test('Valid signature is accepted (unsupported event type, returns 200)', async () => {
  const body = JSON.stringify({
    id: 'test-event-unsupported-001',
    type: 'video.upload.created',
    created_at: new Date().toISOString(),
    data: { id: 'some-upload' },
  });
  const { header } = signPayload(body, WEBHOOK_SECRET);
  const { status, data } = await sendWebhook(body, { 'mux-signature': header });
  assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
  assert(data.status === 'ignored', `Expected ignored, got ${data.status}`);
});

// --- AC 4: video.asset.ready updates episode ---

console.log('\nAC 4: video.asset.ready updates episode with playback_id, duration, ready status');

await test('video.asset.ready processes and returns 200', async () => {
  const body = JSON.stringify({
    id: 'test-event-ready-001',
    type: 'video.asset.ready',
    created_at: new Date().toISOString(),
    data: {
      id: TEST_ASSET_ID,
      status: 'ready',
      playback_ids: [{ id: 'test-playback-id-from-webhook', policy: 'signed' }],
      duration: 125.7,
    },
  });
  const { header } = signPayload(body, WEBHOOK_SECRET);
  const { status, data } = await sendWebhook(body, { 'mux-signature': header });
  assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
  assert(data.status === 'processed', `Expected processed, got ${data.status}`);
});

// --- AC 3: Duplicate events safely ignored ---

console.log('\nAC 3: Duplicate events are safely ignored (idempotency)');

await test('Same event ID returns already_processed', async () => {
  const body = JSON.stringify({
    id: 'test-event-ready-001',
    type: 'video.asset.ready',
    created_at: new Date().toISOString(),
    data: {
      id: TEST_ASSET_ID,
      status: 'ready',
      playback_ids: [{ id: 'test-playback-id-from-webhook', policy: 'signed' }],
      duration: 125.7,
    },
  });
  const { header } = signPayload(body, WEBHOOK_SECRET);
  const { status, data } = await sendWebhook(body, { 'mux-signature': header });
  assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
  assert(data.status === 'already_processed', `Expected already_processed, got ${data.status}`);
});

// --- AC 5: video.asset.errored marks episode ---

console.log('\nAC 5: video.asset.errored marks episode as errored with error details');

await test('video.asset.errored processes and returns 200', async () => {
  const body = JSON.stringify({
    id: 'test-event-errored-001',
    type: 'video.asset.errored',
    created_at: new Date().toISOString(),
    data: {
      id: TEST_ASSET_ID,
      status: 'errored',
      errors: [{ type: 'invalid_input', message: 'Unsupported codec' }],
    },
  });
  const { header } = signPayload(body, WEBHOOK_SECRET);
  const { status, data } = await sendWebhook(body, { 'mux-signature': header });
  assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
  assert(data.status === 'processed', `Expected processed, got ${data.status}`);
});

console.log('\n=== All tests complete ===\n');
