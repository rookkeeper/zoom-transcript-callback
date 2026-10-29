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
  const route = handler => (req, res) => {
    let path;
    try {
      if (!req.url.startsWith('/')) throw new Error();
      path = new URL(req.url, 'http://localhost').pathname;
    } catch { res.writeHead(400).end(); return; }
    handler(req, res, path);
  };
  // The existing Cloudflare origin reaches only these public Zoom endpoints.
  const callback = http.createServer(route((req, res, path) => {
    if (req.method === 'POST' && path === '/zoom/transcripts') return recording(req, res);
    if (req.method === 'GET' && path === '/zoom/oauth') return oauth(req, res);
    if (req.method === 'POST' && path === '/zoom/rtms' && live) return live.webhookHandler(req, res);
    res.writeHead(404).end();
  }));
  // Both mini-app UIs share the existing local-only listener, never public ingress.
  const admin = http.createServer(route((req, res, path) => {
    if (!localRequest(req)) return denyPrivate(res);
    if (adminPath(path)) return history(req, res);
    if (liveUiPath(path) && live) return live.uiHandler(req, res);
    res.writeHead(404).end();
  }));
  for (const server of [callback, admin]) configureListener(server, live);
  return {
    callback, admin,
    async close() {
      const closed = [callback, admin].map(server => new Promise(resolve => server.close(resolve)));
      await live?.close();
      for (const server of [callback, admin]) server.closeAllConnections();
      await Promise.all(closed);
    }
  };
}
