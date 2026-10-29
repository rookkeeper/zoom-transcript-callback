import test from 'node:test';
import assert from 'node:assert/strict';
import { TranscriptState } from '../state.mjs';
import { validateServerUrl, verifyWebhook, signature } from '../security.mjs';

test('webhook signature authenticates exact raw bytes and rejects stale/future/malformed input', () => {
  const raw = Buffer.from('{"fake":true}');
  const sig = signature('fake-secret', '1000', raw);
  assert.equal(verifyWebhook('fake-secret', '1000', sig, raw, 1000), true);
  for (const [ts, s, bytes] of [['1000', sig, Buffer.from('{}')], ['1000', 'v0=oops', raw], ['bad', sig, raw], ['600', sig, raw], ['1400', sig, raw]]) {
    assert.equal(verifyWebhook('fake-secret', ts, s, bytes, 1000), false);
  }
});

test('Zoom WS URL validation refuses SSRF, credentials, redirects-to-lookalikes and insecure schemes', () => {
  assert.equal(validateServerUrl('wss://rtms.zoom.us/path?x=y'), 'wss://rtms.zoom.us/path?x=y');
  for (const url of ['ws://rtms.zoom.us', 'wss://127.0.0.1', 'wss://zoom.us.evil.test', 'wss://evilzoom.us', 'wss://user:secret@rtms.zoom.us', 'wss://rtms.zoom.us:444', 'wss://rtms.zoom.us/#x', null, 'invalid']) {
    assert.throws(() => validateServerUrl(url), /Invalid RTMS server/);
  }
});

test('state rejects malformed data, deduplicates, bounds retention and clears only on a new meeting', () => {
  const state = new TranscriptState({ maxRows: 2, maxBytes: 500 });
  state.begin('a');
  const row = (n) => ({ user_id: 1, user_name: '<b>Fake</b>', timestamp: n, data: `Synthetic ${n}` });
  assert.equal(state.append(null), false);
  assert.equal(state.append({ data: 42 }), false);
  assert.equal(state.append(row(1)), true);
  assert.equal(state.append(row(1)), false);
  state.append(row(2)); state.append(row(3));
  assert.equal(state.snapshot().rows.length, 2);
  assert.equal(state.snapshot().dropped, 1);
  state.begin('a');
  assert.equal(state.snapshot().rows.length, 2);
  state.begin('b');
  assert.equal(state.snapshot().rows.length, 0);
  assert.equal(state.snapshot().dropped, 0);
});

test('retention also bounds bytes, rejects oversize strings and speaker metadata', () => {
  const state = new TranscriptState({ maxBytes: 400, maxRows: 100 });
  const content = n => ({ user_id: 1, timestamp: n, data: '界'.repeat(50) });
  for (let n = 0; n < 20; n++) state.append(content(n));
  assert.ok(state.bytes <= 400); assert.ok(state.rows.length < 3); assert.ok(state.dropped > 0);
  assert.equal(state.append({ ...content(99), data: 'x'.repeat(8193) }), false);
  assert.equal(state.append({ ...content(100), user_name: {} }), false);
});
