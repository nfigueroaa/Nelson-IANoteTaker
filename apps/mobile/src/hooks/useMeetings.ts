import { useQuery } from '@tanstack/react-query'
import { MeetingRepository } from '@/services/storage/MeetingRepository'

export function useMeetings(searchQuery?: string) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['meetings', searchQuery],
    queryFn: () => MeetingRepository.findAll(searchQuery),
    staleTime: 10_000,
  })

  return { meetings: data ?? [], isLoading, refetch }
}

export function useMeeting(id: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ['meeting', id],
    queryFn: () => MeetingRepository.findById(id!),
    enabled: !!id,
    staleTime: 5_000,
  })

  return { meeting: data ?? null, isLoading }
}

export function useTranscriptSegments(meetingId: string | undefined, searchQuery?: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['transcript', meetingId, searchQuery],
    queryFn: () => MeetingRepository.getSegments(meetingId!, searchQuery),
    enabled: !!meetingId,
    staleTime: 30_000,
  })

  return { segments: data ?? [], isLoading }
}
