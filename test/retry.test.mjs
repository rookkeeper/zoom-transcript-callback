import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ActivityService } from '../src/activities.mjs';
import { ActivityRepository } from '../src/repository.mjs';
import { runTranscriptJob } from '../src/retry.mjs';

function setup(t) {
  const repo = new ActivityRepository(':memory:');
  t.after(() => repo.close());
  return new ActivityService(repo);
}

const details = { topic: 'Retry Meeting', meetingId: '42', meetingUuid: 'uuid', recordingFileId: 'file' };

test('succeeds on the first attempt without a retry row', async t => {
  const activities = setup(t);
  let calls = 0;
  const result = await runTranscriptJob({
    activities, details, endpoint: '/zoom/transcripts', type: 'recording.transcript_completed',
    maxAttempts: 2, retryDelayMs: 1,
    processor: async () => ({ status: 'succeeded', metadata: { summary: 'Done' } }),
  });
  calls += 1;
  assert.equal(calls, 1);
  assert.equal(result.status, 'succeeded');
  assert.equal(activities.list().length, 1);
});

test('retries once after a stall and links the retry row', async t => {
  const activities = setup(t);
  const outcomes = [
    { status: 'failed', error: 'Pi stalled with no output for 180s' },
    { status: 'succeeded', metadata: { summary: 'Recovered' } },
  ];
  const result = await runTranscriptJob({
    activities, details, endpoint: '/zoom/transcripts', type: 'recording.transcript_completed',
    maxAttempts: 2, retryDelayMs: 1,
    processor: async () => outcomes.shift() ?? { status: 'failed', error: 'out of outcomes' },
  });
  assert.equal(result.status, 'succeeded');
  const rows = activities.list();
  assert.equal(rows.length, 2);
  const retry = rows.find(row => (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata).method === 'MANUAL_RETRY' || (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata).retryOf);
  assert.ok(retry, 'expected a retry row linked to the first attempt');
  const meta = typeof retry.metadata === 'string' ? JSON.parse(retry.metadata) : retry.metadata;
  assert.equal(meta.retryOf, rows.find(row => row.id !== retry.id).id);
});

test('gives up after max attempts and reports the last error', async t => {
  const activities = setup(t);
  let calls = 0;
  const result = await runTranscriptJob({
    activities, details, endpoint: '/zoom/transcripts', type: 'recording.transcript_completed',
    maxAttempts: 2, retryDelayMs: 1,
    processor: async () => ({ status: 'failed', error: 'boom' }),
  });
  calls += 1;
  assert.equal(result.status, 'failed');
  assert.equal(result.error, 'boom');
  assert.equal(activities.list().length, 2);
  assert.equal(calls, 1);
});

test('does not retry when Pi could not start', async t => {
  const activities = setup(t);
  let calls = 0;
  const result = await runTranscriptJob({
    activities, details, endpoint: '/zoom/transcripts', type: 'recording.transcript_completed',
    maxAttempts: 3, retryDelayMs: 1,
    processor: async () => {
      calls += 1;
      return { status: 'failed', error: 'Pi could not start' };
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.status, 'failed');
  assert.equal(activities.list().length, 1);
});

test('processor defaults bound the idle watchdog at ten minutes with attempts and delay', async t => {
  const root = mkdtempSync(join(tmpdir(), 'retry-defaults-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const { loadConfig } = await import('../src/config.mjs');
  const previous = {
    ZOOM_WEBHOOK_SECRET: process.env.ZOOM_WEBHOOK_SECRET,
    PI_SKILLS_ROOT: process.env.PI_SKILLS_ROOT,
    PI_IDLE_TIMEOUT_MS: process.env.PI_IDLE_TIMEOUT_MS,
    PI_MAX_ATTEMPTS: process.env.PI_MAX_ATTEMPTS,
    PI_RETRY_DELAY_MS: process.env.PI_RETRY_DELAY_MS,
  };
  process.env.ZOOM_WEBHOOK_SECRET = 'test-secret';
  process.env.PI_SKILLS_ROOT = root;
  delete process.env.PI_IDLE_TIMEOUT_MS;
  delete process.env.PI_MAX_ATTEMPTS;
  delete process.env.PI_RETRY_DELAY_MS;
  const { mkdirSync, writeFileSync } = await import('node:fs');
  for (const skill of ['how-to-use-peeps-obsidian', 'obsidian-general-usage']) {
    mkdirSync(join(root, skill), { recursive: true });
    writeFileSync(join(root, skill, 'SKILL.md'), '# skill');
  }
  try {
    const config = loadConfig();
    assert.equal(config.piIdleTimeoutMs, 10 * 60 * 1000);
    assert.equal(config.piMaxAttempts, 2);
    assert.equal(config.piRetryDelayMs, 60 * 1000);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
