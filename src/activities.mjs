import { randomUUID } from 'node:crypto';
export const statuses = ['received', 'running', 'succeeded', 'failed', 'incomplete'];
function safe(value) {
  if (Array.isArray(value)) return value.map(safe);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !/token|secret|password|authorization|api.?key|download.?url/i.test(key)).map(([key,v]) => [key,safe(v)]));
  return value;
}
export class ActivityService {
  async run(id, processor) {
    this.start(id);
    try {
      const result=await processor();
      return this.finish(id,result.status,result.metadata || {},result.error || null);
    } catch(error) {
      console.error(JSON.stringify({event:'processor_failed',activityId:id,code:error.code || error.name}));
      return this.finish(id,'failed',{},'Processor failed; inspect execution log');
    }
  }
  constructor(repository) { this.repository = repository; }
  receive({ id = randomUUID(), endpoint, type = 'unknown', title = 'Callback received', metadata = {} }) {
    const row = { id, endpoint, type, title, metadata: safe(metadata), receivedAt: new Date().toISOString(), startedAt: null, endedAt: null, status: 'received', error: null };
    this.repository.save(row); return row;
  }
  update(id, fields) {
    const row = this.get(id);
    if (!row || !['received','running'].includes(row.status)) throw new Error('Activity is not active');
    const next = { ...row, ...fields, metadata: safe({ ...row.metadata, ...fields.metadata }) };
    this.repository.save(next); return next;
  }
  start(id) {
    if(this.get(id)?.status!=='received') throw new Error('Activity already started');
    return this.update(id, { status: 'running', startedAt: new Date().toISOString() });
  }
  finish(id, status, metadata = {}, error = null) {
    if (!['succeeded','failed','incomplete'].includes(status)) throw new Error('Invalid completion status');
    return this.update(id, { status, metadata, error, endedAt: new Date().toISOString() });
  }
  recover() {
    for (const row of this.repository.unfinished?.() ?? this.repository.list()) {
      if (['received','running'].includes(row.status)) this.finish(row.id,'incomplete',{},'Server restarted before outcome was recorded');
    }
  }
  get(id) { return this.repository.get(id); }
  list(query) { return this.repository.list(query); }
}
