import test from 'node:test';
import assert from 'node:assert/strict';
import { localRequest } from '../routing/localAccess.mjs';

test('private guard needs loopback peer, exact local authority, origin/site and no forwarding hints', () => {
  const req = { socket: { localPort: 8788, remoteAddress: '127.0.0.1' }, headers: { host: '127.0.0.1:8788' } };
  assert.equal(localRequest(req), true);
  assert.equal(localRequest({ ...req, socket: { ...req.socket, remoteAddress: '203.0.113.1' } }), false);
  for (const headers of [
    {host:'public.example'}, {host:'127.0.0.1:8788.evil.example'}, {host:'localhost:8787'},
    {forwarded:'for=127.0.0.1'}, {'x-forwarded-proto':'http'}, {'cf-visitor':'{}'}, {via:'proxy'},
    {'x-real-ip':'127.0.0.1'}, {origin:'null'}, {origin:'http://evil.example'}, {'sec-fetch-site':'same-site'},
  ]) assert.equal(localRequest({ ...req, headers: { ...req.headers, ...headers } }), false, JSON.stringify(headers));
  assert.equal(localRequest({ ...req, headers: {host:'localhost:8788',origin:'http://localhost:8788','sec-fetch-site':'same-origin'} }), true);
});
