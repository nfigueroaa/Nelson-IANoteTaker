import { View, Text, TextInput, Pressable, RefreshControl } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useState } from 'react'
import { useMeetings } from '@/hooks/useMeetings'
import { MeetingCard } from '@/components/meeting/MeetingCard'
import type { Meeting } from '@nelson/shared-types'

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('')
  const { meetings, isLoading, refetch } = useMeetings(searchQuery)

  function handleMeetingPress(meeting: Meeting) {
    router.push(`/meeting/${meeting.id}`)
  }

  return (
    <SafeAreaView className="flex-1 bg-brand-dark" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <Text className="text-white text-2xl font-bold mb-4">Mis Reuniones</Text>
        <View className="bg-brand-mid rounded-xl flex-row items-center px-4 gap-3">
          <Text className="text-white/40 text-lg">🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar en transcripciones..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            className="flex-1 text-white py-3"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Text className="text-white/40 text-lg">✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Meeting List */}
      <FlashList
        data={meetings}
        estimatedItemSize={120}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MeetingCard meeting={item} onPress={() => handleMeetingPress(item)} />
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            tintColor="#3b82f6"
          />
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-5xl mb-4">🎙️</Text>
            <Text className="text-white/60 text-lg font-semibold mb-2">
              {searchQuery ? 'Sin resultados' : 'Sin reuniones aún'}
            </Text>
            <Text className="text-white/30 text-sm text-center">
              {searchQuery
                ? 'Intenta con otras palabras'
                : 'Toca "Grabar" para iniciar tu primera reunión'}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View className="h-3" />}
      />

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/(tabs)/record')}
        className="absolute bottom-24 right-5 w-14 h-14 bg-primary-600 rounded-full items-center justify-center shadow-lg active:bg-primary-700"
      >
        <Text className="text-white text-2xl">+</Text>
      </Pressable>
    </SafeAreaView>
  )
}
