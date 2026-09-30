import test from 'node:test';
import assert from 'node:assert/strict';
import { createMeetingJob } from '../src/meetingJob.mjs';
import { runWithWorkers } from '../src/assetArchive.mjs';

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

test('transcript and archive run independently; archive failure does not erase agent success', async () => {
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  const job = createMeetingJob({}, {
    getIndex: async () => ({ meeting: { id: 42 }, directory: '/tmp', transcript: {} }),
    ensureLocal: async () => '/tmp/transcript.vtt',
    agent: async () => { release(); return { status: 'succeeded', metadata: { summary: 'done' } }; },
    archiveMedia: async () => { await ready; return [{ status: 'failed', error: 'network' }]; },
  });
  const result = await job('42');
  assert.equal(result.status, 'succeeded'); assert.equal(result.metadata.mediaStatus, 'failed');
});
