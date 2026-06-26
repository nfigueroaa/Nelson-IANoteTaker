import { View } from 'react-native'
import Svg, { Rect } from 'react-native-svg'
import { useEffect, useRef } from 'react'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
} from 'react-native-reanimated'

const BAR_COUNT = 40
const BAR_WIDTH = 4
const BAR_GAP = 3
const WAVEFORM_HEIGHT = 80

interface Props {
  amplitude: number // -160 to 0 dB
  isActive: boolean
}

function dbToHeight(db: number): number {
  const normalized = Math.max(0, Math.min(1, (db + 60) / 60))
  return Math.max(4, normalized * WAVEFORM_HEIGHT)
}

export function AudioWaveform({ amplitude, isActive }: Props) {
  const bars = useRef<number[]>(new Array(BAR_COUNT).fill(4))

  useEffect(() => {
    if (!isActive) return
    bars.current = [dbToHeight(amplitude), ...bars.current.slice(0, BAR_COUNT - 1)]
  }, [amplitude, isActive])

  const svgWidth = BAR_COUNT * (BAR_WIDTH + BAR_GAP)

  return (
    <View style={{ width: svgWidth, height: WAVEFORM_HEIGHT + 16, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={svgWidth} height={WAVEFORM_HEIGHT} viewBox={`0 0 ${svgWidth} ${WAVEFORM_HEIGHT}`}>
        {bars.current.map((height, i) => {
          const x = i * (BAR_WIDTH + BAR_GAP)
          const y = (WAVEFORM_HEIGHT - height) / 2
          const opacity = isActive ? 0.3 + (i / BAR_COUNT) * 0.7 : 0.2
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={BAR_WIDTH}
              height={height}
              rx={BAR_WIDTH / 2}
              fill={isActive ? '#3b82f6' : '#6b7280'}
              opacity={opacity}
            />
          )
        })}
      </Svg>
    </View>
  )
}
