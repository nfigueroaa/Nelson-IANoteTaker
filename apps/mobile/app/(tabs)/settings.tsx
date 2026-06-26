import { View, Text, ScrollView, Switch, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { LanguageSelector } from '@/components/settings/LanguageSelector'
import { useGoogleAuth } from '@/hooks/useGoogleAuth'
import { SUPPORTED_LANGUAGES } from '@/utils/languages'

export default function SettingsScreen() {
  const { signOut } = useGoogleAuth()
  const user = useAuthStore((s) => s.user)
  const settings = useSettingsStore()

  async function handleSignOut() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await signOut()
          router.replace('/(auth)/welcome')
        },
      },
    ])
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
      >
        <Text className="text-white text-2xl font-bold mt-4 mb-6">Ajustes</Text>

        {/* Account */}
        <SectionHeader title="Cuenta Google" />
        <View className="bg-brand-mid rounded-2xl p-4 mb-6">
          <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 rounded-full bg-primary-600 items-center justify-center">
              <Text className="text-white text-xl">👤</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold">{user?.name ?? 'Usuario'}</Text>
              <Text className="text-white/50 text-sm">{user?.email ?? ''}</Text>
            </View>
          </View>
          <Pressable
            onPress={handleSignOut}
            className="mt-4 py-2 rounded-xl bg-red-500/20 items-center active:bg-red-500/30"
          >
            <Text className="text-red-400 font-semibold">Cerrar sesión</Text>
          </Pressable>
        </View>

        {/* Languages */}
        <SectionHeader title="Idiomas de transcripción" />
        <LanguageSelector
          primaryLanguage={settings.primaryLanguage}
          alternativeLanguages={settings.alternativeLanguages}
          onPrimaryChange={(lang) => settings.setPrimaryLanguage(lang)}
          onAlternativesChange={(langs) => settings.setAlternativeLanguages(langs)}
        />

        {/* AI Quality */}
        <SectionHeader title="Calidad de IA" />
        <View className="bg-brand-mid rounded-2xl p-4 mb-6">
          {AI_QUALITY_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => settings.setAiQuality(option.value)}
              className={`flex-row items-center justify-between py-3 ${
                option.value !== AI_QUALITY_OPTIONS[AI_QUALITY_OPTIONS.length - 1].value
                  ? 'border-b border-white/10'
                  : ''
              }`}
            >
              <View className="flex-1">
                <Text className="text-white font-semibold">{option.label}</Text>
                <Text className="text-white/40 text-xs">{option.description}</Text>
              </View>
              {settings.aiQuality === option.value && (
                <Text className="text-primary-500 text-lg">✓</Text>
              )}
            </Pressable>
          ))}
        </View>

        {/* Recording preferences */}
        <SectionHeader title="Grabación" />
        <View className="bg-brand-mid rounded-2xl p-4 mb-6">
          <SettingRow
            label="Subtítulos en vivo"
            description="Mostrar captions durante la grabación"
            value={settings.showLiveCaptions}
            onChange={settings.setShowLiveCaptions}
          />
          <SettingRow
            label="Detectar hablantes"
            description="Identificar diferentes voces (diarización)"
            value={settings.enableSpeakerDiarization}
            onChange={settings.setEnableSpeakerDiarization}
          />
          <SettingRow
            label="Guardar audio en Drive"
            description="Subir el archivo de audio a Google Drive"
            value={settings.saveAudioToDrive}
            onChange={settings.setSaveAudioToDrive}
            isLast
          />
        </View>

        {/* About */}
        <SectionHeader title="Acerca de" />
        <View className="bg-brand-mid rounded-2xl p-4">
          <Text className="text-white/40 text-sm text-center">
            Nelson IANoteTaker v1.0.0{'\n'}
            Transcripción: Google Cloud Speech-to-Text{'\n'}
            IA: Gemini Flash 2.0{'\n'}
            Exportación: Google Docs & Drive
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function SectionHeader({ title }: { title: string }) {
  return <Text className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">{title}</Text>
}

function SettingRow({
  label,
  description,
  value,
  onChange,
  isLast = false,
}: {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
  isLast?: boolean
}) {
  return (
    <View className={`flex-row items-center justify-between py-3 ${!isLast ? 'border-b border-white/10' : ''}`}>
      <View className="flex-1 mr-4">
        <Text className="text-white font-medium">{label}</Text>
        <Text className="text-white/40 text-xs">{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#374151', true: '#2563eb' }}
        thumbColor={value ? '#fff' : '#9ca3af'}
      />
    </View>
  )
}

const AI_QUALITY_OPTIONS = [
  {
    value: 'fast' as const,
    label: '⚡ Rápida – Gemini Flash',
    description: 'Más rápido, ideal para la mayoría de reuniones',
  },
  {
    value: 'quality' as const,
    label: '✨ Alta calidad – Gemini Pro',
    description: 'Resúmenes más detallados y precisos',
  },
]
