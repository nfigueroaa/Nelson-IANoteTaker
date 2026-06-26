import { eq, desc, sql } from 'drizzle-orm'
import { db } from '@/db'
import { meetings, transcriptSegments } from '@/db/schema'
import type { Meeting, MeetingSummary, TranscriptSegment } from '@nelson/shared-types'

function rowToMeeting(row: typeof meetings.$inferSelect): Meeting {
  return {
    id: row.id,
    title: row.title,
    startedAt: new Date(row.startedAt).toISOString(),
    endedAt: row.endedAt ? new Date(row.endedAt).toISOString() : null,
    durationSeconds: row.durationSeconds,
    status: row.status as Meeting['status'],
    languagesDetected: JSON.parse(row.languagesDetected),
    audioFileUri: row.audioFileUri,
    driveFileId: row.driveFileId,
    docsUrl: row.docsUrl,
    summary: row.summaryJson ? JSON.parse(row.summaryJson) : null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  }
}

function rowToSegment(row: typeof transcriptSegments.$inferSelect): TranscriptSegment {
  return {
    id: row.id,
    meetingId: row.meetingId,
    text: row.text,
    isFinal: row.isFinal,
    confidence: row.confidence,
    languageCode: row.languageCode,
    speakerId: row.speakerId,
    startTimeMs: row.startTimeMs,
    endTimeMs: row.endTimeMs,
    words: JSON.parse(row.wordsJson),
    createdAt: new Date(row.createdAt).toISOString(),
  }
}

export const MeetingRepository = {
  async create(data: {
    id: string
    title: string
    startedAt: Date
    audioFileUri: string | null
  }): Promise<Meeting> {
    const now = new Date()
    await db.insert(meetings).values({
      id: data.id,
      title: data.title,
      startedAt: data.startedAt,
      status: 'recording',
      languagesDetected: '[]',
      audioFileUri: data.audioFileUri,
      createdAt: now,
      updatedAt: now,
    })
    const rows = await db.select().from(meetings).where(eq(meetings.id, data.id))
    return rowToMeeting(rows[0])
  },

  async findAll(searchQuery?: string): Promise<Meeting[]> {
    if (searchQuery?.trim()) {
      const rows = await db.all(sql`
        SELECT m.* FROM meetings m
        WHERE m.id IN (
          SELECT meeting_id FROM transcript_fts WHERE transcript_fts MATCH ${searchQuery}
        )
        ORDER BY m.started_at DESC
        LIMIT 100
      `)
      return (rows as any[]).map(rowToMeeting)
    }

    const rows = await db.select().from(meetings).orderBy(desc(meetings.startedAt)).limit(100)
    return rows.map(rowToMeeting)
  },

  async findById(id: string): Promise<Meeting | null> {
    const rows = await db.select().from(meetings).where(eq(meetings.id, id))
    return rows.length > 0 ? rowToMeeting(rows[0]) : null
  },

  async updateTitle(id: string, title: string): Promise<void> {
    await db.update(meetings).set({ title, updatedAt: new Date() }).where(eq(meetings.id, id))
  },

  async updateStatus(id: string, status: Meeting['status']): Promise<void> {
    await db.update(meetings).set({ status, updatedAt: new Date() }).where(eq(meetings.id, id))
  },

  async finalize(id: string, data: {
    endedAt: Date
    durationSeconds: number
    languagesDetected: string[]
    status: Meeting['status']
  }): Promise<void> {
    await db.update(meetings).set({
      endedAt: data.endedAt,
      durationSeconds: data.durationSeconds,
      languagesDetected: JSON.stringify(data.languagesDetected),
      status: data.status,
      updatedAt: new Date(),
    }).where(eq(meetings.id, id))
  },

  async setSummary(id: string, summary: MeetingSummary): Promise<void> {
    await db.update(meetings).set({
      summaryJson: JSON.stringify(summary),
      status: 'ready',
      updatedAt: new Date(),
    }).where(eq(meetings.id, id))
  },

  async setDocsUrl(id: string, docsUrl: string, driveFileId: string | null): Promise<void> {
    await db.update(meetings).set({
      docsUrl,
      driveFileId,
      status: 'exported',
      updatedAt: new Date(),
    }).where(eq(meetings.id, id))
  },

  async delete(id: string): Promise<void> {
    await db.delete(meetings).where(eq(meetings.id, id))
  },

  async addSegment(segment: TranscriptSegment): Promise<void> {
    await db.insert(transcriptSegments).values({
      id: segment.id,
      meetingId: segment.meetingId,
      text: segment.text,
      isFinal: segment.isFinal,
      confidence: segment.confidence,
      languageCode: segment.languageCode,
      speakerId: segment.speakerId,
      startTimeMs: segment.startTimeMs,
      endTimeMs: segment.endTimeMs,
      wordsJson: JSON.stringify(segment.words),
      createdAt: new Date(),
    })

    // Update FTS index
    if (segment.isFinal) {
      await db.run(sql`
        INSERT INTO transcript_fts(rowid, text, meeting_id)
        SELECT rowid, text, meeting_id FROM transcript_segments WHERE id = ${segment.id}
      `)
    }
  },

  async getSegments(meetingId: string, searchQuery?: string): Promise<TranscriptSegment[]> {
    if (searchQuery?.trim()) {
      const rows = await db.all(sql`
        SELECT ts.* FROM transcript_segments ts
        JOIN transcript_fts fts ON fts.rowid = ts.rowid
        WHERE fts.meeting_id = ${meetingId} AND transcript_fts MATCH ${searchQuery}
        ORDER BY ts.start_time_ms ASC
      `)
      return (rows as any[]).map(rowToSegment)
    }

    const rows = await db
      .select()
      .from(transcriptSegments)
      .where(eq(transcriptSegments.meetingId, meetingId))
      .orderBy(transcriptSegments.startTimeMs)

    return rows.map(rowToSegment)
  },
}
