import http from 'node:http';
import { callbackHandler } from './callback.mjs';
import { oauthHandler } from './oauthCallback.mjs';
import { adminHandler, adminPath } from './admin.mjs';
import { liveUiPath, configureListener } from '../live/server.mjs';
import { localRequest, denyPrivate } from '../routing/localAccess.mjs';

export function createApplication(config, service, processor, { live } = {}) {
  const recording = callbackHandler(config, service, processor);
  const oauth = oauthHandler(config);
  const history = adminHandler(service);
  const server = http.createServer((req, res) => {
    let path;
    try {
      if (!req.url.startsWith('/')) throw new Error();
      path = new URL(req.url, 'http://localhost').pathname;
    } catch { res.writeHead(400).end(); return; }
    // Public allowlist is deliberately separate from private mini-app mounts.
    if (req.method === 'POST' && path === '/zoom/transcripts') return recording(req, res);
    if (req.method === 'GET' && path === '/zoom/oauth') return oauth(req, res);
    if (req.method === 'POST' && path === '/zoom/rtms' && live) return live.webhookHandler(req, res);
    if (adminPath(path) || liveUiPath(path)) {
      if (!localRequest(req)) return denyPrivate(res);
      if (adminPath(path)) return history(req, res);
      if (live) return live.uiHandler(req, res);
    }
    res.writeHead(404).end();
  });
  configureListener(server, live);
  return {
    server,
    async close() {
      // Stop accepting first; callbacks already accepted drain separately in index.mjs.
      const closed = new Promise(resolve => server.close(resolve));
      await live?.close();
      server.closeAllConnections();
      await closed;
    }
  };
}
