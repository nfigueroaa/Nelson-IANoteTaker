import { create } from 'zustand'
import type { TranscriptSegment } from '@nelson/shared-types'

interface TranscriptState {
  segments: TranscriptSegment[]
  partialText: string
  currentLanguage: string
  speakerMap: Record<string, string>

  addSegment: (segment: TranscriptSegment) => void
  setPartialText: (text: string) => void
  setCurrentLanguage: (lang: string) => void
  updateSpeakerName: (speakerId: string, name: string) => void
  clearTranscript: () => void
}

export const useTranscriptStore = create<TranscriptState>()((set) => ({
  segments: [],
  partialText: '',
  currentLanguage: '',
  speakerMap: {},

  addSegment: (segment) =>
    set((state) => ({ segments: [...state.segments, segment] })),

  setPartialText: (partialText) => set({ partialText }),

  setCurrentLanguage: (currentLanguage) => set({ currentLanguage }),

  updateSpeakerName: (speakerId, name) =>
    set((state) => ({ speakerMap: { ...state.speakerMap, [speakerId]: name } })),

  clearTranscript: () =>
    set({ segments: [], partialText: '', currentLanguage: '', speakerMap: {} }),
}))
