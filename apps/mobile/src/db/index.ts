import * as SQLite from 'expo-sqlite'
import { drizzle } from 'drizzle-orm/expo-sqlite'
import * as schema from './schema'

const sqlite = SQLite.openDatabaseSync('nelson_notetaker.db')
export const db = drizzle(sqlite, { schema })

export async function initDatabase() {
  await sqlite.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      ended_at INTEGER,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'recording',
      languages_detected TEXT NOT NULL DEFAULT '[]',
      audio_file_uri TEXT,
      drive_file_id TEXT,
      docs_url TEXT,
      summary_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transcript_segments (
      id TEXT PRIMARY KEY,
      meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      is_final INTEGER NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.9,
      language_code TEXT NOT NULL DEFAULT '',
      speaker_id TEXT,
      start_time_ms INTEGER NOT NULL DEFAULT 0,
      end_time_ms INTEGER NOT NULL DEFAULT 0,
      words_json TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_segments_meeting ON transcript_segments(meeting_id);
    CREATE INDEX IF NOT EXISTS idx_meetings_started ON meetings(started_at DESC);

    CREATE VIRTUAL TABLE IF NOT EXISTS transcript_fts USING fts5(
      text,
      meeting_id UNINDEXED,
      content='transcript_segments',
      content_rowid='rowid'
    );
  `)
  console.log('[DB] Database initialized')
}
