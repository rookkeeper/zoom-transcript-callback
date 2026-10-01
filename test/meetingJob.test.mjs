import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMeetingJob } from '../src/meetingJob.mjs';
import { runWithWorkers, deleteMeeting } from '../src/assetArchive.mjs';

test('three workers continue after individual failures', async () => {
  let active = 0, peak = 0;
  const result = await runWithWorkers(Array.from({ length: 7 }, (_, id) => ({ id })), 3, async item => {
    peak = Math.max(peak, ++active);
    await new Promise(resolve => setTimeout(resolve, 5)); active--;
    if (item.id === 1) throw new Error('broken');
    return { id: item.id, status: 'succeeded' };
  });
  assert.equal(peak, 3); assert.equal(result.length, 7); assert.equal(result[1].status, 'failed');
});

test('transcript-first: agent starts after its download and the meeting deletes once everything verifies', async () => {
  const events = [];
  const job = createMeetingJob({ piLogPath: null }, {
    listAssets: async () => {
      const transcript = { id: 't' };
      const media = { id: 'v' };
      return { meeting: { id: 42 }, meetingId: '42', transcript, files: [transcript, media], nameOf: f => f.id };
    },
    downloadTranscript: async () => { events.push('transcript'); return '/tmp/t.vtt'; },
    downloadAssets: async () => { events.push('media'); return [{ id: 'v', name: 'v', status: 'succeeded' }]; },
    verifyLocal: () => { events.push('verify'); return ['t', 'v']; },
    deleteMeeting: async () => { events.push('delete'); return { deleted: true, polls: 1 }; },
    agent: async () => ({ status: 'succeeded', metadata: { summary: 'done' } }),
  });
  const result = await job('42');
  // transcript download precedes the agent; the whole meeting is removed last.
  assert.deepEqual(events, ['transcript', 'media', 'verify', 'delete']);
  assert.equal(result.metadata.deletedMeeting, true);
});

test('never deletes the meeting when a media download fails', async () => {
  let deleted = false;
  const job = createMeetingJob({ piLogPath: null }, {
    listAssets: async () => {
      const transcript = { id: 't' };
      const media = { id: 'v' };
      return { meeting: { id: 42 }, meetingId: '42', transcript, files: [transcript, media], nameOf: f => f.id };
    },
    downloadTranscript: async () => '/tmp/t.vtt',
    downloadAssets: async () => [{ id: 'v', name: 'v', status: 'failed', error: 'boom' }],
    verifyLocal: () => { throw new Error('should not verify'); },
    deleteMeeting: async () => { deleted = true; return { deleted: true, polls: 1 }; },
    agent: async () => ({ status: 'succeeded', metadata: {} }),
  });
  const result = await job('42');
  assert.equal(deleted, false);
  assert.equal(result.metadata.deletedMeeting, false);
  assert.match(result.error, /boom/);
});

test('deleteMeeting polls the whole-meeting delete until the meeting endpoint 404s', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'delete-poll-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const storePath = join(directory, 'tokens.json');
  const { storeTokens } = await import('../src/zoomOAuth.mjs');
  storeTokens(storePath, { access_token: 'fake', refresh_token: 'fake', expires_at: Date.now() + 60000 });
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  let gets = 0;
  globalThis.fetch = async (url, options = {}) => {
    if (options.method === 'DELETE') return new Response(null, { status: 204 });
    gets += 1;
    if (gets < 3) return new Response(JSON.stringify({ recording_files: [{ id: 'v' }], participant_audio_files: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify({ code: 3301 }), { status: 404, headers: { 'content-type': 'application/json' } });
  };
  const deletion = await deleteMeeting({ zoomClientId: 'c', zoomClientSecret: 's', zoomOAuthStorePath: storePath }, '42', { polls: 5, intervalMs: 1 });
  assert.equal(deletion.deleted, true);
  assert.equal(deletion.polls, 3);
});
