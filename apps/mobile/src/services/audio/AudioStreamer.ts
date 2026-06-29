import * as FileSystem from 'expo-file-system'

// Intervalo adaptativo según el tamaño estimado del archivo.
// Para archivos grandes, leer el archivo completo cada 200ms sería muy costoso en CPU.
// Base64 ≈ 4/3 × bytes reales.
function intervalForSize(sentBase64Length: number): number {
  const estimatedMB = (sentBase64Length * 3) / (4 * 1024 * 1024)
  if (estimatedMB < 10) return 200   // < 10 MB → 200 ms
  if (estimatedMB < 50) return 500   // 10–50 MB → 500 ms
  if (estimatedMB < 100) return 1000 // 50–100 MB → 1 s
  return 2000                         // > 100 MB (>60 min WAV) → 2 s
}

// Streams a growing audio file in base64 chunks.
// Reads the file incrementally by tracking how many base64 characters have been sent.
// Base64 alignment is maintained by only sending complete 4-char groups.
export class AudioStreamer {
  private timer: NodeJS.Timeout | null = null
  private fileUri: string | null = null
  private sentBase64Length = 0
  private onChunk: ((base64Chunk: string) => void) | null = null
  private headerSkipBytes: number

  // headerSkipBytes: bytes a saltar al inicio del archivo (44 para WAV header).
  constructor(headerSkipBytes = 0) {
    this.headerSkipBytes = headerSkipBytes
  }

  start(fileUri: string, onChunk: (base64Chunk: string) => void): void {
    this.fileUri = fileUri
    this.onChunk = onChunk
    this.sentBase64Length = 0
    this.scheduleNextRead(200)
  }

  private scheduleNextRead(intervalMs: number): void {
    if (!this.fileUri) return
    this.timer = setTimeout(() => {
      this.readAndSend()
        .catch(() => {})
        .finally(() => {
          if (this.fileUri) {
            // Recalcular el intervalo en cada ciclo según el tamaño actual
            this.scheduleNextRead(intervalForSize(this.sentBase64Length))
          }
        })
    }, intervalMs)
  }

  private async readAndSend(): Promise<void> {
    if (!this.fileUri || !this.onChunk) return

    const info = await FileSystem.getInfoAsync(this.fileUri)
    if (!info.exists) return

    const base64 = await FileSystem.readAsStringAsync(this.fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    })

    const skipBase64 = Math.ceil((this.headerSkipBytes * 4) / 3 / 4) * 4
    const startPos = Math.max(this.sentBase64Length, skipBase64)

    if (base64.length <= startPos) return

    const newPortion = base64.slice(startPos)
    // Solo enviar grupos completos de 4 chars base64 para evitar errores de decodificación
    const alignedLen = Math.floor(newPortion.length / 4) * 4
    if (alignedLen === 0) return

    const chunk = newPortion.slice(0, alignedLen)
    this.sentBase64Length = startPos + alignedLen
    this.onChunk(chunk)
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
      clearTimeout(this.timer)
      this.timer = null
    }
    this.fileUri = null
    this.sentBase64Length = 0
    this.onChunk = null
  }
}
