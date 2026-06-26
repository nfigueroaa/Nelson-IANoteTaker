import { View, Text, Pressable, ScrollView } from 'react-native'
import { SUPPORTED_LANGUAGES } from '@/utils/languages'

interface Props {
  primaryLanguage: string
  alternativeLanguages: string[]
  onPrimaryChange: (lang: string) => void
  onAlternativesChange: (langs: string[]) => void
}

export function LanguageSelector({
  primaryLanguage,
  alternativeLanguages,
  onPrimaryChange,
  onAlternativesChange,
}: Props) {
  function toggleAlternative(code: string) {
    if (code === primaryLanguage) return
    if (alternativeLanguages.includes(code)) {
      onAlternativesChange(alternativeLanguages.filter((l) => l !== code))
    } else if (alternativeLanguages.length < 3) {
      onAlternativesChange([...alternativeLanguages, code])
    }
  }

  return (
    <View className="bg-brand-mid rounded-2xl p-4 mb-6">
      <Text className="text-white/60 text-xs mb-3">IDIOMA PRINCIPAL</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        <View className="flex-row gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <Pressable
              key={lang.code}
              onPress={() => onPrimaryChange(lang.code)}
              className={`px-3 py-2 rounded-xl border ${
                primaryLanguage === lang.code
                  ? 'bg-primary-600 border-primary-500'
                  : 'border-white/20 bg-transparent'
              }`}
            >
              <Text className={`text-sm font-semibold ${primaryLanguage === lang.code ? 'text-white' : 'text-white/60'}`}>
                {lang.flag} {lang.shortName}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Text className="text-white/60 text-xs mb-3">IDIOMAS ALTERNATIVOS (máx. 3)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2 flex-wrap">
          {SUPPORTED_LANGUAGES.filter((l) => l.code !== primaryLanguage).map((lang) => {
            const isSelected = alternativeLanguages.includes(lang.code)
            const isDisabled = !isSelected && alternativeLanguages.length >= 3
            return (
              <Pressable
                key={lang.code}
                onPress={() => toggleAlternative(lang.code)}
                disabled={isDisabled}
                className={`px-3 py-2 rounded-xl border ${
                  isSelected
                    ? 'bg-green-700 border-green-500'
                    : isDisabled
                    ? 'border-white/10 opacity-40'
                    : 'border-white/20'
                }`}
              >
                <Text className={`text-sm ${isSelected ? 'text-white font-semibold' : 'text-white/60'}`}>
                  {lang.flag} {lang.shortName}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </ScrollView>

      <Text className="text-white/30 text-xs mt-3">
        Google STT detectará automáticamente entre el idioma principal y los alternativos.
      </Text>
    </View>
  )
}
