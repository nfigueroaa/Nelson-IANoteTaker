import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'

export interface RecordingResult {
  uri: string
  durationMs: number
}

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
  },
  // WAV/PCM output on iOS allows real-time streaming to Google STT (LINEAR16).
  // The WAV header is 44 bytes; AudioStreamer skips it automatically.
  ios: {
    extension: '.wav',
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 128000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {},
}

export class AudioRecorder {
  private recording: Audio.Recording | null = null
  private amplitudeCallback: ((db: number) => void) | null = null
  private progressTimer: NodeJS.Timeout | null = null

  async requestPermissions(): Promise<boolean> {
    const { status } = await Audio.requestPermissionsAsync()
    return status === 'granted'
  }

  async start(onAmplitude: (db: number) => void): Promise<void> {
    const granted = await this.requestPermissions()
    if (!granted) throw new Error('Permiso de micrófono denegado')

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    })

    this.amplitudeCallback = onAmplitude
    this.recording = new Audio.Recording()

    await this.recording.prepareToRecordAsync(RECORDING_OPTIONS)
    await this.recording.startAsync()

    // Poll amplitude every 150ms for waveform visualization
    this.progressTimer = setInterval(async () => {
      if (!this.recording) return
      try {
        const status = await this.recording.getStatusAsync()
        if (status.isRecording) {
          const db = status.metering ?? -60
          this.amplitudeCallback?.(db)
        }
      } catch {
        // ignore
      }
    }, 150)

    this.recording.setProgressUpdateInterval(150)
    this.recording.setOnRecordingStatusUpdate((status) => {
      if (status.isRecording && status.metering !== undefined) {
        this.amplitudeCallback?.(status.metering)
      }
    })
  }

  getActiveUri(): string | null {
    return this.recording?.getURI() ?? null
  }

  async pause(): Promise<void> {
    await this.recording?.pauseAsync()
  }

  async resume(): Promise<void> {
    await this.recording?.startAsync()
  }

  async stop(): Promise<RecordingResult | null> {
    if (this.progressTimer) {
      clearInterval(this.progressTimer)
      this.progressTimer = null
    }

    if (!this.recording) return null

    try {
      await this.recording.stopAndUnloadAsync()
      const status = await this.recording.getStatusAsync()
      const uri = this.recording.getURI()

      if (!uri) return null

      return {
        uri,
        durationMs: status.durationMillis ?? 0,
      }
    } finally {
      this.recording = null
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false })
    }
  }

  async cancel(): Promise<void> {
    if (this.progressTimer) {
      clearInterval(this.progressTimer)
      this.progressTimer = null
    }

    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync()
        const uri = this.recording.getURI()
        if (uri) await FileSystem.deleteAsync(uri, { idempotent: true })
      } catch {
        // ignore
      }
      this.recording = null
    }

    await Audio.setAudioModeAsync({ allowsRecordingIOS: false })
  }
}
