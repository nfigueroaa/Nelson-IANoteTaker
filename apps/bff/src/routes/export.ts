import { Router, Request, Response } from 'express'
import { GoogleDocsService } from '../services/GoogleDocsService'
import type { ExportToDocsRequest, ExportToDocsResponse } from '@nelson/shared-types'

export const exportRouter = Router()

exportRouter.post('/docs', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization']
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!accessToken) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Google OAuth token required' })
    return
  }

  try {
    const body = req.body as ExportToDocsRequest

    if (!body.meetingId || !body.transcript || !body.summary) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: 'meetingId, transcript, and summary are required' })
      return
    }

    const docsService = new GoogleDocsService(accessToken)
    const result = await docsService.createMeetingDocument(body)

    const response: ExportToDocsResponse = result
    res.json(response)
  } catch (error) {
    console.error('[Export] Google Docs error:', error)
    res.status(500).json({ code: 'EXPORT_ERROR', message: 'Failed to export to Google Docs' })
  }
})
