export type MeetingStatus = 'recording' | 'processing' | 'ready' | 'exported' | 'error'

export interface Meeting {
  id: string
  title: string
  startedAt: string // ISO string
  endedAt: string | null
  durationSeconds: number
  status: MeetingStatus
  languagesDetected: string[]
  audioFileUri: string | null
  driveFileId: string | null
  docsUrl: string | null
  summary: MeetingSummary | null
  createdAt: string
  updatedAt: string
}

export interface MeetingSummary {
  executiveSummary: string
  keyPoints: string[]
  actionItems: ActionItem[]
  decisions: string[]
  openQuestions: string[]
  generatedAt: string
  model: string
}

export interface ActionItem {
  id: string
  text: string
  owner: string | null
  dueDate: string | null
  completed: boolean
}

export interface AppSettings {
  primaryLanguage: string
  alternativeLanguages: string[]
  aiQuality: 'fast' | 'quality'
  autoExportToDrive: boolean
  driveParentFolderId: string | null
  saveAudioToDrive: boolean
  showLiveCaptions: boolean
  captionFontSize: 'small' | 'medium' | 'large'
  enableSpeakerDiarization: boolean
  estimatedSpeakerCount: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  primaryLanguage: 'es-ES',
  alternativeLanguages: ['en-US'],
  aiQuality: 'fast',
  autoExportToDrive: false,
  driveParentFolderId: null,
  saveAudioToDrive: false,
  showLiveCaptions: true,
  captionFontSize: 'medium',
  enableSpeakerDiarization: true,
  estimatedSpeakerCount: 4,
}
