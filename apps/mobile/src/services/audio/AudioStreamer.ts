import * as FileSystem from 'expo-file-system'

const POLL_INTERVAL_MS = 200

// Streams a growing audio file in base64 chunks.
// Reads the file incrementally by tracking how many base64 characters have been sent.
// Base64 alignment is maintained by only sending complete 4-char groups.
export class AudioStreamer {
  private timer: NodeJS.Timeout | null = null
  private fileUri: string | null = null
  private sentBase64Length = 0
  private onChunk: ((base64Chunk: string) => void) | null = null
  private headerSkipBytes: number

  // headerSkipBytes: bytes to skip at the start of the file (e.g. 44 for WAV header).
  // Set to 0 for formats where streaming from byte 0 is safe.
  constructor(headerSkipBytes = 0) {
    this.headerSkipBytes = headerSkipBytes
  }

  start(fileUri: string, onChunk: (base64Chunk: string) => void): void {
    this.fileUri = fileUri
    this.onChunk = onChunk
    this.sentBase64Length = 0

    this.timer = setInterval(() => {
      this.readAndSend().catch(() => {})
    }, POLL_INTERVAL_MS)
  }

  private async readAndSend(): Promise<void> {
    if (!this.fileUri || !this.onChunk) return

    try {
      const info = await FileSystem.getInfoAsync(this.fileUri)
      if (!info.exists) return

      const base64 = await FileSystem.readAsStringAsync(this.fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      if (base64.length <= this.sentBase64Length) return

      // Skip header: headerSkipBytes * (4/3) base64 chars (rounded to 4-char boundary)
      const skipBase64 = Math.ceil((this.headerSkipBytes * 4) / 3 / 4) * 4
      const startPos = Math.max(this.sentBase64Length, skipBase64)

      const newPortion = base64.slice(startPos)
      // Only send complete 4-char base64 groups to avoid decoding errors
      const alignedLen = Math.floor(newPortion.length / 4) * 4
      if (alignedLen === 0) return

      const chunk = newPortion.slice(0, alignedLen)
      this.sentBase64Length = startPos + alignedLen

      this.onChunk(chunk)
    } catch {
      // File may not exist yet or may be temporarily locked
    }
  }

  async flush(): Promise<void> {
    if (!this.fileUri || !this.onChunk) return
    try {
      const base64 = await FileSystem.readAsStringAsync(this.fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const skipBase64 = Math.ceil((this.headerSkipBytes * 4) / 3 / 4) * 4
      const startPos = Math.max(this.sentBase64Length, skipBase64)

      if (base64.length > startPos) {
        const remaining = base64.slice(startPos)
        this.sentBase64Length = base64.length
        this.onChunk(remaining)
      }
    } catch {}
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.fileUri = null
    this.sentBase64Length = 0
    this.onChunk = null
  }
}
