import { useRef, useCallback, useEffect } from 'react'
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

// WAV header is 44 bytes; skip it so only PCM samples are streamed to STT
const WAV_HEADER_BYTES = 44

export function useRecording() {
  const recorder = useRef(new AudioRecorder())
  const streamer = useRef(new AudioStreamer(WAV_HEADER_BYTES))
  const wsClient = useRef(new TranscriptionClient())
  const elapsedTimer = useRef<NodeJS.Timeout | null>(null)
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
      streamer.current.stop()
      wsClient.current.disconnect()
    }
  }, [])

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

      // Create meeting record
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

      // Start elapsed timer
      const startMs = Date.now()
      elapsedTimer.current = setInterval(() => {
        setElapsedMs(Date.now() - startMs)
      }, 1000)

      // Connect WebSocket and start streaming audio chunks
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

        // Begin streaming the growing audio file to the BFF via WebSocket
        const audioUri = recorder.current.getActiveUri()
        if (audioUri) {
          streamer.current.start(audioUri, (chunk) => {
            wsClient.current.sendAudioChunk(chunk)
          })
        }
      }

    } catch (err) {
      console.error('[Recording] Failed to start:', err)
      setStatus('idle')
      throw err
    }
  }, [accessToken, settings])

  const pauseRecording = useCallback(async () => {
    await recorder.current.pause()
    elapsedTimer.current && clearInterval(elapsedTimer.current)
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
    const startedAt = useRecordingStore.getState().startedAt
    const elapsedMs = useRecordingStore.getState().elapsedMs

    if (!meetingId) return null

    elapsedTimer.current && clearInterval(elapsedTimer.current)
    setStatus('stopping')

    // Flush final audio bytes before ending the STT session
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

    // Generate AI summary in background
    const fullTranscript = segments.map((s) => s.text).join(' ')
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

  const cancelRecording = useCallback(async () => {
    elapsedTimer.current && clearInterval(elapsedTimer.current)
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
