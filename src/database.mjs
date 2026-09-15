import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';

export function openDatabase(path) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(path);
  if(path!==':memory:') chmodSync(path,0o600);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
  const version = db.prepare('PRAGMA user_version').get().user_version;
  if (version > 1) { db.close(); throw new Error('Unsupported database version'); }
  db.exec(`CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY, endpoint TEXT NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL,
    receivedAt TEXT NOT NULL, startedAt TEXT, endedAt TEXT,
    status TEXT NOT NULL CHECK(status IN ('received','running','succeeded','failed','incomplete')),
    error TEXT, metadata TEXT NOT NULL CHECK(json_valid(metadata)));
    CREATE INDEX IF NOT EXISTS activity_time ON activities(receivedAt DESC, id DESC);
    CREATE INDEX IF NOT EXISTS activity_filter ON activities(endpoint, status, receivedAt DESC);
    PRAGMA user_version=1;`);
  return db;
}
