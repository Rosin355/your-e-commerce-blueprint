import { DatabaseSync } from 'node:sqlite';
import { requireFact } from '../lib/historical-order.mjs';

// One stable, private journal per store. Reserve and fsync BEFORE crossing the HTTP boundary.
export function openJournal(filename) {
  const db = new DatabaseSync(filename);
  db.exec(`PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS mappings(kind TEXT, legacy TEXT, digest TEXT NOT NULL,
      gid TEXT, state TEXT NOT NULL, PRIMARY KEY(kind,legacy), UNIQUE(kind,gid));
    CREATE TABLE IF NOT EXISTS decisions(legacy TEXT PRIMARY KEY, reason TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pilot(singleton INTEGER PRIMARY KEY CHECK(singleton=1), legacy TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS batches(singleton INTEGER PRIMARY KEY CHECK(singleton=1), source TEXT NOT NULL);`);
  return {
    bind(digest) {
      db.prepare('INSERT OR IGNORE INTO batches VALUES(1,?)').run(digest);
      requireFact(
        db.prepare('SELECT source FROM batches').get().source === digest,
        'SOURCE_REVISION_CHANGED',
      );
    },
    pilot(id) {
      db.prepare('INSERT OR IGNORE INTO pilot VALUES(1,?)').run(id);
      requireFact(db.prepare('SELECT legacy FROM pilot').get().legacy === id, 'PILOT_ID_CHANGED');
    },
    pending() {
      return db.prepare("SELECT kind, legacy FROM mappings WHERE state!='verified'").all();
    },
    get(kind, id) {
      return db.prepare('SELECT * FROM mappings WHERE kind=? AND legacy=?').get(kind, id);
    },
    reserve(kind, id, digest) {
      const r = db
        .prepare("INSERT OR IGNORE INTO mappings(kind,legacy,digest,state) VALUES(?,?,?,'pending')")
        .run(kind, id, digest);
      requireFact(r.changes === 1, 'CONCURRENT_OR_UNCERTAIN_INTENT');
    },
    record(kind, id, gid, state) {
      requireFact(typeof gid === 'string' && gid.startsWith('gid://shopify/'), 'GID_REQUIRED');
      const r = db
        .prepare('UPDATE mappings SET gid=?, state=? WHERE kind=? AND legacy=? AND (gid IS NULL OR gid=?)')
        .run(gid, state, kind, id, gid);
      requireFact(r.changes === 1, 'MAPPING_CHANGED');
    },
    decision(id, reason) {
      db.prepare('INSERT OR REPLACE INTO decisions VALUES(?,?)').run(id, reason);
    },
    close() {
      db.close();
    },
  };
}
