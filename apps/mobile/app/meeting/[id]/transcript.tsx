import { View, Text, TextInput, Pressable } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useState } from 'react'
import { useTranscriptSegments } from '@/hooks/useMeetings'
import { formatTimestamp } from '@/utils/formatters'
import type { TranscriptSegment } from '@nelson/shared-types'

export default function TranscriptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [searchQuery, setSearchQuery] = useState('')
  const { segments, isLoading } = useTranscriptSegments(id, searchQuery)

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-5 pt-3 pb-2 gap-3">
        <Pressable onPress={() => router.back()} className="p-2">
          <Text className="text-primary-500 text-lg">←</Text>
        </Pressable>
        <Text className="text-white text-lg font-bold flex-1">Transcripción</Text>
      </View>

      {/* Search */}
      <View className="px-5 pb-3">
        <View className="bg-brand-mid rounded-xl flex-row items-center px-4 gap-3">
          <Text className="text-white/40">🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar en el texto..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            className="flex-1 text-white py-3"
          />
        </View>
      </View>

      {/* Transcript */}
      <FlashList
        data={segments}
        estimatedItemSize={80}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TranscriptLine segment={item} searchQuery={searchQuery} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListEmptyComponent={
          <View className="py-20 items-center">
            <Text className="text-white/40">
              {isLoading ? 'Cargando...' : searchQuery ? 'Sin resultados' : 'Sin transcripción'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

function TranscriptLine({ segment, searchQuery }: { segment: TranscriptSegment; searchQuery: string }) {
  const langFlag = LANG_FLAGS[segment.languageCode?.split('-')[0] ?? ''] ?? ''

  return (
    <View className="bg-brand-mid rounded-xl p-3">
      <View className="flex-row items-center gap-2 mb-1">
        <Text className="text-white/30 text-xs font-mono">
          [{formatTimestamp(segment.startTimeMs)}]
        </Text>
        {segment.speakerId && (
          <View className="bg-primary-600/30 rounded-full px-2 py-0.5">
            <Text className="text-primary-400 text-xs">{segment.speakerId}</Text>
          </View>
        )}
        {langFlag && <Text className="text-xs">{langFlag}</Text>}
      </View>
      <HighlightedText text={segment.text} query={searchQuery} />
    </View>
  )
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) {
    return <Text className="text-white/90 leading-5">{text}</Text>
  }

  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  return (
    <Text className="text-white/90 leading-5">
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <Text key={i} className="bg-yellow-400/30 text-yellow-300">{part}</Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  )
}

const LANG_FLAGS: Record<string, string> = {
  es: '🇪🇸', en: '🇺🇸', fr: '🇫🇷', de: '🇩🇪',
  pt: '🇧🇷', it: '🇮🇹', ja: '🇯🇵', zh: '🇨🇳',
  ko: '🇰🇷', ru: '🇷🇺', ar: '🇸🇦',
}
