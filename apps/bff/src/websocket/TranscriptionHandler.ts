import WebSocket from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { SpeechToTextService } from '../services/SpeechToTextService'
import type { ClientMessage, ServerMessage } from '@nelson/shared-types'

const PING_INTERVAL_MS = 30_000
const MAX_SESSION_MS = 2 * 60 * 60 * 1000       // 2 horas hard limit
const WARNING_BEFORE_MS = 15 * 60 * 1000          // aviso 15 min antes

export function handleTranscriptionSession(ws: WebSocket, _token: string | null) {
  const sessionId = uuidv4()
  console.log(`[WS:${sessionId}] Session started`)

  const stt = new SpeechToTextService()
  let sessionActive = false
  let lastLanguage = ''

  const pingTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping()
    }
  }, PING_INTERVAL_MS)

  // Aviso 15 min antes del límite
  const warningTimer = setTimeout(() => {
    send({ type: 'SESSION_WARNING', minutesRemaining: 15, reason: 'Límite de 2 horas de grabación' })
    console.log(`[WS:${sessionId}] Warning sent: 15 min remaining`)
  }, MAX_SESSION_MS - WARNING_BEFORE_MS)

  // Cierre forzado al llegar a 2 horas
  const hardLimitTimer = setTimeout(() => {
    console.log(`[WS:${sessionId}] Hard limit reached (2h), closing session`)
    sessionActive = false
    stt.stop()
    send({ type: 'SESSION_ENDED' })
    ws.close(1000, 'Session duration limit reached')
  }, MAX_SESSION_MS)

  function send(msg: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }

  ws.on('message', (data: Buffer) => {
    let msg: ClientMessage
    try {
      msg = JSON.parse(data.toString()) as ClientMessage
    } catch {
      send({ type: 'ERROR', code: 'INVALID_MESSAGE', message: 'Message must be valid JSON' })
      return
    }

    switch (msg.type) {
      case 'START_SESSION': {
        if (sessionActive) {
          send({ type: 'ERROR', code: 'SESSION_ALREADY_ACTIVE', message: 'A session is already active' })
          return
        }

        sessionActive = true
        lastLanguage = msg.config.primaryLanguage

        stt.start(
          msg.config,
          (result) => {
            if (result.type === 'partial') {
              send({
                type: 'TRANSCRIPT_PARTIAL',
                text: result.text,
                confidence: result.confidence,
                languageCode: result.languageCode,
              })
            } else {
              // Detect language change
              if (result.languageCode && result.languageCode !== lastLanguage) {
                send({ type: 'LANGUAGE_CHANGED', from: lastLanguage, to: result.languageCode })
                lastLanguage = result.languageCode
              }

              send({
                type: 'TRANSCRIPT_FINAL',
                segmentId: uuidv4(),
                text: result.text,
                words: result.words,
                languageCode: result.languageCode,
                speakerId: result.speakerId,
                startTimeMs: result.startTimeMs,
                endTimeMs: result.endTimeMs,
                confidence: result.confidence,
              })
            }
          },
          (error) => {
            console.error(`[WS:${sessionId}] STT error:`, error.message)
            send({ type: 'ERROR', code: 'STT_ERROR', message: error.message })
          }
        )

        send({ type: 'SESSION_READY' })
        console.log(`[WS:${sessionId}] STT session started with lang: ${msg.config.primaryLanguage}`)
        break
      }

      case 'AUDIO_CHUNK': {
        if (!sessionActive) {
          send({ type: 'ERROR', code: 'NO_ACTIVE_SESSION', message: 'Start a session first' })
          return
        }

        const audioBuffer = Buffer.from(msg.data, 'base64')
        stt.sendAudio(audioBuffer)
        break
      }

      case 'END_SESSION': {
        sessionActive = false
        stt.stop()
        send({ type: 'SESSION_ENDED' })
        console.log(`[WS:${sessionId}] Session ended by client`)
        break
      }

      case 'PING': {
        send({ type: 'PONG' })
        break
      }
    }
  })

  function cleanup() {
    clearInterval(pingTimer)
    clearTimeout(warningTimer)
    clearTimeout(hardLimitTimer)
    if (sessionActive) {
      stt.stop()
      sessionActive = false
    }
  }

  ws.on('close', () => {
    cleanup()
    console.log(`[WS:${sessionId}] Connection closed`)
  })

  ws.on('error', (err) => {
    console.error(`[WS:${sessionId}] WebSocket error:`, err.message)
    cleanup()
  })
}
