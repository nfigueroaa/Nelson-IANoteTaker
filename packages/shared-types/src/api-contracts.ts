import type { MeetingSummary } from './meeting'
import type { WordInfo } from './transcript'

// ─── WebSocket Messages: Mobile → BFF ────────────────────────────────────────

export interface StreamingConfig {
  primaryLanguage: string
  alternativeLanguages: string[]
  speakerCount: number
  enableDiarization: boolean
}

export type ClientMessage =
  | { type: 'START_SESSION'; config: StreamingConfig }
  | { type: 'AUDIO_CHUNK'; data: string } // base64-encoded PCM
  | { type: 'END_SESSION' }
  | { type: 'PING' }

// ─── WebSocket Messages: BFF → Mobile ────────────────────────────────────────

export type ServerMessage =
  | { type: 'SESSION_READY' }
  | { type: 'TRANSCRIPT_PARTIAL'; text: string; confidence: number; languageCode: string }
  | {
      type: 'TRANSCRIPT_FINAL'
      segmentId: string
      text: string
      words: WordInfo[]
      languageCode: string
      speakerId: string | null
      startTimeMs: number
      endTimeMs: number
      confidence: number
    }
  | { type: 'LANGUAGE_CHANGED'; from: string; to: string }
  | { type: 'ERROR'; code: string; message: string }
  | { type: 'SESSION_ENDED' }
  | { type: 'PONG' }
  | { type: 'SESSION_WARNING'; minutesRemaining: number; reason: string }

// ─── REST API Contracts ───────────────────────────────────────────────────────

export interface GenerateSummaryRequest {
  meetingId: string
  transcript: string
  quality: 'fast' | 'quality'
  languages: string[]
}

export interface GenerateSummaryResponse {
  summary: MeetingSummary
}

export interface ExportToDocsRequest {
  meetingId: string
  meetingTitle: string
  meetingDate: string
  durationSeconds: number
  transcript: Array<{ text: string; startTimeMs: number; speakerId: string | null; languageCode: string }>
  summary: MeetingSummary
  driveParentFolderId: string | null
  saveAudioToDrive: boolean
  audioFileBase64?: string
}

export interface ExportToDocsResponse {
  docId: string
  docUrl: string
  driveFileId: string | null
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}
