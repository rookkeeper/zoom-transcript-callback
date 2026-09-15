import test from 'node:test';
import assert from 'node:assert/strict';
import { activityApi } from '../src/api.mjs';
test('activity API validates queries, delegates filters and resolves details', () => {
  const service = { list: q => [q], get: id => id === 'known' ? { id } : null };
  const call = path => activityApi(service, new URL(path, 'http://localhost'));
  assert.equal(call('/api/events?limit=2&endpoint=%2Fzoom&status=failed').status,200);
  assert.equal(call('/api/events?limit=2&endpoint=%2Fzoom&status=failed').body.items[0].endpoint,'/zoom');
  for (const q of ['limit=0','offset=-1','status=nope','limit=abc']) assert.equal(call('/api/events?'+q).status,400);
  assert.equal(call('/api/events/known').body.id,'known');
  assert.equal(call('/api/events/missing').status,404);
});
