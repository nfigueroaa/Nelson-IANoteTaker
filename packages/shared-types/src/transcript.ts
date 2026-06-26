export interface TranscriptSegment {
  id: string
  meetingId: string
  text: string
  isFinal: boolean
  confidence: number
  languageCode: string
  speakerId: string | null
  startTimeMs: number
  endTimeMs: number
  words: WordInfo[]
  createdAt: string
}

export interface WordInfo {
  word: string
  startTimeMs: number
  endTimeMs: number
  confidence: number
  speakerId: string | null
}
