import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../config.mjs';

test('config requires credentials only in real mode, isolates demo ports and pins UI to loopback', () => {
  assert.throws(() => loadConfig({}), /ZOOM_CLIENT_ID/);
  const env = { ZOOM_CLIENT_ID: 'fake-id', ZOOM_CLIENT_SECRET: 'fake-secret', ZOOM_WEBHOOK_SECRET: 'fake-webhook' };
  assert.equal(loadConfig(env).webhookPort, 8789);
  assert.equal(loadConfig({}, { demo: true }).uiPort, 18790);
  assert.equal(loadConfig({ ...env, LIVE_UI_PORT: '19000' }).uiPort, 19000);
  for (const value of ['0', '-1', '1.5', 'bad', '65536']) assert.throws(() => loadConfig({ ...env, LIVE_UI_PORT: value }), /LIVE_UI_PORT/);
  assert.throws(() => loadConfig({ ...env, LIVE_UI_PORT: '8789' }), /different/);
});
