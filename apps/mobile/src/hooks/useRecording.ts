import { useRef, useCallback, useEffect } from 'react'
import { Alert } from 'react-native'
import { v4 as uuidv4 } from 'uuid'
import { AudioRecorder } from '@/services/audio/AudioRecorder'
import { AudioStreamer } from '@/services/audio/AudioStreamer'
import { TranscriptionClient } from '@/services/transcription/TranscriptionClient'
import { MeetingRepository } from '@/services/storage/MeetingRepository'
import { ApiClient } from '@/services/api/ApiClient'
import { useRecordingStore } from '@/stores/recordingStore'
import { useTranscriptStore } from '@/stores/transcriptStore'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import type { ServerMessage, GenerateSummaryRequest, GenerateSummaryResponse } from '@nelson/shared-types'
import { useQueryClient } from '@tanstack/react-query'

const WAV_HEADER_BYTES = 44
const MAX_RECORDING_MS = 2 * 60 * 60 * 1000   // 2 horas hard limit
const WARNING_MS = (2 * 60 - 15) * 60 * 1000  // aviso a 1h 45min

export function useRecording() {
  const recorder = useRef(new AudioRecorder())
  const streamer = useRef(new AudioStreamer(WAV_HEADER_BYTES))
  const wsClient = useRef(new TranscriptionClient())
  const elapsedTimer = useRef<NodeJS.Timeout | null>(null)
  const warningTimer = useRef<NodeJS.Timeout | null>(null)
  const hardLimitTimer = useRef<NodeJS.Timeout | null>(null)
  // Ref para que el hardLimitTimer pueda llamar a stopRecording sin closure stale
  const stopRecordingRef = useRef<(() => Promise<string | null>) | null>(null)
  const queryClient = useQueryClient()

  const {
    setStatus, setCurrentMeetingId, setStartedAt, setElapsedMs, setAmplitude, reset,
  } = useRecordingStore()

  const { addSegment, setPartialText, setCurrentLanguage, clearTranscript } = useTranscriptStore()

  const accessToken = useAuthStore((s) => s.accessToken)
  const settings = useSettingsStore()

  useEffect(() => {
    return () => {
      elapsedTimer.current && clearInterval(elapsedTimer.current)
      warningTimer.current && clearTimeout(warningTimer.current)
      hardLimitTimer.current && clearTimeout(hardLimitTimer.current)
      streamer.current.stop()
      wsClient.current.disconnect()
    }
  }, [])

  function clearSessionTimers() {
    elapsedTimer.current && clearInterval(elapsedTimer.current)
    warningTimer.current && clearTimeout(warningTimer.current)
    hardLimitTimer.current && clearTimeout(hardLimitTimer.current)
    elapsedTimer.current = null
    warningTimer.current = null
    hardLimitTimer.current = null
  }

  function handleServerMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'TRANSCRIPT_PARTIAL':
        setPartialText(msg.text)
        break

      case 'TRANSCRIPT_FINAL': {
        setPartialText('')
        const meetingId = useRecordingStore.getState().currentMeetingId
        if (!meetingId) break

        const segment = {
          id: msg.segmentId,
          meetingId,
          text: msg.text,
          isFinal: true,
          confidence: msg.confidence,
          languageCode: msg.languageCode,
          speakerId: msg.speakerId,
          startTimeMs: msg.startTimeMs,
          endTimeMs: msg.endTimeMs,
          words: msg.words,
          createdAt: new Date().toISOString(),
        }
        addSegment(segment)
        MeetingRepository.addSegment(segment).catch(console.error)
        break
      }

      case 'LANGUAGE_CHANGED':
        setCurrentLanguage(msg.to)
        break

      case 'SESSION_WARNING':
        Alert.alert(
          '⏱ Límite de grabación',
          `Quedan ${msg.minutesRemaining} minutos. La grabación se detendrá automáticamente al llegar a 2 horas.`,
          [{ text: 'Entendido' }]
        )
        break

      case 'ERROR':
        console.error('[Recording] Server error:', msg.code, msg.message)
        break
    }
  }

  const startRecording = useCallback(async () => {
    setStatus('starting')
    clearTranscript()

    try {
      const meetingId = uuidv4()
      const now = new Date()

      await recorder.current.start((amplitude) => setAmplitude(amplitude))

      await MeetingRepository.create({
        id: meetingId,
        title: `Reunión ${now.toLocaleDateString('es-ES', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        startedAt: now,
        audioFileUri: null,
      })

      setCurrentMeetingId(meetingId)
      setStartedAt(Date.now())
      setCurrentLanguage(settings.primaryLanguage)
      setStatus('recording')

      const startMs = Date.now()
      elapsedTimer.current = setInterval(() => {
        setElapsedMs(Date.now() - startMs)
      }, 1000)

      // Aviso al usuario 15 min antes del límite
      warningTimer.current = setTimeout(() => {
        Alert.alert(
          '⏱ Límite de grabación',
          'Quedan 15 minutos. La grabación se detendrá automáticamente al llegar a 2 horas.',
          [{ text: 'Entendido' }]
        )
      }, WARNING_MS)

      // Auto-stop a las 2 horas — usa ref para evitar closure stale
      hardLimitTimer.current = setTimeout(async () => {
        const id = await stopRecordingRef.current?.()
        if (id) {
          Alert.alert(
            '⏹ Grabación detenida',
            'Se alcanzó el límite máximo de 2 horas de grabación.',
            [{ text: 'Ver resumen', style: 'default' }]
          )
        }
      }, MAX_RECORDING_MS)

      if (accessToken) {
        wsClient.current.connect(
          accessToken,
          {
            primaryLanguage: settings.primaryLanguage,
            alternativeLanguages: settings.alternativeLanguages,
            speakerCount: settings.estimatedSpeakerCount,
            enableDiarization: settings.enableSpeakerDiarization,
          },
          handleServerMessage
        )

        const audioUri = recorder.current.getActiveUri()
        if (audioUri) {
          streamer.current.start(audioUri, (chunk) => {
            wsClient.current.sendAudioChunk(chunk)
          })
        }
      }

    } catch (err) {
      console.error('[Recording] Failed to start:', err)
      clearSessionTimers()
      setStatus('idle')
      throw err
    }
  }, [accessToken, settings])

  const pauseRecording = useCallback(async () => {
    await recorder.current.pause()
    elapsedTimer.current && clearInterval(elapsedTimer.current)
    elapsedTimer.current = null
    setStatus('paused')
  }, [])

  const resumeRecording = useCallback(async () => {
    await recorder.current.resume()
    const currentElapsed = useRecordingStore.getState().elapsedMs
    const resumedAt = Date.now() - currentElapsed
    elapsedTimer.current = setInterval(() => {
      setElapsedMs(Date.now() - resumedAt)
    }, 1000)
    setStatus('recording')
  }, [])

  const stopRecording = useCallback(async (): Promise<string | null> => {
    const meetingId = useRecordingStore.getState().currentMeetingId
    const elapsedMs = useRecordingStore.getState().elapsedMs

    if (!meetingId) return null

    clearSessionTimers()
    setStatus('stopping')

    await streamer.current.flush()
    streamer.current.stop()

    wsClient.current.endSession()

    const result = await recorder.current.stop()
    wsClient.current.disconnect()

    const durationSeconds = Math.round(elapsedMs / 1000)
    const segments = useTranscriptStore.getState().segments
    const languagesDetected = [...new Set(segments.map((s) => s.languageCode).filter(Boolean))]

    await MeetingRepository.finalize(meetingId, {
      endedAt: new Date(),
      durationSeconds,
      languagesDetected,
      status: 'processing',
    })

    if (result?.uri) {
      await MeetingRepository.updateStatus(meetingId, 'processing')
    }

    setStatus('processing')
    queryClient.invalidateQueries({ queryKey: ['meetings'] })

    // Limitar el transcript a 50k chars para controlar costos de Gemini
    const fullTranscript = segments.map((s) => s.text).join(' ').slice(0, 50_000)
    if (fullTranscript.trim().length > 50 && accessToken) {
      try {
        const req: GenerateSummaryRequest = {
          meetingId,
          transcript: fullTranscript,
          quality: settings.aiQuality,
          languages: languagesDetected,
        }
        const resp = await ApiClient.post<GenerateSummaryResponse>('/api/ai/summarize', req, false)
        await MeetingRepository.setSummary(meetingId, resp.summary)
        queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] })
        queryClient.invalidateQueries({ queryKey: ['meetings'] })
      } catch (err) {
        console.error('[Recording] AI summary failed:', err)
        await MeetingRepository.updateStatus(meetingId, 'ready')
      }
    } else {
      await MeetingRepository.updateStatus(meetingId, 'ready')
    }

    setStatus('idle')
    reset()

    return meetingId
  }, [accessToken, settings.aiQuality, queryClient])

  // Mantener la ref sincronizada con la última versión de stopRecording
  useEffect(() => {
    stopRecordingRef.current = stopRecording
  }, [stopRecording])

  const cancelRecording = useCallback(async () => {
    clearSessionTimers()
    streamer.current.stop()

    wsClient.current.endSession()
    wsClient.current.disconnect()
    await recorder.current.cancel()

    const meetingId = useRecordingStore.getState().currentMeetingId
    if (meetingId) {
      await MeetingRepository.delete(meetingId)
    }

    clearTranscript()
    reset()
  }, [])

  return { startRecording, pauseRecording, resumeRecording, stopRecording, cancelRecording }
}
