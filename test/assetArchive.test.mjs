import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { downloadTranscript, listAssets, downloadAssets, verifyLocal } from '../src/assetArchive.mjs';
import { storeTokens } from '../src/zoomOAuth.mjs';
import { encodeMeetingKey, meetingRecordingsPath, resolveInstanceDirectory } from '../src/zoomDownloads.mjs';

// Zoom's per-participant audio lives in a separate top-level collection, not in
// recording_files. Missing it leaves M4As in the cloud forever.
function participantFixture(uuid = 'aBc/DeF==') {
  return {
    uuid,
    id: 87850645500,
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

function stubHierarchy(t, requests, fixture = participantFixture()) {
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    const method = options.method ?? 'GET';
    requests.push({ url: String(url), method });
    if (String(url).includes('/v2/meetings/') && method === 'GET') return new Response(JSON.stringify(fixture), { status: 200, headers: { 'content-type': 'application/json' } });
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

  const index = await listAssets(storeConfig(directory), 'aBc/DeF==', join(directory, 'assets'));

  assert.deepEqual(index.files.map(f => f.id), ['transcript-id', 'video-id', 'audio-john', 'audio-john-2']);
  assert.equal(index.meetingUuid, 'aBc/DeF==');
  assert.equal(index.meetingId, '87850645500', 'numeric ID stays in metadata for display');
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
  const index = await listAssets(config, 'aBc/DeF==', join(directory, 'assets'));
  // Transcript-first, then everything else — the production order.
  await downloadTranscript(config, index, index.transcript);
  const results = await downloadAssets(config, index);

  assert.equal(results.length, 3, 'transcript is excluded from the media branch');
  assert.ok(results.every(r => r.status === 'succeeded'), JSON.stringify(results));
  assert.deepEqual(requests.filter(r => r.method === 'DELETE'), [], 'whole-meeting delete happens later, never per file');
  assert.deepEqual(verifyLocal(index).length, 4);
});

test('fetches and deletes by double-encoded UUID so sibling instances never collide', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'archive-uuid-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const requests = [];
  const real = participantFixture('1in20/L2QcWjtTp5hFfzcQ==');
  stubHierarchy(t, requests, real);
  const { deleteMeeting } = await import('../src/assetArchive.mjs');

  const config = storeConfig(directory);
  const expectedPath = meetingRecordingsPath('1in20/L2QcWjtTp5hFfzcQ==');
  assert.equal(expectedPath, `/v2/meetings/${encodeMeetingKey('1in20/L2QcWjtTp5hFfzcQ==')}/recordings`);
  assert.notEqual(expectedPath, '/v2/meetings/87850645500/recordings', 'UUID path must differ from the numeric-ID path');
  assert.ok(expectedPath.includes('%252F'), 'slash must be double-encoded');

  const index = await listAssets(config, '1in20/L2QcWjtTp5hFfzcQ==', join(directory, 'assets'));
  assert.equal(index.meetingUuid, '1in20/L2QcWjtTp5hFfzcQ==');
  const fetch = requests.find(r => r.method === 'GET');
  assert.equal(new URL(fetch.url, 'https://api.zoom.us').pathname, expectedPath);

  requests.length = 0;
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), method: options.method ?? 'GET' });
    if ((options.method ?? 'GET') === 'DELETE') return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ code: 3301 }), { status: 404, headers: { 'content-type': 'application/json' } });
  };
  const deletion = await deleteMeeting(config, '1in20/L2QcWjtTp5hFfzcQ==', { polls: 1, intervalMs: 1 });
  assert.equal(deletion.deleted, true);
  const remove = requests.find(r => r.method === 'DELETE');
  assert.equal(new URL(remove.url, 'https://api.zoom.us').pathname, expectedPath);
});

test('same-named instances get incrementing folders; re-runs reuse their own folder', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'archive-folders-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const requests = [];
  const base = '2026-10-01 Co-lab';

  stubHierarchy(t, requests, participantFixture('uuid-instance-one'));
  const first = await listAssets(storeConfig(directory), 'uuid-instance-one', directory);
  assert.equal(first.directory, join(directory, base));

  stubHierarchy(t, requests, participantFixture('uuid-instance-two'));
  const second = await listAssets(storeConfig(directory), 'uuid-instance-two', directory);
  assert.equal(second.directory, join(directory, `${base} 2`));

  stubHierarchy(t, requests, participantFixture('uuid-instance-one'));
  const rerun = await listAssets(storeConfig(directory), 'uuid-instance-one', directory);
  assert.equal(rerun.directory, first.directory, 'same instance reuses its folder');

  // Legacy folders without a marker are adopted, not duplicated.
  const legacy = await import('node:fs').then(fs => {
    fs.mkdirSync(join(directory, 'legacy-only'), { recursive: true });
    return resolveInstanceDirectory(directory, 'legacy-only', 'uuid-legacy');
  });
  assert.equal(legacy, join(directory, 'legacy-only'));
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
  await downloadTranscript(config, index, file);
  await downloadTranscript(config, index, file);
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
  await assert.rejects(() => downloadTranscript(config, { directory, nameOf: () => 'video.mp4' }, { id: 'a', download_url: 'https://assets.test' }), /403/);
  assert.equal(existsSync(join(directory, 'video.mp4')), false);
});
