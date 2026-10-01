import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { downloadAsset, listAssets, downloadMedia, verifyLocal } from '../src/assetArchive.mjs';
import { storeTokens } from '../src/zoomOAuth.mjs';

// Zoom's per-participant audio lives in a separate top-level collection, not in
// recording_files. Missing it leaves M4As in the cloud forever.
function participantFixture() {
  return {
    topic: 'Co-lab',
    start_time: '2026-10-01T14:00:00Z',
    recording_files: [
      { id: 'transcript-id', file_type: 'TRANSCRIPT', file_extension: 'VTT', recording_type: 'audio_transcript', status: 'completed', file_size: 5, download_url: 'https://assets.test/transcript' },
      { id: 'video-id', file_type: 'MP4', file_extension: 'MP4', status: 'completed', file_size: 5, download_url: 'https://assets.test/video' },
    ],
    participant_audio_files: [
      { id: 'audio-john', file_name: 'Audio only - John Berryman', file_type: 'M4A', file_extension: 'M4A', status: 'completed', file_size: 5, download_url: 'https://assets.test/audio-john' },
      // Same display name as another participant: names must not collide.
      { id: 'audio-john-2', file_name: 'Audio only - John Berryman', file_type: 'M4A', file_extension: 'M4A', status: 'completed', file_size: 5, download_url: 'https://assets.test/audio-john-2' },
      { id: 'audio-pending', file_name: 'Audio only - Pranav Kiran', file_type: 'M4A', file_extension: 'M4A', status: 'processing', download_url: 'https://assets.test/audio-pending' },
    ],
  };
}

function stubHierarchy(t, requests) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const method = options.method ?? 'GET';
    requests.push({ url: String(url), method });
    if (String(url).includes('/v2/meetings/') && method === 'GET') return new Response(JSON.stringify(participantFixture()), { status: 200, headers: { 'content-type': 'application/json' } });
    if (method === 'DELETE') return new Response(null, { status: 204 });
    return new Response('hello');
  };
  t.after(() => { globalThis.fetch = original; });
}

function storeConfig(directory) {
  const path = join(directory, 'tokens.json');
  storeTokens(path, { access_token: 'fake', refresh_token: 'fake', expires_at: Date.now() + 60000 });
  return { zoomOAuthStorePath: path, zoomClientId: 'fake', zoomClientSecret: 'fake' };
}

test('indexes per-participant audio alongside layouts and names it from file_name', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'archive-index-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  stubHierarchy(t, []);

  const index = await listAssets(storeConfig(directory), '42', join(directory, 'assets'));

  assert.deepEqual(index.files.map(f => f.id), ['transcript-id', 'video-id', 'audio-john', 'audio-john-2']);
  assert.equal(index.nameOf(index.transcript), 'transcript-audio_transcript.vtt');
  assert.equal(index.nameOf(index.files[2]), 'audio-john-Audio only - John Berryman.m4a');
  assert.equal(index.nameOf(index.files[3]), 'audio-john-2-Audio only - John Berryman.m4a');
});

test('downloads every collection without deleting anything per-file', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'archive-audio-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const requests = [];
  stubHierarchy(t, requests);

  const config = storeConfig(directory);
  const index = await listAssets(config, '42', join(directory, 'assets'));
  // Transcript-first, then everything else — the production order.
  await downloadAsset(config, index, index.transcript);
  const results = await downloadMedia(config, index);

  assert.equal(results.length, 3, 'transcript is excluded from the media branch');
  assert.ok(results.every(r => r.status === 'succeeded'), JSON.stringify(results));
  assert.deepEqual(requests.filter(r => r.method === 'DELETE'), [], 'whole-meeting delete happens later, never per file');
  assert.deepEqual(verifyLocal(index).length, 4);
});

test('replaces a partial legacy file and reuses the verified local copy on retry', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'archive-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const config = { zoomOAuthStorePath: join(directory, 'tokens.json'), zoomClientId: 'fake', zoomClientSecret: 'fake' };
  storeTokens(config.zoomOAuthStorePath, { access_token: 'fake', refresh_token: 'fake', expires_at: Date.now() + 60000 });
  const file = { id: 'video', file_size: 5, download_url: 'https://assets.test/video' };
  const index = { directory, nameOf: () => 'video.mp4' };
  writeFileSync(join(directory, 'video.mp4'), 'bad');
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  let downloads = 0;
  globalThis.fetch = async () => { downloads++; return new Response('hello'); };
  await downloadAsset(config, index, file);
  await downloadAsset(config, index, file);
  assert.equal(downloads, 1);
  assert.equal(existsSync(join(directory, 'video.mp4.part')), false);
});

test('HTTP failure does not create final file or delete cloud copy', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'archive-fail-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const config = { zoomOAuthStorePath: join(directory, 'tokens.json') };
  storeTokens(config.zoomOAuthStorePath, { access_token: 'fake' });
  const original = globalThis.fetch; t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response(null, { status: 403 });
  await assert.rejects(() => downloadAsset(config, { directory, nameOf: () => 'video.mp4' }, { id: 'a', download_url: 'https://assets.test' }), /403/);
  assert.equal(existsSync(join(directory, 'video.mp4')), false);
});
