import { useState } from 'react'
import { MeetingRepository } from '@/services/storage/MeetingRepository'
import { ApiClient } from '@/services/api/ApiClient'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { ExportToDocsRequest, ExportToDocsResponse } from '@nelson/shared-types'
import { useQueryClient } from '@tanstack/react-query'

export function useExport() {
  const [isExporting, setIsExporting] = useState(false)
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((s) => s.accessToken)
  const settings = useSettingsStore()

  async function exportToDocs(meetingId: string): Promise<ExportToDocsResponse | null> {
    if (!accessToken) throw new Error('No hay sesión de Google activa')

    setIsExporting(true)
    try {
      const meeting = await MeetingRepository.findById(meetingId)
      if (!meeting) throw new Error('Reunión no encontrada')
      if (!meeting.summary) throw new Error('No hay resumen disponible para exportar')

      const segments = await MeetingRepository.getSegments(meetingId)

      const body: ExportToDocsRequest = {
        meetingId,
        meetingTitle: meeting.title,
        meetingDate: meeting.startedAt,
        durationSeconds: meeting.durationSeconds,
        transcript: segments.map((s) => ({
          text: s.text,
          startTimeMs: s.startTimeMs,
          speakerId: s.speakerId,
          languageCode: s.languageCode,
        })),
        summary: meeting.summary,
        driveParentFolderId: settings.driveParentFolderId,
        saveAudioToDrive: settings.saveAudioToDrive,
      }

      // Pass auth token as Authorization header via fetch override
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BFF_URL ?? 'http://localhost:3001'}/api/export/docs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        }
      )

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.message ?? 'Error al exportar')
      }

      const result = await response.json() as ExportToDocsResponse
      await MeetingRepository.setDocsUrl(meetingId, result.docUrl, result.driveFileId)
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] })
      queryClient.invalidateQueries({ queryKey: ['meetings'] })

      return result
    } finally {
      setIsExporting(false)
    }
  }

  return { exportToDocs, isExporting }
}
