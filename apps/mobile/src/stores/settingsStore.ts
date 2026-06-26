import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'
import { DEFAULT_SETTINGS, type AppSettings } from '@nelson/shared-types'

// Lightweight persistent storage using expo-secure-store for settings
const settingsStorage = {
  getItem: async (key: string) => SecureStore.getItemAsync(key),
  setItem: async (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: async (key: string) => SecureStore.deleteItemAsync(key),
}

interface SettingsState extends AppSettings {
  setPrimaryLanguage: (lang: string) => void
  setAlternativeLanguages: (langs: string[]) => void
  setAiQuality: (quality: 'fast' | 'quality') => void
  setAutoExportToDrive: (v: boolean) => void
  setSaveAudioToDrive: (v: boolean) => void
  setShowLiveCaptions: (v: boolean) => void
  setCaptionFontSize: (size: AppSettings['captionFontSize']) => void
  setEnableSpeakerDiarization: (v: boolean) => void
  setEstimatedSpeakerCount: (n: number) => void
  setDriveParentFolderId: (id: string | null) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setPrimaryLanguage: (primaryLanguage) => set({ primaryLanguage }),
      setAlternativeLanguages: (alternativeLanguages) => set({ alternativeLanguages }),
      setAiQuality: (aiQuality) => set({ aiQuality }),
      setAutoExportToDrive: (autoExportToDrive) => set({ autoExportToDrive }),
      setSaveAudioToDrive: (saveAudioToDrive) => set({ saveAudioToDrive }),
      setShowLiveCaptions: (showLiveCaptions) => set({ showLiveCaptions }),
      setCaptionFontSize: (captionFontSize) => set({ captionFontSize }),
      setEnableSpeakerDiarization: (enableSpeakerDiarization) => set({ enableSpeakerDiarization }),
      setEstimatedSpeakerCount: (estimatedSpeakerCount) => set({ estimatedSpeakerCount }),
      setDriveParentFolderId: (driveParentFolderId) => set({ driveParentFolderId }),
    }),
    {
      name: 'settings-store',
      storage: createJSONStorage(() => settingsStorage),
    }
  )
)
