import { useState } from 'react'
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useGoogleAuth } from '@/hooks/useGoogleAuth'

export default function SignInScreen() {
  const { signIn, isLoading } = useGoogleAuth()
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn() {
    setError(null)
    try {
      await signIn()
      router.replace('/(tabs)/')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión'
      setError(message)
      Alert.alert('Error', message)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-dark items-center justify-center px-8">
      <Text className="text-white text-3xl font-bold mb-3">Iniciar sesión</Text>
      <Text className="text-white/50 text-center mb-12">
        Usa tu cuenta de Google para acceder a Google Docs y Drive
      </Text>

      <Pressable
        onPress={handleSignIn}
        disabled={isLoading}
        className="w-full bg-white rounded-2xl py-4 flex-row items-center justify-center gap-3 active:bg-gray-100"
      >
        {isLoading ? (
          <ActivityIndicator color="#1a1a2e" />
        ) : (
          <>
            <Text className="text-2xl">🔑</Text>
            <Text className="text-brand-dark text-lg font-semibold">
              Continuar con Google
            </Text>
          </>
        )}
      </Pressable>

      {error && (
        <Text className="text-red-400 text-sm mt-4 text-center">{error}</Text>
      )}

      <Text className="text-white/30 text-xs text-center mt-8">
        Al continuar, aceptas que Nelson IA acceda a Google Docs y Drive
        solo para crear y guardar tus notas de reunión.
      </Text>
    </SafeAreaView>
  )
}
