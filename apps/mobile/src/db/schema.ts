import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

export const meetings = sqliteTable('meetings', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
  endedAt: integer('ended_at', { mode: 'timestamp_ms' }),
  durationSeconds: integer('duration_seconds').default(0).notNull(),
  status: text('status').notNull().default('recording'),
  languagesDetected: text('languages_detected').default('[]').notNull(),
  audioFileUri: text('audio_file_uri'),
  driveFileId: text('drive_file_id'),
  docsUrl: text('docs_url'),
  summaryJson: text('summary_json'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
})

export const transcriptSegments = sqliteTable('transcript_segments', {
  id: text('id').primaryKey(),
  meetingId: text('meeting_id').notNull().references(() => meetings.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  isFinal: integer('is_final', { mode: 'boolean' }).notNull(),
  confidence: real('confidence').notNull().default(0.9),
  languageCode: text('language_code').notNull().default(''),
  speakerId: text('speaker_id'),
  startTimeMs: integer('start_time_ms').notNull().default(0),
  endTimeMs: integer('end_time_ms').notNull().default(0),
  wordsJson: text('words_json').default('[]').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
})

export type MeetingRow = typeof meetings.$inferSelect
export type TranscriptSegmentRow = typeof transcriptSegments.$inferSelect
