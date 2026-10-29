import http from 'node:http';
import { readFileSync } from 'node:fs';
import { once } from 'node:events';
import { verifyWebhook, hmac } from './security.mjs';
import { localRequest } from '../routing/localAccess.mjs';

const assets = new Map([
  ['/live', ['text/html; charset=utf-8', new URL('./ui/index.html', import.meta.url)]],
  ['/live/app.mjs', ['text/javascript; charset=utf-8', new URL('./ui/app.mjs', import.meta.url)]],
  ['/live/style.css', ['text/css; charset=utf-8', new URL('./ui/style.css', import.meta.url)]]
]);
const headers = {
  'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
};
const reply = (res, status, text = '') => { res.writeHead(status, { ...headers, 'content-type': 'application/json' }); res.end(text); };
const record = value => value && typeof value === 'object' && !Array.isArray(value);
async function rawBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) throw Object.assign(new Error('Body too large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
export const privateRequest = localRequest;
export const liveUiPath = path => path === '/live' || path.startsWith('/live/') || path.startsWith('/api/live/');

export function createLiveHandlers({ webhookSecret, state, controller }) {
  const clients = new Set();
  const publish = update => {
    const frame = `data: ${JSON.stringify(update)}\n\n`;
    for (const res of clients) {
      // Never queue an unbounded stream for a slow tab. EventSource reconnect gets a fresh snapshot.
      if (res.writableLength > 1024 * 1024 || !res.write(frame)) { clients.delete(res); res.destroy(); }
    }
  };
  state.on('update', publish);
  const webhookHandler = async (req, res) => {
    if (req.url !== '/zoom/rtms' || req.method !== 'POST') return reply(res, 404);
    try {
      const raw = await rawBody(req);
      if (!verifyWebhook(webhookSecret, req.headers['x-zm-request-timestamp'], req.headers['x-zm-signature'], raw)) return reply(res, 401);
      const event = JSON.parse(raw);
      if (!record(event) || typeof event.event !== 'string' || !event.event.length || event.event.length > 100 || !record(event.payload)) return reply(res, 400);
      if (event.event === 'endpoint.url_validation') {
        const token = event.payload.plainToken;
        if (typeof token !== 'string' || !token.length || token.length > 1024) return reply(res, 400);
        return reply(res, 200, JSON.stringify({ plainToken: token, encryptedToken: hmac(webhookSecret, token) }));
      }
      controller.handle(event);
      reply(res, 200, '{"ok":true}');
    } catch (error) { if (!res.destroyed) reply(res, error.status === 413 ? 413 : 400, '{"error":"Invalid request"}'); }
  };
  const uiHandler = async (req, res) => {
    if (!privateRequest(req)) return reply(res, 403);
    if (req.method === 'GET' && assets.has(req.url)) {
      const [type, path] = assets.get(req.url);
      res.writeHead(200, { ...headers, 'content-type': type }); res.end(readFileSync(path)); return;
    }
    if (req.method === 'GET' && req.url === '/api/live/stream') {
      if (clients.size >= 8) return reply(res, 503);
      res.writeHead(200, { ...headers, 'content-type': 'text/event-stream', 'x-accel-buffering': 'no' });
      // A single bounded snapshot can exceed Node's high-water mark; it is the only initial queued frame.
      res.write(`retry: 2000\ndata: ${JSON.stringify({ type: 'snapshot', ...state.snapshot() })}\n\n`);
      clients.add(res);
      res.on('close', () => clients.delete(res));
      return;
    }
    if (req.method === 'POST' && req.url === '/api/live/clear') {
      if (req.headers.origin !== `http://${req.headers.host}` || req.headers['content-type'] !== 'application/json') return reply(res, 403);
      try { await rawBody(req); state.clear(); reply(res, 204); } catch { reply(res, 400); }
      return;
    }
    reply(res, 404);
  };
  const heartbeat = setInterval(() => {
    for (const res of clients) if (!res.write(': keepalive\n\n')) { clients.delete(res); res.destroy(); }
  }, 15000);
  heartbeat.unref();
  return {
    webhookHandler, uiHandler,
    isStreamSocket: socket => [...clients].some(res => res.socket === socket),
    async close() {
      clearInterval(heartbeat); state.off('update', publish); await controller.close();
      for (const res of clients) res.destroy(); clients.clear();
    }
  };
}

export function configureListener(server, live) {
  server.maxConnections = 64;
  server.requestTimeout = 10000; server.headersTimeout = 10000; server.maxRequestsPerSocket = 100;
  server.setTimeout(10000, socket => { if (!live?.isStreamSocket(socket)) socket.destroy(); });
}

// Standalone listeners remain available for isolated demos/tests, not normal deployment.
export function createLiveService(options) {
  const live = createLiveHandlers(options);
  const webhook = http.createServer(live.webhookHandler), ui = http.createServer(live.uiHandler);
  for (const server of [webhook, ui]) configureListener(server, live);
  return {
    webhook, ui,
    async listen({ webhookHost = '127.0.0.1', webhookPort = 8789, uiPort = 8790 } = {}) {
      try {
        webhook.listen(webhookPort, webhookHost); await once(webhook, 'listening');
        ui.listen(uiPort, '127.0.0.1'); await once(ui, 'listening');
        return { webhookPort: webhook.address().port, uiPort: ui.address().port };
      } catch (error) { await this.close(); throw error; }
    },
    async close() {
      await live.close();
      await Promise.all([webhook, ui].map(server => new Promise(resolve => {
        server.close(resolve); server.closeAllConnections();
      })));
    }
  };
}
