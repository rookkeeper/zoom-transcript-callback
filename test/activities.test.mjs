import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ActivityRepository } from '../src/repository.mjs';
import { ActivityService } from '../src/activities.mjs';

test('repository persists metadata and filters newest first across reopen', t => {
  const path = join(mkdtempSync(join(tmpdir(), 'activity-')), 'events.db');
  t.after(()=>rmSync(path.replace(/\/events.db$/,''),{recursive:true,force:true}));
  let repo = new ActivityRepository(path);
  assert.equal(statSync(path).mode & 0o777,0o600);
  const row = { id: 'a', endpoint: '/zoom/transcripts', type: 'zoom', title: 'Meeting', receivedAt: '2026-09-11', startedAt: null, endedAt: null, status: 'received', error: null, metadata: { nested: { values: [1, true] } } };
  repo.save(row); repo.close(); repo = new ActivityRepository(path);
  assert.deepEqual(repo.get('a'), row);
  repo.save({ ...row, id: 'b', receivedAt: '2026-09-12', endpoint: '/other' });
  assert.deepEqual(repo.list({ limit: 1, offset: 0 }).map(x => x.id), ['b']);
  assert.equal(repo.list({ endpoint: '/zoom/transcripts' }).length, 1);
  assert.equal(repo.list({ status: 'failed' }).length, 0);
  assert.throws(() => repo.save({ ...row, status: 'invalid' }));
  repo.close(); assert.throws(() => repo.save(row));
});

test('service timestamps transitions, sanitizes metadata, and rejects terminal updates', () => {
  const rows = new Map();
  const service = new ActivityService({ save: x => rows.set(x.id, structuredClone(x)), get: id => rows.get(id), list: () => [...rows.values()] });
  service.receive({ id: 'a', endpoint: '/zoom', title: 'Meeting', metadata: { downloadToken: 'secret', nested: { api_key: 'secret', count: 2 } } });
  assert.equal(rows.get('a').status, 'received');
  assert.deepEqual(rows.get('a').metadata, { nested: { count: 2 } });
  service.start('a'); assert.ok(rows.get('a').startedAt);
  service.finish('a', 'succeeded', { summary: 'Done' });
  assert.ok(rows.get('a').endedAt); assert.equal(rows.get('a').metadata.summary, 'Done');
  assert.throws(() => service.start('a'));
  for (const status of ['failed', 'incomplete']) {
    service.receive({ id: status, endpoint: '/other' }); service.start(status);
    service.finish(status, status, {}, 'reason'); assert.equal(rows.get(status).error, 'reason');
  }
  service.receive({ id: 'interrupted', endpoint: '/other' }); service.start('interrupted');
  service.recover(); assert.equal(rows.get('interrupted').status, 'incomplete');
});

test('service owns asynchronous processing and records thrown failures', async () => {
  const rows=new Map();
  const service=new ActivityService({save:x=>rows.set(x.id,x),get:id=>rows.get(id)});
  service.receive({id:'job',endpoint:'/zoom'});
  let complete;
  const promise=service.run('job',()=>new Promise(resolve=>{complete=resolve;}));
  assert.equal(service.get('job').status,'running');
  assert.throws(()=>service.start('job'));
  complete({status:'succeeded',metadata:{summary:'Done'}}); await promise;
  assert.equal(service.get('job').status,'succeeded');
  service.receive({id:'bad',endpoint:'/zoom'});
  await service.run('bad',async()=>{throw new Error('credential must not leak');});
  assert.equal(service.get('bad').status,'failed');
  assert.ok(!JSON.stringify(service.get('bad')).includes('credential'));
});
