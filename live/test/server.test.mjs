import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createLiveService } from '../server.mjs';
import { TranscriptState } from '../state.mjs';
import { signature, hmac } from '../security.mjs';

const request = (port, { path = '/live', method = 'GET', headers = {}, body = '' } = {}) => new Promise((resolve, reject) => {
  const req = http.request({ host: '127.0.0.1', port, path, method, headers }, res => {
    let text = ''; res.on('data', b => text += b); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, text }));
  });
  req.on('error', reject); req.end(body);
});
const signed = body => {
  const timestamp = String(Math.floor(Date.now() / 1000));
  return { 'content-type': 'application/json', 'x-zm-request-timestamp': timestamp, 'x-zm-signature': signature('fake-webhook-secret', timestamp, Buffer.from(body)) };
};
async function fixture(t) {
  const events = [], state = new TranscriptState();
  const service = createLiveService({ webhookSecret: 'fake-webhook-secret', state, controller: { handle: e => events.push(e), close() {} } });
  const ports = await service.listen({ webhookHost: '127.0.0.1', webhookPort: 0, uiPort: 0 });
  t.after(() => service.close());
  return { ...ports, events, state };
}

test('actual signed webhook listener: validation, raw-body tampering, malformed and bounded bodies, no private routes', async t => {
  const f = await fixture(t);
  for (const path of ['/live', '/api/live/stream', '/api/live/clear']) assert.equal((await request(f.webhookPort, { path })).status, 404);
  const body = JSON.stringify({ event: 'endpoint.url_validation', payload: { plainToken: 'fake-challenge' } });
  const valid = await request(f.webhookPort, { path: '/zoom/rtms', method: 'POST', headers: signed(body), body });
  assert.equal(valid.status, 200);
  assert.deepEqual(JSON.parse(valid.text), { plainToken: 'fake-challenge', encryptedToken: hmac('fake-webhook-secret', 'fake-challenge') });
  assert.equal((await request(f.webhookPort, { path: '/zoom/rtms', method: 'POST', headers: signed(body), body: body + ' ' })).status, 401);
  for (const body of ['{', 'null', '[]', '{"event":"meeting.rtms_started"}']) {
    const response = await request(f.webhookPort, { path: '/zoom/rtms', method: 'POST', headers: signed(body), body });
    assert.equal(response.status, 400);
    assert.ok(['', '{"error":"Invalid request"}'].includes(response.text));
  }
  const big = ' '.repeat(65537);
  assert.equal((await request(f.webhookPort, { path: '/zoom/rtms', method: 'POST', headers: signed(big), body: big })).status, 413);
});

test('private listener rejects forwarding, hostile host/origin/site, serves no public endpoint and clears only same-origin', async t => {
  const f = await fixture(t);
  for (const headers of [{ host: 'evil.test' }, { origin: 'https://evil.test' }, { forwarded: 'for=127.0.0.1' }, { 'x-forwarded-host': 'localhost' }, { 'x-real-ip': '127.0.0.1' }, { 'sec-fetch-site': 'cross-site' }]) {
    assert.equal((await request(f.uiPort, { headers })).status, 403);
    assert.equal((await request(f.uiPort, { path: '/api/live/stream', headers })).status, 403);
  }
  const shell = await request(f.uiPort);
  assert.equal(shell.status, 200);
  assert.match(shell.headers['cache-control'], /no-store/);
  assert.match(shell.headers['content-security-policy'], /default-src 'none'/);
  assert.equal((await request(f.uiPort, { path: '/zoom/rtms', method: 'POST' })).status, 404);
  assert.equal((await request(f.uiPort, { path: '/api/live/clear', method: 'POST' })).status, 403);
  assert.equal((await request(f.uiPort, { path: '/api/live/clear', method: 'POST', headers: { origin: `http://127.0.0.1:${f.uiPort}`, 'content-type': 'application/json' }, body: '{}' })).status, 204);
});

test('real SSE gives refresh snapshot then ordered updates, caps viewers and closes on service shutdown', async t => {
  const f = await fixture(t);
  f.state.begin('fake'); f.state.append({ user_id: 1, user_name: 'Synthetic', timestamp: 1, data: 'Fake demo only' });
  const clients = [];
  t.after(() => { for (const req of clients) req.destroy(); });
  const stream = () => new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: f.uiPort, path: '/api/live/stream' }, res => resolve({ req, res }));
    req.on('error', reject); clients.push(req);
  });
  const first = await stream();
  let received = '';
  first.res.on('data', bytes => received += bytes);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.match(received, /"type":"snapshot"/); assert.match(received, /Fake demo only/);
  f.state.setStatus('paused', 'Synthetic pause');
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.match(received, /"status":"paused"/);
  for (let i = 1; i < 8; i++) { const c = await stream(); c.res.resume(); }
  const denied = await stream(); denied.res.resume();
  assert.equal(denied.res.statusCode, 503);
});

test('burst backpressure disconnects a viewer instead of queuing unbounded history', async t => {
  const f = await fixture(t);
  const connection = await new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: f.uiPort, path: '/api/live/stream' }, res => resolve({ req, res }));
    req.on('error', reject);
  });
  t.after(() => connection.req.destroy());
  connection.res.on('error', () => {});
  connection.res.resume();
  await new Promise(resolve => connection.res.once('data', resolve));
  const closed = new Promise(resolve => connection.res.once('close', resolve));
  for (let n = 0; n < 200; n++) f.state.append({ user_id: 1, timestamp: n, data: 'x'.repeat(8192) });
  await Promise.race([closed, new Promise((_, reject) => setTimeout(() => reject(new Error('Slow SSE was not disconnected')), 2000).unref())]);
  assert.ok(f.state.bytes <= 512 * 1024);
});

test('occupied ports are refused without disturbing an unrelated listener', async t => {
  const sentinel = http.createServer((req, res) => res.end('Synthetic unrelated server'));
  await new Promise(resolve => sentinel.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => sentinel.close(resolve)));
  const port = sentinel.address().port;
  const service = createLiveService({ webhookSecret: 'fake', state: new TranscriptState(), controller: { handle() {}, close() {} } });
  await assert.rejects(service.listen({ webhookPort: 0, uiPort: port }), { code: 'EADDRINUSE' });
  assert.equal((await request(port)).text, 'Synthetic unrelated server');
});

test('malformed signed lifecycle fields and credential-bearing URLs are rejected before any WS connection', async t => {
  const { RtmsController } = await import('../rtms.mjs');
  const state = new TranscriptState();
  const controller = new RtmsController({ clientId: 'fake-id', clientSecret: 'fake-secret', state });
  const service = createLiveService({ webhookSecret: 'fake-webhook-secret', state, controller });
  const ports = await service.listen({ webhookPort: 0, uiPort: 0 });
  t.after(() => service.close());
  for (const payload of [{}, { meeting_uuid: 'fake', rtms_stream_id: 'fake', server_urls: 'wss://user:fake-private-value@rtms.zoom.us' },
    { meeting_uuid: 'fake', rtms_stream_id: 'fake', server_urls: 'wss://127.0.0.1/private' }]) {
    const body = JSON.stringify({ event: 'meeting.rtms_started', event_ts: Date.now(), payload });
    const response = await request(ports.webhookPort, { path: '/zoom/rtms', method: 'POST', headers: signed(body), body });
    assert.equal(response.status, 400);
    assert.equal(response.text, '{"error":"Invalid request"}');
    assert.equal(controller.session, undefined);
  }
});
