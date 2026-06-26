import express from 'express'
import cors from 'cors'
import http from 'http'
import { WebSocketServer } from 'ws'
import { healthRouter } from './routes/health'
import { aiRouter } from './routes/ai'
import { exportRouter } from './routes/export'
import { handleTranscriptionSession } from './websocket/TranscriptionHandler'

export function createServer() {
  const app = express()

  app.use(cors({
    origin: (process.env.ALLOWED_ORIGINS ?? '').split(',').filter(Boolean),
    credentials: true,
  }))
  app.use(express.json({ limit: '50mb' }))

  app.use('/health', healthRouter)
  app.use('/api/ai', aiRouter)
  app.use('/api/export', exportRouter)

  const server = http.createServer(app)
  const wss = new WebSocketServer({ server, path: '/ws/transcription' })

  wss.on('connection', (ws, req) => {
    const authHeader = req.headers['authorization']
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    console.log(`[WS] New connection from ${req.socket.remoteAddress}`)
    handleTranscriptionSession(ws, token)
  })

  return { app, wss, server }
}
