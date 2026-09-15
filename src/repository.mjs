import { openDatabase } from './database.mjs';
const decode = row => row ? { ...row, metadata: JSON.parse(row.metadata) } : null;
export class ActivityRepository {
  constructor(path) { this.db = openDatabase(path); }
  save(row) {
    this.db.prepare(`INSERT INTO activities VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
      endpoint=excluded.endpoint,type=excluded.type,title=excluded.title,startedAt=excluded.startedAt,
      endedAt=excluded.endedAt,status=excluded.status,error=excluded.error,metadata=excluded.metadata`).run(
      row.id,row.endpoint,row.type,row.title,row.receivedAt,row.startedAt,row.endedAt,row.status,row.error,JSON.stringify(row.metadata));
  }
  get(id) { return decode(this.db.prepare('SELECT * FROM activities WHERE id=?').get(id)); }
  list({ endpoint = '', status = '', limit = 50, offset = 0 } = {}) {
    return this.db.prepare(`SELECT * FROM activities WHERE (?='' OR endpoint=?) AND (?='' OR status=?)
      ORDER BY receivedAt DESC,id DESC LIMIT ? OFFSET ?`).all(endpoint,endpoint,status,status,Math.min(100,Math.max(1,limit)),Math.max(0,offset)).map(decode);
  }
  unfinished() { return this.db.prepare("SELECT * FROM activities WHERE status IN ('received','running')").all().map(decode); }
  close() { this.db.close(); }
}
