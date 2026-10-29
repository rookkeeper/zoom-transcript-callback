import { EventEmitter } from 'node:events';
import { createHash, randomUUID } from 'node:crypto';

export class TranscriptState extends EventEmitter {
  constructor({ maxRows = 2000, maxBytes = 512 * 1024 } = {}) {
    super();
    this.epoch = randomUUID();
    this.maxRows = maxRows;
    this.maxBytes = maxBytes;
    this.rows = [];
    this.bytes = 0;
    this.dropped = 0;
    this.nextId = 1;
    this.seen = new Set();
    this.status = 'waiting';
    this.detail = 'Waiting for a hosted meeting to start RTMS.';
  }
  snapshot() {
    return { epoch: this.epoch, rows: this.rows, dropped: this.dropped, status: this.status, detail: this.detail };
  }
  begin(meeting) {
    if (this.meeting !== meeting) {
      this.meeting = meeting;
      this.seen.clear();
      this.clear();
    }
  }
  clear() {
    this.rows = []; this.bytes = 0; this.dropped = 0;
    this.emit('update', { type: 'snapshot', ...this.snapshot() });
  }
  setStatus(status, detail = '') {
    this.status = status; this.detail = detail;
    this.emit('update', { type: 'status', status, detail });
  }
  append(content) {
    if (!content || typeof content.data !== 'string' || !content.data.trim() || content.data.length > 8192 ||
        !Number.isSafeInteger(content.timestamp) || content.timestamp < 0 ||
        (content.user_name !== undefined && (typeof content.user_name !== 'string' || content.user_name.length > 256)) ||
        (content.user_id !== undefined && !Number.isSafeInteger(content.user_id))) return false;
    const speaker = String(content.user_id ?? content.user_name ?? 'unknown');
    const name = content.user_name || 'Unknown speaker';
    const key = createHash('sha256').update(JSON.stringify([speaker, content.timestamp, content.start_time, content.end_time, content.data])).digest('hex');
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    if (this.seen.size > 4096) this.seen.delete(this.seen.values().next().value);
    const row = { id: this.nextId++, speaker, name, text: content.data, timestamp: content.timestamp };
    const size = Buffer.byteLength(JSON.stringify(row));
    if (size > this.maxBytes) { this.dropped++; return false; }
    this.rows.push(row); this.bytes += size;
    while (this.rows.length > this.maxRows || this.bytes > this.maxBytes) {
      this.bytes -= Buffer.byteLength(JSON.stringify(this.rows.shift())); this.dropped++;
    }
    this.emit('update', { type: 'append', row, firstId: this.rows[0].id, dropped: this.dropped });
    return true;
  }
}
