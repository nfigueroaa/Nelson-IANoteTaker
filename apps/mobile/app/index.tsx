import { Redirect } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'

export default function Index() {
  const isSignedIn = useAuthStore((s) => s.isSignedIn)
  return <Redirect href={isSignedIn ? '/(tabs)/' : '/(auth)/welcome'} />
}
