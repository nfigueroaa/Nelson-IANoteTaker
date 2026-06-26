import { View, Text, Pressable, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useRecording } from '@/hooks/useRecording'
import { AudioWaveform } from '@/components/recording/AudioWaveform'
import { LiveCaptionOverlay } from '@/components/recording/LiveCaptionOverlay'
import { RecordingTimer } from '@/components/recording/RecordingTimer'
import { LanguageDetectionBadge } from '@/components/recording/LanguageDetectionBadge'
import { useTranscriptStore } from '@/stores/transcriptStore'
import { useRecordingStore } from '@/stores/recordingStore'

export default function RecordScreen() {
  const { startRecording, stopRecording, pauseRecording, resumeRecording, cancelRecording } = useRecording()
  const status = useRecordingStore((s) => s.status)
  const amplitude = useRecordingStore((s) => s.amplitude)
  const elapsedMs = useRecordingStore((s) => s.elapsedMs)
  const currentMeetingId = useRecordingStore((s) => s.currentMeetingId)
  const currentLanguage = useTranscriptStore((s) => s.currentLanguage)
  const partialText = useTranscriptStore((s) => s.partialText)
  const segments = useTranscriptStore((s) => s.segments)

  const isIdle = status === 'idle'
  const isRecording = status === 'recording'
  const isPaused = status === 'paused'
  const isProcessing = status === 'processing'
  const isActive = isRecording || isPaused

  async function handleMainButton() {
    if (isIdle) {
      await startRecording()
    } else if (isRecording) {
      await pauseRecording()
    } else if (isPaused) {
      await resumeRecording()
    }
  }

  async function handleStop() {
    const meetingId = await stopRecording()
    if (meetingId) {
      router.push(`/meeting/${meetingId}`)
    }
  }

  async function handleCancel() {
    await cancelRecording()
  }

  const lastThreeSegments = segments.slice(-3)

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={['top']}>
      <View className="flex-1 px-5 pt-4">
        {/* Top row: language badge + timer */}
        <View className="flex-row items-center justify-between mb-6">
          <LanguageDetectionBadge languageCode={currentLanguage} visible={isActive} />
          <RecordingTimer elapsedMs={elapsedMs} isActive={isRecording} />
        </View>

        {/* Waveform */}
        <View className="items-center mb-6">
          <AudioWaveform amplitude={amplitude} isActive={isRecording} />
        </View>

        {/* Live Captions */}
        <View className="flex-1 mb-6">
          {isActive ? (
            <LiveCaptionOverlay
              segments={lastThreeSegments}
              partialText={partialText}
            />
          ) : isProcessing ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-5xl mb-4">✨</Text>
              <Text className="text-white text-lg font-semibold">Generando resumen...</Text>
              <Text className="text-white/50 text-sm mt-2">La IA está analizando tu reunión</Text>
            </View>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-white/30 text-center text-base">
                Presiona grabar para iniciar{'\n'}la transcripción en tiempo real
              </Text>
            </View>
          )}
        </View>

        {/* Controls */}
        <View className="items-center pb-4">
          {/* Main record button */}
          <Pressable
            onPress={handleMainButton}
            disabled={isProcessing}
            className={`w-24 h-24 rounded-full items-center justify-center mb-8 ${
              isRecording
                ? 'bg-red-600 active:bg-red-700'
                : isPaused
                ? 'bg-yellow-600 active:bg-yellow-700'
                : 'bg-primary-600 active:bg-primary-700'
            }`}
          >
            <Text className="text-white text-4xl">
              {isRecording ? '⏸' : isPaused ? '▶' : '●'}
            </Text>
          </Pressable>

          {/* Secondary controls */}
          {isActive && (
            <View className="flex-row gap-8">
              <Pressable
                onPress={handleCancel}
                className="px-6 py-3 rounded-xl bg-white/10 active:bg-white/20"
              >
                <Text className="text-white/70 font-semibold">Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleStop}
                className="px-6 py-3 rounded-xl bg-green-700 active:bg-green-800"
              >
                <Text className="text-white font-semibold">✓ Finalizar</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}
