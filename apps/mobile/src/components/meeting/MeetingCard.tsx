import { View, Text, Pressable } from 'react-native'
import type { Meeting } from '@nelson/shared-types'
import { formatDuration, formatRelativeDate } from '@/utils/formatters'

interface Props {
  meeting: Meeting
  onPress: () => void
}

const STATUS_COLORS: Record<Meeting['status'], string> = {
  recording: 'bg-red-500',
  processing: 'bg-yellow-500',
  ready: 'bg-green-500',
  exported: 'bg-blue-500',
  error: 'bg-red-700',
}

const STATUS_LABELS: Record<Meeting['status'], string> = {
  recording: 'Grabando',
  processing: 'Procesando',
  ready: 'Listo',
  exported: 'Exportado',
  error: 'Error',
}

export function MeetingCard({ meeting, onPress }: Props) {
  const hasSummary = !!meeting.summary
  const langs = meeting.languagesDetected.slice(0, 3)

  return (
    <Pressable
      onPress={onPress}
      className="bg-brand-mid rounded-2xl p-4 active:bg-white/10"
    >
      {/* Title row */}
      <View className="flex-row items-start justify-between mb-2">
        <Text className="text-white font-semibold text-base flex-1 mr-3" numberOfLines={2}>
          {meeting.title}
        </Text>
        <View className={`rounded-full px-2 py-0.5 ${STATUS_COLORS[meeting.status]}`}>
          <Text className="text-white text-xs font-semibold">{STATUS_LABELS[meeting.status]}</Text>
        </View>
      </View>

      {/* Meta row */}
      <View className="flex-row items-center gap-3 mb-2">
        <Text className="text-white/40 text-xs">
          {formatRelativeDate(meeting.startedAt)}
        </Text>
        <Text className="text-white/40 text-xs">·</Text>
        <Text className="text-white/40 text-xs">
          {formatDuration(meeting.durationSeconds)}
        </Text>
        {langs.length > 0 && (
          <>
            <Text className="text-white/40 text-xs">·</Text>
            <Text className="text-white/40 text-xs">
              {langs.map((l) => l.split('-')[0].toUpperCase()).join(' / ')}
            </Text>
          </>
        )}
      </View>

      {/* Summary preview */}
      {hasSummary && meeting.summary?.executiveSummary && (
        <Text className="text-white/50 text-xs leading-4" numberOfLines={2}>
          {meeting.summary.executiveSummary}
        </Text>
      )}

      {/* Key points count */}
      {hasSummary && (meeting.summary?.keyPoints?.length ?? 0) > 0 && (
        <View className="flex-row gap-2 mt-2">
          <Text className="text-primary-400/60 text-xs">
            💡 {meeting.summary!.keyPoints.length} puntos clave
          </Text>
          {(meeting.summary?.actionItems?.length ?? 0) > 0 && (
            <Text className="text-primary-400/60 text-xs">
              · ✅ {meeting.summary!.actionItems.length} tareas
            </Text>
          )}
        </View>
      )}

      {meeting.docsUrl && (
        <View className="flex-row items-center gap-1 mt-2">
          <Text className="text-blue-400/60 text-xs">📄 Google Docs</Text>
        </View>
      )}
    </Pressable>
  )
}
