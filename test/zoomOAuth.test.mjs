import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exchangeCode, refreshTokens, loadStoredTokens, storeTokens, zoomApi } from '../src/zoomOAuth.mjs';
import { oauthHandler } from '../src/oauthCallback.mjs';

function fakeTokenServer(t, handler) {
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => handler(req, body, res));
  });
  server.listen(0, '127.0.0.1');
  t.after(() => { server.closeAllConnections(); server.close(); });
  return server;
}

test('exchangeCode swaps an auth code for tokens against the token endpoint', async () => {
  await new Promise((resolve, reject) => {
    const t = { after: (fn) => cleanup.push(fn) };
    const cleanup = [];
    const server = fakeTokenServer(t, (req, body, res) => {
      try {
        assert.equal(req.method, 'POST');
        assert.match(req.headers.authorization ?? '', /^Basic /);
        assert.match(body, /grant_type=authorization_code/);
        assert.match(body, /code=abc123/);
        assert.match(body, /redirect_uri=/);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ access_token: 'at', refresh_token: 'rt', expires_in: 3600 }));
      } catch (error) { reject(error); }
    });
    exchangeCode({
      tokenUrl: `http://127.0.0.1:${server.address().port}/oauth/token`,
      clientId: 'id', clientSecret: 'secret', code: 'abc123', redirectUri: 'https://example.test/cb',
    }).then(
      (tokens) => { assert.equal(tokens.access_token, 'at'); assert.equal(tokens.refresh_token, 'rt'); cleanup.forEach((fn) => fn()); resolve(); },
      (error) => { cleanup.forEach((fn) => fn()); reject(error); },
    );
  });
});

test('exchangeCode rejects error payloads without storing anything', async (t) => {
  const server = fakeTokenServer(t, (_req, _body, res) => {
    res.writeHead(400, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ reason: 'Invalid authorization code' }));
  });
  await assert.rejects(() => exchangeCode({
    tokenUrl: `http://127.0.0.1:${server.address().port}/oauth/token`,
    clientId: 'id', clientSecret: 'secret', code: 'dead', redirectUri: 'https://example.test/cb',
  }), /Invalid authorization code/);
});

test('refreshTokens rotates the refresh token', async (t) => {
  const server = fakeTokenServer(t, (req, body, res) => {
    assert.match(body, /grant_type=refresh_token/);
    assert.match(body, /refresh_token=old-rt/);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ access_token: 'new-at', refresh_token: 'new-rt', expires_in: 3600 }));
  });
  const tokens = await refreshTokens({
    tokenUrl: `http://127.0.0.1:${server.address().port}/oauth/token`,
    clientId: 'id', clientSecret: 'secret', refreshToken: 'old-rt',
  });
  assert.equal(tokens.access_token, 'new-at');
  assert.equal(tokens.refresh_token, 'new-rt');
});

test('token store round-trips with owner-only permissions', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'oauth-store-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'zoom-oauth.json');
  storeTokens(path, { access_token: 'at', refresh_token: 'rt', expires_at: 123 });
  assert.deepEqual(loadStoredTokens(path), { access_token: 'at', refresh_token: 'rt', expires_at: 123 });
  const { statSync } = await import('node:fs');
  assert.equal(statSync(path).mode & 0o777, 0o600);
  assert.equal(loadStoredTokens(join(dir, 'missing.json')), null);
});

test('zoomApi refreshes an expired token and retries once', async (t) => {
  let apiCalls = 0;
  const api = http.createServer((_req, res) => {
    apiCalls += 1;
    if (apiCalls === 1) { res.writeHead(401, { 'content-type': 'application/json' }); res.end(JSON.stringify({ code: 124 })); return; }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true }));
  });
  api.listen(0, '127.0.0.1');
  t.after(() => { api.closeAllConnections(); api.close(); });
  const token = fakeTokenServer(t, (_req, _body, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ access_token: 'fresh', refresh_token: 'fresh-rt', expires_in: 3600 }));
  });
  const dir = mkdtempSync(join(tmpdir(), 'oauth-api-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const storePath = join(dir, 'zoom-oauth.json');
  storeTokens(storePath, { access_token: 'stale', refresh_token: 'rt', expires_at: Date.now() - 1000 });
  const result = await zoomApi({
    baseUrl: `http://127.0.0.1:${api.address().port}`,
    tokenUrl: `http://127.0.0.1:${token.address().port}/oauth/token`,
    clientId: 'id', clientSecret: 'secret', storePath,
  }, '/v2/users/me');
  assert.deepEqual(result, { ok: true });
  assert.equal(apiCalls, 2);
  assert.equal(loadStoredTokens(storePath).access_token, 'fresh');
});

test('oauth callback route stores tokens and rejects a missing code', async (t) => {
  const token = fakeTokenServer(t, (_req, _body, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ access_token: 'at', refresh_token: 'rt', expires_in: 3600 }));
  });
  const dir = mkdtempSync(join(tmpdir(), 'oauth-route-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const storePath = join(dir, 'zoom-oauth.json');
  const config = {
    zoomClientId: 'id', zoomClientSecret: 'secret',
    zoomTokenUrl: `http://127.0.0.1:${token.address().port}/oauth/token`,
    zoomRedirectUri: 'https://example.test/cb', zoomOAuthStorePath: storePath,
  };
  const missing = await fetch(`http://127.0.0.1:${start(t, config)}/zoom/oauth`);
  assert.equal(missing.status, 400);
  const denied = await fetch(`http://127.0.0.1:${start(t, config)}/zoom/oauth?error=access_denied`);
  assert.equal(denied.status, 400);
  const port = start(t, config);
  const ok = await fetch(`http://127.0.0.1:${port}/zoom/oauth?code=abc123`);
  assert.equal(ok.status, 200);
  assert.match(await ok.text(), /connected/i);
  assert.equal(loadStoredTokens(storePath).refresh_token, 'rt');

  function start(t, config) {
    const server = http.createServer(oauthHandler(config));
    server.listen(0, '127.0.0.1');
    t.after(() => { server.closeAllConnections(); server.close(); });
    return server.address().port;
  }
});
