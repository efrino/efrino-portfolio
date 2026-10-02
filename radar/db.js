import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
const DIR = process.env.DATA_DIR || '/data';
fs.mkdirSync(DIR, { recursive: true });
export const db = new DatabaseSync(`${DIR}/radar.db`);
db.exec(`PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY, source TEXT NOT NULL, ext_id TEXT NOT NULL, title TEXT, company TEXT, url TEXT, location TEXT, salary TEXT, tags TEXT,
  description TEXT, posted_at TEXT, fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  track TEXT, score INTEGER, summary TEXT, why TEXT, concerns TEXT, draft TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new | shortlist | sent | archived
  scored_at TEXT, UNIQUE(source, ext_id));
CREATE INDEX IF NOT EXISTS items_score ON items(status, score DESC);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS runs (id INTEGER PRIMARY KEY, at TEXT NOT NULL DEFAULT (datetime('now')), source TEXT, fetched INTEGER, added INTEGER, error TEXT);`);
export const getSetting = (k, d) => { const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(k); return r ? JSON.parse(r.value) : d; };
export const setSetting = (k, v) => db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(k, JSON.stringify(v));
