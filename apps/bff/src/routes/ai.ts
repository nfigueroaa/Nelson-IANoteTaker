import { Router, Request, Response } from 'express'
import { GeminiService } from '../services/GeminiService'
import type { GenerateSummaryRequest, GenerateSummaryResponse } from '@nelson/shared-types'

export const aiRouter = Router()
const geminiService = new GeminiService()

aiRouter.post('/summarize', async (req: Request, res: Response) => {
  try {
    const body = req.body as GenerateSummaryRequest

    if (!body.transcript || !body.meetingId) {
      res.status(400).json({ code: 'INVALID_REQUEST', message: 'transcript and meetingId are required' })
      return
    }

    const summary = await geminiService.generateMeetingInsights(body.transcript, {
      quality: body.quality ?? 'fast',
      languages: body.languages ?? [],
    })

    const response: GenerateSummaryResponse = { summary }
    res.json(response)
  } catch (error) {
    console.error('[AI] Summarization error:', error)
    res.status(500).json({ code: 'AI_ERROR', message: 'Failed to generate summary' })
  }
})
