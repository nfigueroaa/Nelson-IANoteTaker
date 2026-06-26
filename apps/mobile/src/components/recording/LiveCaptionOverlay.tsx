import { View, Text, ScrollView } from 'react-native'
import type { TranscriptSegment } from '@nelson/shared-types'

interface Props {
  segments: TranscriptSegment[]
  partialText: string
}

export function LiveCaptionOverlay({ segments, partialText }: Props) {
  return (
    <View className="flex-1 bg-black/40 rounded-2xl p-4 justify-end">
      <View className="gap-1">
        {segments.map((segment) => (
          <View key={segment.id} className="flex-row flex-wrap">
            {segment.speakerId && (
              <Text className="text-primary-400 text-sm font-semibold mr-2">
                {segment.speakerId}:
              </Text>
            )}
            <Text className="text-white text-base leading-6 flex-shrink">
              {segment.text}
            </Text>
          </View>
        ))}

        {partialText ? (
          <Text className="text-white/50 text-base italic leading-6">
            {partialText}
          </Text>
        ) : null}

        {segments.length === 0 && !partialText && (
          <Text className="text-white/30 text-sm text-center">
            Escuchando...
          </Text>
        )}
      </View>
    </View>
  )
}
