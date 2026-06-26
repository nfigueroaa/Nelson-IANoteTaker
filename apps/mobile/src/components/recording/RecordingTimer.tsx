import { Text } from 'react-native'

interface Props {
  elapsedMs: number
  isActive: boolean
}

export function RecordingTimer({ elapsedMs, isActive }: Props) {
  const totalSecs = Math.floor(elapsedMs / 1000)
  const hours = Math.floor(totalSecs / 3600)
  const mins = Math.floor((totalSecs % 3600) / 60)
  const secs = totalSecs % 60

  const display = hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

  return (
    <Text className={`text-lg font-mono font-semibold ${isActive ? 'text-red-400' : 'text-white/40'}`}>
      {display}
    </Text>
  )
}
