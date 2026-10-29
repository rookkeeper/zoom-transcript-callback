// Synthetic-only runnable demo. Never loads .env or contacts Zoom; no production bypass flag exists.
import { WebSocketServer } from 'ws';
import { once } from 'node:events';
import { loadConfig } from '../config.mjs';
import { TranscriptState } from '../state.mjs';
import { RtmsController } from '../rtms.mjs';
import { createLiveService } from '../server.mjs';
import { signature } from '../security.mjs';

let service, fake, timer;
try {
  const config = loadConfig(process.env, { demo: true });
  fake = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await once(fake, 'listening');
  const base = `ws://127.0.0.1:${fake.address().port}`;
  const media = new Set();
  let count = 0;
  const packet = () => ({ msg_type: 17, content: { user_id: count % 3, user_name: ['Alex (demo)', 'Blair (demo)', 'Casey (demo)'][count % 3],
    timestamp: ++count, data: count === 1 ? '<script>Literal synthetic text, not HTML.</script>' : `Synthetic line ${count}. Select and copy this text; no meeting data is used.` } });
  fake.on('connection', (ws, req) => {
    ws.on('message', raw => {
      let msg; try { msg = JSON.parse(raw); } catch { return; }
      if (msg.msg_type === 1) ws.send(JSON.stringify({ msg_type: 2, status_code: 0, media_server: { server_urls: { all: `${base}/media` } } }));
      if (msg.msg_type === 3) {
        ws.send(JSON.stringify({ msg_type: 4, status_code: 0 }));
        media.add(ws); ws.once('close', () => media.delete(ws));
      }
      if (msg.msg_type === 7) for (let i = 0; i < 100; i++) for (const m of media) m.send(JSON.stringify(packet()));
      if (msg.msg_type === 21) ws.close();
    });
    ws.on('error', () => {});
  });
  const state = new TranscriptState();
  const validateUrl = value => {
    if (![`${base}/signal`, `${base}/media`].includes(value)) throw new Error('Invalid demo server');
    return value;
  };
  const controller = new RtmsController({ ...config, state, validateUrl });
  service = createLiveService({ ...config, state, controller });
  const ports = await service.listen(config);
  const body = JSON.stringify({ event: 'meeting.rtms_started', event_ts: Date.now(), payload: { meeting_uuid: 'fake-demo-meeting', rtms_stream_id: 'fake-demo-stream', server_urls: `${base}/signal` } });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const result = await fetch(`http://127.0.0.1:${ports.webhookPort}/zoom/rtms`, { method: 'POST', headers: {
    'x-zm-request-timestamp': timestamp, 'x-zm-signature': signature(config.webhookSecret, timestamp, Buffer.from(body)), 'content-type': 'application/json'
  }, body });
  if (!result.ok) throw new Error('Demo start rejected');
  timer = setInterval(() => {
    for (const ws of fake.clients) if (ws.readyState === 1) ws.send(JSON.stringify({ msg_type: 12, timestamp: Date.now() }));
    for (const ws of media) if (ws.readyState === 1) ws.send(JSON.stringify(packet()));
  }, 1000);
  console.info(`SYNTHETIC demo: private http://127.0.0.1:${ports.uiPort}/live ; fake webhook :${ports.webhookPort}/zoom/rtms ; Ctrl-C stops only this process.`);
  let stopping = false;
  const stop = async () => {
    if (stopping) return; stopping = true; clearInterval(timer);
    await service.close(); for (const ws of fake.clients) ws.terminate();
    fake.close();
  };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
} catch {
  clearInterval(timer); await service?.close();
  for (const ws of fake?.clients ?? []) ws.terminate(); fake?.close();
  console.error('Synthetic demo startup failed. Check LIVE_* ports; existing listeners were not stopped.');
  process.exitCode = 1;
}
