import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocketServer } from 'ws';
import { once } from 'node:events';
import { RtmsController } from '../rtms.mjs';
import { TranscriptState } from '../state.mjs';
import { hmac } from '../security.mjs';

export const waitFor = async predicate => {
  const deadline = Date.now() + 2500;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Timed out waiting for synthetic RTMS state');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
};
export async function fakeZoom(t) {
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await once(server, 'listening');
  const url = `ws://127.0.0.1:${server.address().port}`;
  const received = [], sockets = { signal: [], media: [] };
  server.on('connection', (ws, req) => {
    const kind = req.url === '/signal' ? 'signal' : 'media';
    sockets[kind].push(ws);
    ws.on('message', data => {
      const msg = JSON.parse(data); received.push({ kind, msg });
      if (msg.msg_type === 1) ws.send(JSON.stringify({ msg_type: 2, status_code: 0, media_server: { server_urls: { all: `${url}/media` } } }));
      if (msg.msg_type === 3) ws.send(JSON.stringify({ msg_type: 4, status_code: 0 }));
    });
  });
  const close = async () => { for (const ws of server.clients) ws.terminate(); await new Promise(resolve => server.close(resolve)); };
  t?.after(close);
  return { url: `${url}/signal`, received, sockets, close };
}
const acceptLocal = value => {
  if (!/^ws:\/\/127\.0\.0\.1:\d+\/(signal|media)$/.test(value)) throw new Error('Invalid fake server');
  return value;
};
const started = (ts = Date.now(), stream = 's', url) => ({ event: 'meeting.rtms_started', event_ts: ts, payload: { meeting_uuid: 'm', rtms_stream_id: stream, server_urls: url } });

test('real WS transcript-only handshake, ACK on signaling, both keepalives, literal text, dedup and stop', async t => {
  const fake = await fakeZoom(t), state = new TranscriptState();
  const controller = new RtmsController({ clientId: 'fake-id', clientSecret: 'fake-secret', state, validateUrl: acceptLocal, retryBaseMs: 10 });
  t.after(() => controller.close());
  const start = started(Date.now(), 's', fake.url);
  controller.handle(start);
  await waitFor(() => state.status === 'live');
  assert.equal(fake.received[0].msg.signature, hmac('fake-secret', 'fake-id,m,s'));
  assert.equal(fake.received[0].msg.sequence, 1);
  const media = fake.received.find(e => e.msg.msg_type === 3).msg;
  assert.equal(media.media_type, 8);
  assert.equal(media.payload_encryption, false);
  assert.ok(fake.received.some(e => e.kind === 'signal' && e.msg.msg_type === 7));
  for (const kind of ['signal', 'media']) fake.sockets[kind][0].send(JSON.stringify({ msg_type: 12, timestamp: 123 }));
  const packet = { msg_type: 17, content: { user_id: 1, user_name: 'Synthetic <b>speaker</b>', timestamp: 1, data: '<script>fake</script>' } };
  fake.sockets.media[0].send('not json'); fake.sockets.media[0].send('null');
  fake.sockets.media[0].send(JSON.stringify(packet)); fake.sockets.media[0].send(JSON.stringify(packet));
  await waitFor(() => fake.received.filter(e => e.msg.msg_type === 13).length === 2 && state.rows.length === 1);
  assert.equal(state.rows[0].text, packet.content.data);
  fake.sockets.media[0].send(Buffer.from(JSON.stringify({ ...packet, content: { ...packet.content, timestamp: 2, data: 'Synthetic binary-framed JSON' } })));
  fake.sockets.media[0].send(Buffer.from([0, 1, 2, 3]));
  await waitFor(() => state.rows.length === 2);
  controller.handle(start); // transport redelivery, not failover
  assert.equal(fake.sockets.signal.length, 1);
  controller.handle({ event: 'meeting.rtms_stopped', event_ts: start.event_ts + 1, payload: start.payload });
  await waitFor(() => state.status === 'ended');
  controller.handle(start);
  assert.equal(state.status, 'ended');
});

test('paused Zoom stream stays paused through media reconnect until explicit resume', async t => {
  const fake = await fakeZoom(t), state = new TranscriptState();
  const controller = new RtmsController({ clientId: 'fake', clientSecret: 'fake', state, validateUrl: acceptLocal, retryBaseMs: 10 });
  t.after(() => controller.close());
  controller.handle(started(Date.now(), 's', fake.url));
  await waitFor(() => state.status === 'live');
  assert.ok(!fake.received.some(e => e.msg.msg_type === 5 && e.msg.events?.some(event => event.event_type === 7)), 'Automatic event 7 must not be subscribed to');
  for (const [msg_type, pauseState, resumeState] of [[8, 5, 6], [9, 3, 4], [9, 5, 2]]) {
    const count = fake.sockets.media.length;
    fake.sockets.signal[0].send(JSON.stringify({ msg_type, state: pauseState }));
    await waitFor(() => state.status === 'paused');
    fake.sockets.media.at(-1).terminate();
    await waitFor(() => fake.sockets.media.length === count + 1 && controller.media?.ready);
    assert.equal(state.status, 'paused');
    fake.sockets.media.at(-1).send(JSON.stringify({ msg_type: 17, content: { user_id: 1, timestamp: count, data: 'Synthetic paused packet' } }));
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.equal(state.rows.length, 0);
    fake.sockets.signal[0].send(JSON.stringify({ msg_type, state: resumeState }));
    await waitFor(() => state.status === 'live');
  }
});

