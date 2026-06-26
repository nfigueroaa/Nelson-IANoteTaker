import { View, Text, ScrollView, Pressable, TextInput, Share, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useState } from 'react'
import { useMeeting } from '@/hooks/useMeetings'
import { useExport } from '@/hooks/useExport'
import { formatDuration, formatDateTime } from '@/utils/formatters'
import { MeetingRepository } from '@/services/storage/MeetingRepository'
import { useQueryClient } from '@tanstack/react-query'

export default function MeetingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { meeting, isLoading } = useMeeting(id)
  const { exportToDocs, isExporting } = useExport()
  const queryClient = useQueryClient()
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState('')

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-brand-dark items-center justify-center">
        <ActivityIndicator color="#3b82f6" size="large" />
      </SafeAreaView>
    )
  }

  if (!meeting) {
    return (
      <SafeAreaView className="flex-1 bg-brand-dark items-center justify-center">
        <Text className="text-white">Reunión no encontrada</Text>
      </SafeAreaView>
    )
  }

  async function handleSaveTitle() {
    if (!titleInput.trim() || !id) return
    await MeetingRepository.updateTitle(id, titleInput.trim())
    queryClient.invalidateQueries({ queryKey: ['meeting', id] })
    setIsEditingTitle(false)
  }

  async function handleExport() {
    if (!id) return
    try {
      const result = await exportToDocs(id)
      if (result?.docUrl) {
        Alert.alert(
          '✅ Exportado',
          'El documento se creó en Google Docs.',
          [
            { text: 'Compartir enlace', onPress: () => Share.share({ url: result.docUrl, message: result.docUrl }) },
            { text: 'OK' },
          ]
        )
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo exportar a Google Docs. Verifica tu conexión.')
    }
  }

  const summary = meeting.summary

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-3 pb-2 gap-3">
        <Pressable onPress={() => router.back()} className="p-2">
          <Text className="text-primary-500 text-lg">←</Text>
        </Pressable>
        <View className="flex-1">
          {isEditingTitle ? (
            <TextInput
              value={titleInput}
              onChangeText={setTitleInput}
              onBlur={handleSaveTitle}
              onSubmitEditing={handleSaveTitle}
              autoFocus
              className="text-white text-lg font-bold border-b border-primary-500 pb-1"
            />
          ) : (
            <Pressable onPress={() => { setTitleInput(meeting.title); setIsEditingTitle(true) }}>
              <Text className="text-white text-lg font-bold">{meeting.title}</Text>
            </Pressable>
          )}
          <Text className="text-white/40 text-xs">
            {formatDateTime(meeting.startedAt)} · {formatDuration(meeting.durationSeconds)}
            {meeting.languagesDetected.length > 0 && ` · ${meeting.languagesDetected.join(', ').toUpperCase()}`}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        {/* Status badge */}
        {meeting.status === 'processing' && (
          <View className="bg-yellow-500/20 rounded-xl p-3 mb-4 flex-row items-center gap-3">
            <ActivityIndicator color="#eab308" size="small" />
            <Text className="text-yellow-300 flex-1">Generando resumen con IA...</Text>
          </View>
        )}

        {/* AI Summary */}
        {summary && (
          <>
            <SectionCard title="📋 Resumen Ejecutivo">
              <Text className="text-white/80 leading-6">{summary.executiveSummary}</Text>
            </SectionCard>

            {summary.keyPoints.length > 0 && (
              <SectionCard title="💡 Puntos Clave">
                {summary.keyPoints.map((point, i) => (
                  <View key={i} className="flex-row gap-2 mb-2">
                    <Text className="text-primary-400">•</Text>
                    <Text className="text-white/80 flex-1">{point}</Text>
                  </View>
                ))}
              </SectionCard>
            )}

            {summary.actionItems.length > 0 && (
              <SectionCard title="✅ Tareas y Acuerdos">
                {summary.actionItems.map((item) => (
                  <View key={item.id} className="flex-row gap-2 mb-2 items-start">
                    <Text className="text-white/40 mt-0.5">☐</Text>
                    <View className="flex-1">
                      <Text className="text-white/80">{item.text}</Text>
                      {item.owner && <Text className="text-primary-400 text-xs">👤 {item.owner}</Text>}
                      {item.dueDate && <Text className="text-white/40 text-xs">📅 {item.dueDate}</Text>}
                    </View>
                  </View>
                ))}
              </SectionCard>
            )}

            {summary.decisions.length > 0 && (
              <SectionCard title="🔨 Decisiones">
                {summary.decisions.map((d, i) => (
                  <View key={i} className="flex-row gap-2 mb-2">
                    <Text className="text-green-400">✓</Text>
                    <Text className="text-white/80 flex-1">{d}</Text>
                  </View>
                ))}
              </SectionCard>
            )}

            {summary.openQuestions.length > 0 && (
              <SectionCard title="❓ Temas Pendientes">
                {summary.openQuestions.map((q, i) => (
                  <View key={i} className="flex-row gap-2 mb-2">
                    <Text className="text-yellow-400">?</Text>
                    <Text className="text-white/80 flex-1">{q}</Text>
                  </View>
                ))}
              </SectionCard>
            )}
          </>
        )}

        {!summary && meeting.status !== 'processing' && (
          <View className="bg-brand-mid rounded-2xl p-6 mb-4 items-center">
            <Text className="text-3xl mb-3">🤔</Text>
            <Text className="text-white/60 text-center">
              No hay resumen disponible para esta reunión.
            </Text>
          </View>
        )}

        {/* Actions */}
        <View className="gap-3 mt-2">
          <Pressable
            onPress={() => router.push(`/meeting/${id}/transcript`)}
            className="bg-brand-mid rounded-xl py-4 flex-row items-center justify-center gap-3 active:bg-white/10"
          >
            <Text className="text-xl">📄</Text>
            <Text className="text-white font-semibold">Ver transcripción completa</Text>
          </Pressable>

          <Pressable
            onPress={handleExport}
            disabled={isExporting}
            className="bg-primary-600 rounded-xl py-4 flex-row items-center justify-center gap-3 active:bg-primary-700"
          >
            {isExporting ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Text className="text-xl">📤</Text>
                <Text className="text-white font-semibold">Exportar a Google Docs</Text>
              </>
            )}
          </Pressable>

          {meeting.docsUrl && (
            <Pressable
              onPress={() => Share.share({ url: meeting.docsUrl!, message: meeting.docsUrl! })}
              className="bg-green-700/30 rounded-xl py-3 flex-row items-center justify-center gap-2 active:bg-green-700/50"
            >
              <Text className="text-green-400">🔗</Text>
              <Text className="text-green-400 font-semibold">Abrir en Google Docs</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="bg-brand-mid rounded-2xl p-4 mb-4">
      <Text className="text-white font-bold mb-3">{title}</Text>
      {children}
    </View>
  )
}
