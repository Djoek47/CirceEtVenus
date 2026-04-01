import { useEffect } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { theme } from '@/constants/theme'
import type { VoiceSurfaceState } from '@/hooks/use-divine-voice-session'

type Props = {
  surface: VoiceSurfaceState
  /** When false, show a single-line label only (e.g. narrow layouts). */
  showBars?: boolean
}

const BAR_COUNT = 7

function barColor(surface: VoiceSurfaceState): string {
  if (surface === 'working') return theme.circe
  if (surface === 'speaking') return theme.gold
  return theme.textDim
}

export function DivineVoiceVisual({ surface, showBars = true }: Props) {
  const pulse = useSharedValue(0)

  useEffect(() => {
    const period = surface === 'working' ? 260 : surface === 'speaking' ? 420 : 900
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: period, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    )
  }, [surface, pulse])

  const label =
    surface === 'working'
      ? 'Working…'
      : surface === 'speaking'
        ? 'Speaking / listening'
        : 'Idle'

  if (!showBars) {
    return (
      <Text style={[styles.labelOnly, { color: barColor(surface) }]}>{label}</Text>
    )
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.bars}>
        {Array.from({ length: BAR_COUNT }).map((_, i) => (
          <VoiceBar
            key={i}
            index={i}
            pulse={pulse}
            amp={surface === 'working' ? 22 : surface === 'speaking' ? 18 : 10}
            color={barColor(surface)}
          />
        ))}
      </View>
      <Text style={[styles.caption, { color: theme.textMuted }]}>{label}</Text>
    </View>
  )
}

function VoiceBar({
  index,
  pulse,
  amp,
  color,
}: {
  index: number
  pulse: SharedValue<number>
  amp: number
  color: string
}) {
  const phase = index * 0.35
  const style = useAnimatedStyle(() => {
    const p = pulse.value
    const base = 6
    const wobble = Math.sin(phase + p * Math.PI * 2) * 0.5 + 0.5
    return {
      height: base + wobble * amp,
      backgroundColor: color,
      opacity: 0.55 + p * 0.45,
    }
  })

  return <Animated.View style={[styles.bar, style]} />
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 8 },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    height: 44,
  },
  bar: {
    width: 5,
    borderRadius: 3,
  },
  caption: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  labelOnly: { fontSize: 13, fontWeight: '600' },
})
