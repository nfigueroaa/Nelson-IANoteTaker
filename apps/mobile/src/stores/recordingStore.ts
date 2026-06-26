import { create } from 'zustand'

export type RecordingStatus =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'paused'
  | 'stopping'
  | 'processing'

export type WsConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

interface RecordingState {
  status: RecordingStatus
  currentMeetingId: string | null
  startedAt: number | null
  elapsedMs: number
  amplitude: number
  wsConnectionStatus: WsConnectionStatus
  errorMessage: string | null

  setStatus: (status: RecordingStatus) => void
  setCurrentMeetingId: (id: string | null) => void
  setStartedAt: (ts: number | null) => void
  setElapsedMs: (ms: number) => void
  setAmplitude: (amplitude: number) => void
  setWsConnectionStatus: (status: WsConnectionStatus) => void
  setErrorMessage: (msg: string | null) => void
  reset: () => void
}

const initialState = {
  status: 'idle' as RecordingStatus,
  currentMeetingId: null,
  startedAt: null,
  elapsedMs: 0,
  amplitude: 0,
  wsConnectionStatus: 'disconnected' as WsConnectionStatus,
  errorMessage: null,
}

export const useRecordingStore = create<RecordingState>()((set) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setCurrentMeetingId: (currentMeetingId) => set({ currentMeetingId }),
  setStartedAt: (startedAt) => set({ startedAt }),
  setElapsedMs: (elapsedMs) => set({ elapsedMs }),
  setAmplitude: (amplitude) => set({ amplitude }),
  setWsConnectionStatus: (wsConnectionStatus) => set({ wsConnectionStatus }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  reset: () => set(initialState),
}))
