import type { ClientMessage, ServerMessage, StreamingConfig } from '@nelson/shared-types'

const BFF_WS_URL = process.env.EXPO_PUBLIC_BFF_WS_URL ?? 'ws://localhost:3001'
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]

type MessageHandler = (msg: ServerMessage) => void

export class TranscriptionClient {
  private ws: WebSocket | null = null
  private config: StreamingConfig | null = null
  private token: string | null = null
  private onMessage: MessageHandler | null = null
  private reconnectAttempts = 0
  private isIntentionallyClosed = false
  private pendingChunks: string[] = []
  private sessionStarted = false

  connect(token: string, config: StreamingConfig, onMessage: MessageHandler): void {
    this.token = token
    this.config = config
    this.onMessage = onMessage
    this.isIntentionallyClosed = false
    this.reconnectAttempts = 0
    this.doConnect()
  }

  private doConnect(): void {
    const url = `${BFF_WS_URL}/ws/transcription`
    this.ws = new WebSocket(url, undefined)

    this.ws.onopen = () => {
      console.log('[WS] Connected')
      this.reconnectAttempts = 0
      this.sessionStarted = false

      // Start session
      if (this.config) {
        this.send({ type: 'START_SESSION', config: this.config })
      }
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ServerMessage
        if (msg.type === 'SESSION_READY') {
          this.sessionStarted = true
          // Flush pending audio chunks
          for (const chunk of this.pendingChunks) {
            this.send({ type: 'AUDIO_CHUNK', data: chunk })
          }
          this.pendingChunks = []
        }
        this.onMessage?.(msg)
      } catch {
        console.error('[WS] Failed to parse message')
      }
    }

    this.ws.onerror = (event) => {
      console.error('[WS] Error:', event)
    }

    this.ws.onclose = () => {
      this.sessionStarted = false
      if (!this.isIntentionallyClosed) {
        this.attemptReconnect()
      }
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[WS] Max reconnect attempts reached')
      this.onMessage?.({ type: 'ERROR', code: 'CONNECTION_FAILED', message: 'No se pudo conectar al servidor' })
      return
    }

    const delay = RECONNECT_DELAYS[this.reconnectAttempts] ?? 16000
    this.reconnectAttempts++
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      if (!this.isIntentionallyClosed) {
        this.doConnect()
      }
    }, delay)
  }

  sendAudioChunk(base64Chunk: string): void {
    if (!this.sessionStarted) {
      this.pendingChunks.push(base64Chunk)
      return
    }
    this.send({ type: 'AUDIO_CHUNK', data: base64Chunk })
  }

  endSession(): void {
    this.send({ type: 'END_SESSION' })
  }

  disconnect(): void {
    this.isIntentionallyClosed = true
    this.ws?.close()
    this.ws = null
    this.sessionStarted = false
    this.pendingChunks = []
  }

  private send(msg: ClientMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }
}
