import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureLocal, downloadAndDeleteOne } from '../src/assetArchive.mjs';
import { storeTokens } from '../src/zoomOAuth.mjs';

test('replaces partial legacy file, deletes immediately, and reuses verified local copy on retry', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'archive-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const config = { zoomOAuthStorePath: join(directory, 'tokens.json'), zoomClientId: 'fake', zoomClientSecret: 'fake' };
  storeTokens(config.zoomOAuthStorePath, { access_token: 'fake', refresh_token: 'fake', expires_at: Date.now() + 60000 });
  const file = { id: 'video', file_size: 5, download_url: 'https://assets.test/video' };
  const index = { directory, meetingId: '42', nameOf: () => 'video.mp4' };
  writeFileSync(join(directory, 'video.mp4'), 'bad');
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  let downloads = 0, deletes = 0;
  globalThis.fetch = async (url, options) => {
    if (options.method === 'DELETE') {
      deletes++; assert.equal(readFileSync(join(directory, 'video.mp4'), 'utf8'), 'hello');
      return new Response(null, { status: deletes === 1 ? 204 : 404 });
    }
    downloads++; return new Response('hello');
  };
  await downloadAndDeleteOne(config, index, file);
  await downloadAndDeleteOne(config, index, file);
  assert.equal(downloads, 1); assert.equal(deletes, 2);
  assert.equal(existsSync(join(directory, 'video.mp4.part')), false);
});

test('HTTP failure does not create final file or delete cloud copy', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'archive-fail-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const config = { zoomOAuthStorePath: join(directory, 'tokens.json') };
  storeTokens(config.zoomOAuthStorePath, { access_token: 'fake' });
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response(null, { status: 403 });
  await assert.rejects(() => ensureLocal(config, { directory, nameOf: () => 'video.mp4' }, { id: 'a', download_url: 'https://assets.test' }), /403/);
  assert.equal(existsSync(join(directory, 'video.mp4')), false);
});
