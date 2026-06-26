import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'

export interface GoogleUser {
  id: string
  name: string
  email: string
  photo: string | null
}

interface AuthState {
  user: GoogleUser | null
  accessToken: string | null
  tokenExpiresAt: number | null
  isSignedIn: boolean
  setAuth: (user: GoogleUser, accessToken: string, expiresAt: number) => void
  clearAuth: () => void
}

const secureStorage = {
  getItem: async (key: string) => SecureStore.getItemAsync(key),
  setItem: async (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: async (key: string) => SecureStore.deleteItemAsync(key),
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      tokenExpiresAt: null,
      isSignedIn: false,

      setAuth: (user, accessToken, expiresAt) =>
        set({ user, accessToken, tokenExpiresAt: expiresAt, isSignedIn: true }),

      clearAuth: () =>
        set({ user: null, accessToken: null, tokenExpiresAt: null, isSignedIn: false }),
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => secureStorage),
    }
  )
)
