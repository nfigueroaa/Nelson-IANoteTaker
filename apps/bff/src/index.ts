import 'dotenv/config'
import { createServer } from './server'

const PORT = parseInt(process.env.PORT ?? '3001', 10)

const { app, wss, server } = createServer()

server.listen(PORT, () => {
  console.log(`[BFF] HTTP server running on port ${PORT}`)
  console.log(`[BFF] WebSocket server ready`)
  console.log(`[BFF] Environment: ${process.env.NODE_ENV ?? 'development'}`)
})

process.on('SIGTERM', () => {
  console.log('[BFF] SIGTERM received, shutting down gracefully')
  wss.close()
  server.close(() => process.exit(0))
})
