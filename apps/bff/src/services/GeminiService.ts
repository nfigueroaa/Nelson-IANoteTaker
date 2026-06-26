import { GoogleGenerativeAI } from '@google/generative-ai'
import type { MeetingSummary, ActionItem } from '@nelson/shared-types'
import { v4 as uuidv4 } from 'uuid'

const MEETING_SYSTEM_PROMPT = `You are an expert meeting analyst. Analyze the provided meeting transcript and return a JSON object with exactly this structure:
{
  "executiveSummary": "2-3 paragraph summary of the meeting",
  "keyPoints": ["point 1", "point 2", ...],
  "actionItems": [{"text": "action", "owner": "person or null", "dueDate": "date or null"}],
  "decisions": ["decision 1", "decision 2"],
  "openQuestions": ["question 1", "question 2"]
}
Keep keyPoints to max 8 items. Extract actual names for owners when mentioned. Return ONLY valid JSON.`

interface AIOptions {
  quality: 'fast' | 'quality'
  languages: string[]
}

interface RawSummary {
  executiveSummary?: string
  keyPoints?: string[]
  actionItems?: Array<{ text?: string; owner?: string | null; dueDate?: string | null }>
  decisions?: string[]
  openQuestions?: string[]
}

export class GeminiService {
  private genai: GoogleGenerativeAI

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required')
    }
    this.genai = new GoogleGenerativeAI(apiKey)
  }

  async generateMeetingInsights(transcript: string, options: AIOptions): Promise<MeetingSummary> {
    const modelName = options.quality === 'quality' ? 'gemini-1.5-pro' : 'gemini-2.0-flash'

    const model = this.genai.getGenerativeModel({
      model: modelName,
      systemInstruction: MEETING_SYSTEM_PROMPT,
      generationConfig: { responseMimeType: 'application/json' },
    })

    const languageHint = options.languages.length > 0
      ? `The meeting may include speech in: ${options.languages.join(', ')}.`
      : ''

    const prompt = `${languageHint}\n\nAnalyze this meeting transcript:\n\n${transcript}`

    const result = await model.generateContent(prompt)
    const text = result.response.text()

    const parsed = JSON.parse(text) as RawSummary

    const actionItems: ActionItem[] = (parsed.actionItems ?? []).map((item) => ({
      id: uuidv4(),
      text: item.text ?? '',
      owner: item.owner ?? null,
      dueDate: item.dueDate ?? null,
      completed: false,
    }))

    return {
      executiveSummary: parsed.executiveSummary ?? '',
      keyPoints: parsed.keyPoints ?? [],
      actionItems,
      decisions: parsed.decisions ?? [],
      openQuestions: parsed.openQuestions ?? [],
      generatedAt: new Date().toISOString(),
      model: modelName,
    }
  }

  async generateRealtimeKeyPoints(partialTranscript: string): Promise<string[]> {
    const model = this.genai.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })

    const result = await model.generateContent(
      `Extract the 3 most important points discussed so far in this meeting transcript. Return JSON array of strings only.\n\n${partialTranscript}`
    )

    const parsed = JSON.parse(result.response.text())
    return Array.isArray(parsed) ? parsed : parsed.keyPoints ?? []
  }
}
