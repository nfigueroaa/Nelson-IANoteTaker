import { View, Text, Pressable } from 'react-native'
import { router } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function WelcomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-brand-dark">
      <View className="flex-1 items-center justify-between px-8 pb-12 pt-16">
        {/* Logo / Illustration */}
        <View className="flex-1 items-center justify-center">
          <View className="w-32 h-32 rounded-full bg-primary-600 items-center justify-center mb-8">
            <Text className="text-white text-6xl">🎙️</Text>
          </View>
          <Text className="text-white text-4xl font-bold text-center mb-3">
            Nelson IA
          </Text>
          <Text className="text-white/70 text-xl text-center mb-2">
            NoteTaker
          </Text>
          <Text className="text-white/50 text-base text-center mt-4 leading-6">
            Transcripciones en tiempo real,{'\n'}
            resúmenes con IA y exportación{'\n'}
            a Google Docs.
          </Text>
        </View>

        {/* Features */}
        <View className="w-full mb-10 gap-4">
          {FEATURES.map((f) => (
            <View key={f.title} className="flex-row items-center gap-4">
              <View className="w-10 h-10 rounded-xl bg-primary-600/30 items-center justify-center">
                <Text className="text-xl">{f.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">{f.title}</Text>
                <Text className="text-white/50 text-sm">{f.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CTA */}
        <Pressable
          onPress={() => router.push('/(auth)/sign-in')}
          className="w-full bg-primary-600 rounded-2xl py-4 items-center active:bg-primary-700"
        >
          <Text className="text-white text-lg font-semibold">Comenzar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const FEATURES = [
  { icon: '🎤', title: 'Transcripción en tiempo real', description: 'Como Google Meet, pero para tus reuniones' },
  { icon: '🌍', title: 'Multi-idioma', description: 'Detecta español, inglés y más automáticamente' },
  { icon: '✨', title: 'Resúmenes con IA', description: 'Gemini Flash extrae puntos clave y tareas' },
  { icon: '📄', title: 'Exporta a Google Docs', description: 'Comparte tu nota con un toque' },
]
