import { google } from 'googleapis'
import type { ExportToDocsRequest, ExportToDocsResponse } from '@nelson/shared-types'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

function formatTimestamp(ms: number): string {
  const totalSecs = Math.floor(ms / 1000)
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export class GoogleDocsService {
  private auth: ReturnType<typeof google.auth.fromJSON>

  constructor(accessToken: string) {
    const oauth2Client = new google.auth.OAuth2()
    oauth2Client.setCredentials({ access_token: accessToken })
    this.auth = oauth2Client as any
  }

  async createMeetingDocument(data: ExportToDocsRequest): Promise<ExportToDocsResponse> {
    const docs = google.docs({ version: 'v1', auth: this.auth as any })
    const drive = google.drive({ version: 'v3', auth: this.auth as any })

    const dateStr = new Date(data.meetingDate).toLocaleDateString('es-ES', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    const title = `${data.meetingTitle} – ${dateStr}`

    // Create empty document
    const createResp = await docs.documents.create({ requestBody: { title } })
    const docId = createResp.data.documentId!

    // Build document content via batchUpdate
    const requests: any[] = []
    let cursor = 1 // Google Docs body starts at index 1

    const insertText = (text: string) => {
      requests.push({ insertText: { location: { index: cursor }, text } })
      cursor += text.length
    }

    const applyStyle = (startIndex: number, endIndex: number, namedStyleType: string) => {
      requests.push({
        updateParagraphStyle: {
          range: { startIndex, endIndex },
          paragraphStyle: { namedStyleType },
          fields: 'namedStyleType',
        },
      })
    }

    // Header: Meeting metadata
    const metaText = `Reunión: ${data.meetingTitle}\nFecha: ${dateStr} | Duración: ${formatDuration(data.durationSeconds)}\n\n`
    insertText(metaText)

    // Section: Executive Summary
    const summaryHeadingStart = cursor
    insertText('Resumen Ejecutivo\n')
    applyStyle(summaryHeadingStart, cursor, 'HEADING_1')
    insertText(data.summary.executiveSummary + '\n\n')

    // Section: Key Points
    if (data.summary.keyPoints.length > 0) {
      const kpHeadingStart = cursor
      insertText('Puntos Clave\n')
      applyStyle(kpHeadingStart, cursor, 'HEADING_1')
      for (const point of data.summary.keyPoints) {
        insertText(`• ${point}\n`)
      }
      insertText('\n')
    }

    // Section: Action Items
    if (data.summary.actionItems.length > 0) {
      const aiHeadingStart = cursor
      insertText('Tareas y Acuerdos\n')
      applyStyle(aiHeadingStart, cursor, 'HEADING_1')
      for (const item of data.summary.actionItems) {
        const owner = item.owner ? ` (${item.owner})` : ''
        const due = item.dueDate ? ` – Fecha límite: ${item.dueDate}` : ''
        insertText(`☐ ${item.text}${owner}${due}\n`)
      }
      insertText('\n')
    }

    // Section: Decisions
    if (data.summary.decisions.length > 0) {
      const decHeadingStart = cursor
      insertText('Decisiones Tomadas\n')
      applyStyle(decHeadingStart, cursor, 'HEADING_1')
      for (const decision of data.summary.decisions) {
        insertText(`• ${decision}\n`)
      }
      insertText('\n')
    }

    // Section: Full Transcript
    const txHeadingStart = cursor
    insertText('Transcripción Completa\n')
    applyStyle(txHeadingStart, cursor, 'HEADING_1')

    for (const segment of data.transcript) {
      const ts = formatTimestamp(segment.startTimeMs)
      const speaker = segment.speakerId ? `[${segment.speakerId}] ` : ''
      insertText(`[${ts}] ${speaker}${segment.text}\n`)
    }

    // Execute batchUpdate
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: { requests },
    })

    // Move to Drive folder if specified
    if (data.driveParentFolderId) {
      const fileResp = await drive.files.get({ fileId: docId, fields: 'parents' })
      const prevParents = (fileResp.data.parents ?? []).join(',')

      await drive.files.update({
        fileId: docId,
        addParents: data.driveParentFolderId,
        removeParents: prevParents,
        fields: 'id, parents',
      })
    }

    const docUrl = `https://docs.google.com/document/d/${docId}/edit`

    // Upload audio to Drive if requested
    let driveFileId: string | null = null
    if (data.saveAudioToDrive && data.audioFileBase64) {
      const audioBuffer = Buffer.from(data.audioFileBase64, 'base64')
      const audioResp = await drive.files.create({
        requestBody: {
          name: `${title} – Audio.m4a`,
          mimeType: 'audio/mp4',
          parents: data.driveParentFolderId ? [data.driveParentFolderId] : undefined,
        },
        media: {
          mimeType: 'audio/mp4',
          body: audioBuffer,
        },
        fields: 'id',
      })
      driveFileId = audioResp.data.id ?? null
    }

    return { docId, docUrl, driveFileId }
  }
}
