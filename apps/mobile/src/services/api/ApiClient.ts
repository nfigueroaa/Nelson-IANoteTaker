import { useAuthStore } from '@/stores/authStore'

const BFF_URL = process.env.EXPO_PUBLIC_BFF_URL ?? 'http://localhost:3001'

async function request<T>(
  path: string,
  options: RequestInit = {},
  includeAuth = false
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (includeAuth) {
    const token = useAuthStore.getState().accessToken
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  const response = await fetch(`${BFF_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }))
    throw new Error(error.message ?? `HTTP ${response.status}`)
  }

  return response.json() as Promise<T>
}

export const ApiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown, auth = false) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, auth),
}