test('media-only retry, interrupted webhook without URLs, fresh failover and stale stop isolation', async t => {
  const fake = await fakeZoom(t), state = new TranscriptState();
  const controller = new RtmsController({ clientId: 'fake', clientSecret: 'fake', state, validateUrl: acceptLocal, retryBaseMs: 10 });
  t.after(() => controller.close());
  const event = started(Date.now(), 's', fake.url);
  controller.handle(event); await waitFor(() => state.status === 'live');
  fake.sockets.media[0].terminate();
  await waitFor(() => fake.sockets.media.length === 2 && state.status === 'live');
  assert.equal(fake.sockets.signal.length, 1);
  controller.handle({ ...event, event: 'meeting.rtms_interrupted', event_ts: event.event_ts + 1, payload: { meeting_uuid: 'm', rtms_stream_id: 's' } });
  await waitFor(() => fake.sockets.signal.length === 2 && state.status === 'live');
  controller.handle({ ...event, event_ts: event.event_ts + 2 });
  await waitFor(() => fake.sockets.signal.length === 3 && state.status === 'live');
  controller.handle(started(event.event_ts + 3, 's2', fake.url));
  await waitFor(() => fake.sockets.signal.length === 4 && state.status === 'live');
  controller.handle({ ...event, event: 'meeting.rtms_stopped', event_ts: event.event_ts + 4 });
  assert.equal(state.status, 'live');
});

test('rejected handshakes and unsafe media URL fail visibly without content-bearing errors', async t => {
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 }); await once(server, 'listening');
  t.after(() => { for (const ws of server.clients) ws.terminate(); return new Promise(resolve => server.close(resolve)); });
  let mode = 'reject';
  server.on('connection', ws => ws.on('message', () => ws.send(JSON.stringify(mode === 'reject'
    ? { msg_type: 2, status_code: 401, reason: 'fake-secret-must-not-leak' }
    : { msg_type: 2, status_code: 0, media_server: { server_urls: { all: 'wss://user:fake-secret@evil.test' } } }))));
  const state = new TranscriptState();
  const controller = new RtmsController({ clientId: 'fake', clientSecret: 'fake', state, validateUrl: acceptLocal });
  t.after(() => controller.close());
  controller.handle(started(Date.now(), 's', `ws://127.0.0.1:${server.address().port}/signal`));
  await waitFor(() => state.status === 'disconnected');
  assert.match(state.detail, /handshake rejected/); assert.ok(!state.detail.includes('fake-secret'));
  mode = 'url';
  controller.handle(started(Date.now() + 1, 's2', `ws://127.0.0.1:${server.address().port}/signal`));
  await waitFor(() => state.status === 'disconnected');
  assert.match(state.detail, /unsupported media address/); assert.ok(!state.detail.includes('fake-secret'));
});

test('stalled handshake retries are bounded, final failure visible, and close cancels pending retry', async t => {
  const server = new WebSocketServer({ host: '127.0.0.1', port: 0 }); await once(server, 'listening');
  t.after(() => { for (const ws of server.clients) ws.terminate(); return new Promise(resolve => server.close(resolve)); });
  let count = 0; server.on('connection', () => count++);
  const state = new TranscriptState();
  const controller = new RtmsController({ clientId: 'fake', clientSecret: 'fake', state, validateUrl: acceptLocal, retryBaseMs: 5, handshakeMs: 20 });
  t.after(() => controller.close());
  const event = started(Date.now(), 's', `ws://127.0.0.1:${server.address().port}/signal`);
  controller.handle(event);
  await waitFor(() => state.status === 'disconnected');
  assert.equal(count, 4); assert.match(state.detail, /stop and restart RTMS/);
  controller.handle({ ...event, event_ts: Date.now(), payload: { ...event.payload, rtms_stream_id: 's2' } });
  await waitFor(() => state.status === 'reconnecting');
  controller.close(); const final = count;
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(count, final);
});

