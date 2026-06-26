import { SpeechClient, protos } from '@google-cloud/speech'
import type { StreamingConfig } from '@nelson/shared-types'

type SpeechRecognizeStream = ReturnType<SpeechClient['streamingRecognize']>
type StreamingRecognizeResponse = protos.google.cloud.speech.v1.IStreamingRecognizeResponse
type Duration = protos.google.protobuf.IDuration

const MAX_STREAM_DURATION_MS = 4.5 * 60 * 1000 // 4.5 minutes (Google STT limit is 5 min)

export interface STTResult {
  type: 'partial' | 'final'
  text: string
  confidence: number
  languageCode: string
  speakerId: string | null
  startTimeMs: number
  endTimeMs: number
  words: Array<{
    word: string
    startTimeMs: number
    endTimeMs: number
    confidence: number
    speakerId: string | null
  }>
}

type STTResultCallback = (result: STTResult) => void
type ErrorCallback = (error: Error) => void

export class SpeechToTextService {
  private client: SpeechClient
  private recognizeStream: SpeechRecognizeStream | null = null
  private streamStartTime = 0
  private restartTimer: NodeJS.Timeout | null = null
  private config: StreamingConfig | null = null
  private onResult: STTResultCallback | null = null
  private onError: ErrorCallback | null = null
  private pendingAudioBuffer: Buffer[] = []
  private timeOffsetMs = 0
  private active = false

  constructor() {
    this.client = new SpeechClient()
  }

  start(config: StreamingConfig, onResult: STTResultCallback, onError: ErrorCallback) {
    this.config = config
    this.onResult = onResult
    this.onError = onError
    this.active = true
    this.timeOffsetMs = 0
    this.createStream()
  }

  sendAudio(chunk: Buffer) {
    if (!this.active) return

    if (this.recognizeStream?.writable) {
      this.recognizeStream.write(chunk)
    } else {
      this.pendingAudioBuffer.push(chunk)
    }
  }

  stop() {
    this.active = false
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }
    if (this.recognizeStream) {
      this.recognizeStream.end()
      this.recognizeStream = null
    }
  }

  private createStream() {
    if (!this.config || !this.active) return

    const request = {
      config: {
        encoding: 'LINEAR16' as const,
        sampleRateHertz: 16000,
        languageCode: this.config.primaryLanguage,
        alternativeLanguageCodes: this.config.alternativeLanguages,
        enableAutomaticPunctuation: true,
        enableSpeakerDiarization: this.config.enableDiarization,
        diarizationSpeakerCount: this.config.speakerCount,
        model: 'latest_long',
        useEnhanced: true,
        metadata: { interactionType: 'DISCUSSION' as const },
      },
      interimResults: true,
    }

    this.recognizeStream = this.client.streamingRecognize(request)
    this.streamStartTime = Date.now()

    this.recognizeStream.on('data', (response: StreamingRecognizeResponse) => {
      if (!response.results) return

      for (const result of response.results) {
        if (!result.alternatives?.[0]) continue

        const alt = result.alternatives[0]
        const isFinal = result.isFinal ?? false
        const text = alt.transcript ?? ''
        const confidence = alt.confidence ?? 0.9
        const languageCode = (result as any).languageCode ?? this.config!.primaryLanguage

        let startTimeMs = 0
        let endTimeMs = 0
        const words: STTResult['words'] = []

        if (alt.words && alt.words.length > 0) {
          startTimeMs = this.timeOffsetMs + nanoToMs(alt.words[0].startTime)
          endTimeMs = this.timeOffsetMs + nanoToMs(alt.words[alt.words.length - 1].endTime)

          for (const w of alt.words) {
            words.push({
              word: w.word ?? '',
              startTimeMs: this.timeOffsetMs + nanoToMs(w.startTime),
              endTimeMs: this.timeOffsetMs + nanoToMs(w.endTime),
              confidence: w.confidence ?? confidence,
              speakerId: w.speakerTag ? `Speaker ${w.speakerTag}` : null,
            })
          }
        }

        const speakerId = words.length > 0 ? words[words.length - 1].speakerId : null

        this.onResult?.({
          type: isFinal ? 'final' : 'partial',
          text,
          confidence,
          languageCode,
          speakerId,
          startTimeMs,
          endTimeMs,
          words,
        })
      }
    })

    this.recognizeStream.on('error', (err: Error) => {
      if (!this.active) return
      console.error('[STT] Stream error:', err.message)
      if (err.message.includes('exceeded maximum allowed stream duration')) {
        this.restartStream()
      } else {
        this.onError?.(err)
      }
    })

    this.recognizeStream.on('end', () => {
      if (this.active) {
        this.restartStream()
      }
    })

    // Flush pending audio
    for (const chunk of this.pendingAudioBuffer) {
      this.recognizeStream.write(chunk)
    }
    this.pendingAudioBuffer = []

    // Schedule proactive restart before the 5-minute hard limit
    this.restartTimer = setTimeout(() => {
      if (this.active) this.restartStream()
    }, MAX_STREAM_DURATION_MS)
  }

  private restartStream() {
    if (!this.active) return
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }

    this.timeOffsetMs += Date.now() - this.streamStartTime

    console.log(`[STT] Restarting stream at offset ${this.timeOffsetMs}ms`)

    if (this.recognizeStream) {
      this.recognizeStream.removeAllListeners()
      this.recognizeStream.end()
      this.recognizeStream = null
    }

    setTimeout(() => this.createStream(), 250)
  }
}

function nanoToMs(time: Duration | null | undefined): number {
  if (!time) return 0
  const seconds = Number(time.seconds ?? 0)
  const nanos = Number(time.nanos ?? 0)
  return Math.round(seconds * 1000 + nanos / 1_000_000)
}
