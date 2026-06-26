import { useState } from 'react'
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin'
import { useAuthStore } from '@/stores/authStore'
import Constants from 'expo-constants'

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  scopes: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/documents',
  ],
})

export function useGoogleAuth() {
  const [isLoading, setIsLoading] = useState(false)
  const { setAuth, clearAuth } = useAuthStore()

  async function signIn() {
    setIsLoading(true)
    try {
      await GoogleSignin.hasPlayServices()
      const userInfo = await GoogleSignin.signIn()
      const tokens = await GoogleSignin.getTokens()

      if (!userInfo.data?.user) throw new Error('No user data')

      const { id, name, email, photo } = userInfo.data.user
      const expiresAt = Date.now() + 3600 * 1000 // 1h estimate

      setAuth(
        { id, name: name ?? '', email, photo: photo ?? null },
        tokens.accessToken,
        expiresAt
      )
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        throw new Error('Inicio de sesión cancelado')
      } else if (error.code === statusCodes.IN_PROGRESS) {
        throw new Error('Ya hay un inicio de sesión en progreso')
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services no disponible')
      }
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  async function signOut() {
    try {
      await GoogleSignin.revokeAccess()
      await GoogleSignin.signOut()
    } catch {
      // ignore
    }
    clearAuth()
  }

  async function refreshToken(): Promise<string | null> {
    try {
      const tokens = await GoogleSignin.getTokens()
      const expiresAt = Date.now() + 3600 * 1000
      const state = useAuthStore.getState()
      if (state.user) {
        setAuth(state.user, tokens.accessToken, expiresAt)
      }
      return tokens.accessToken
    } catch {
      return null
    }
  }

  return { signIn, signOut, refreshToken, isLoading }
}