test('Zoom pause/resume, media interruption event, revocation and graceful shutdown', async t => {
  const fake = await fakeZoom(t), state = new TranscriptState();
  const controller = new RtmsController({ clientId: 'fake', clientSecret: 'fake', state, validateUrl: acceptLocal, retryBaseMs: 10 });
  t.after(() => controller.close());
  const event = started(Date.now(), 's', fake.url);
  controller.handle(event); await waitFor(() => state.status === 'live');
  fake.sockets.signal[0].send(JSON.stringify({ msg_type: 8, state: 5 }));
  await waitFor(() => state.status === 'paused');
  fake.sockets.signal[0].send(JSON.stringify({ msg_type: 8, state: 6 }));
  await waitFor(() => state.status === 'live');
  fake.sockets.signal[0].send(JSON.stringify({ msg_type: 6, event: { event_type: 7 } }));
  await waitFor(() => fake.sockets.media.length === 2 && state.status === 'live');
  assert.match(state.detail, /historical gaps cannot be recovered/);
  state.append({ user_id: 1, timestamp: 1, data: 'Synthetic revoke fixture' });
  controller.handle({ ...event, event: 'meeting.rtms_stopped', event_ts: event.event_ts + 1, payload: { ...event.payload, stop_reason: 8 } });
  assert.equal(state.rows.length, 0);
  controller.handle(started(event.event_ts + 2, 's2', fake.url));
  await waitFor(() => state.status === 'live');
  await controller.close();
  await waitFor(() => fake.received.some(e => e.kind === 'signal' && e.msg.msg_type === 21));
});

test('session states 2/3/4/5 preserve ordinary stopped text but broadcast deletion on revocation', async t => {
  const fake = await fakeZoom(t), state = new TranscriptState(), updates = [];
  state.on('update', update => updates.push(update));
  const controller = new RtmsController({ clientId: 'fake', clientSecret: 'fake', state, validateUrl: acceptLocal });
  t.after(() => controller.close());
  controller.handle(started(Date.now(), 's', fake.url)); await waitFor(() => state.status === 'live');
  state.append({ user_id: 1, timestamp: 1, data: 'Synthetic session fixture' });
  const session = message => fake.sockets.signal[0].send(JSON.stringify({ msg_type: 9, ...message }));
  session({ state: 3 }); await waitFor(() => state.status === 'paused');
  assert.equal(state.rows.length, 1);
  session({ state: 4 }); await waitFor(() => state.status === 'live');
  session({ state: 5, stop_reason: 6 }); await waitFor(() => state.status === 'paused');
  assert.equal(state.rows.length, 1);
  session({ state: 2 }); await waitFor(() => state.status === 'live');
  session({ state: 5, stop_reason: 8 }); await waitFor(() => state.status === 'paused');
  assert.equal(state.rows.length, 0);
  assert.equal(updates.at(-2).type, 'snapshot');
  assert.equal(updates.at(-2).rows.length, 0);
});

test('stream terminating/terminated and stopped webhooks retain ordinary ends but clear revoked text', async t => {
  const fake = await fakeZoom(t), state = new TranscriptState(), updates = [];
  state.on('update', update => updates.push(update));
  const controller = new RtmsController({ clientId: 'fake', clientSecret: 'fake', state, validateUrl: acceptLocal });
  t.after(() => controller.close());
  const ts = Date.now(), event = started(ts, 's', fake.url);
  controller.handle(event); await waitFor(() => state.status === 'live');
  state.append({ user_id: 1, timestamp: 1, data: 'Synthetic ended fixture' });
  fake.sockets.signal[0].send(JSON.stringify({ msg_type: 8, state: 3, reason: 6 }));
  await waitFor(() => state.status === 'ended');
  assert.equal(state.rows.length, 1);
  controller.handle({ ...event, event: 'meeting.rtms_stopped', event_ts: ts + 1, payload: { ...event.payload, stop_reason: 8 } });
  assert.equal(state.rows.length, 0); assert.equal(updates.at(-1).type, 'snapshot');
  controller.handle(started(ts + 2, 's2', fake.url)); await waitFor(() => state.status === 'live');
  state.append({ user_id: 1, timestamp: 2, data: 'Synthetic revoked fixture' });
  fake.sockets.signal[1].send(JSON.stringify({ msg_type: 8, state: 4, reason: 8 }));
  await waitFor(() => state.status === 'ended');
  assert.equal(state.rows.length, 0); assert.equal(updates.at(-2).type, 'snapshot');
  controller.handle(started(ts + 3, 's3', fake.url)); await waitFor(() => state.status === 'live');
  state.append({ user_id: 1, timestamp: 3, data: 'Synthetic ordinary meeting end' });
  controller.handle({ ...started(ts + 4, 's3', fake.url), event: 'meeting.rtms_stopped', payload: { meeting_uuid: 'm', rtms_stream_id: 's3', stop_reason: 6 } });
  assert.equal(state.status, 'ended'); assert.equal(state.rows.length, 1);
  controller.handle({ ...started(ts + 5, 's4', fake.url), payload: { meeting_uuid: 'new-fake-meeting', rtms_stream_id: 's4', server_urls: fake.url } });
  assert.equal(state.rows.length, 0);
});
