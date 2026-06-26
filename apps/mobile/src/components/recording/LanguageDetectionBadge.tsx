import { View, Text } from 'react-native'
import { LANGUAGE_NAMES } from '@/utils/languages'

interface Props {
  languageCode: string
  visible: boolean
}

export function LanguageDetectionBadge({ languageCode, visible }: Props) {
  if (!visible || !languageCode) {
    return <View className="w-20" />
  }

  const shortCode = languageCode.split('-')[0].toUpperCase()
  const fullName = LANGUAGE_NAMES[languageCode] ?? shortCode

  return (
    <View className="bg-primary-600/30 rounded-full px-3 py-1.5 flex-row items-center gap-2 border border-primary-500/40">
      <View className="w-2 h-2 rounded-full bg-green-400" />
      <Text className="text-primary-300 text-xs font-semibold">{shortCode}</Text>
    </View>
  )
}
