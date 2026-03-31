import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { motion } from '@/constants/motion'
import { theme } from '@/constants/theme'
import { apiFetch } from '@/lib/api'
import { useResponsive } from '@/hooks/use-responsive'

type DivineSettings = {
  voice_hangup_policy?: string
  dm_focus_mode?: string
  divine_send_delay_ms?: number
  dm_pricing_style?: string
}

export default function DivineManagerScreen() {
  const [settings, setSettings] = useState<DivineSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const r = useResponsive()

  const load = useCallback(async () => {
    setError(null)
    const res = await apiFetch('/api/divine/manager-settings')
    const json = (await res.json()) as DivineSettings & { error?: string }
    if (!res.ok) {
      setError(json.error ?? res.statusText)
      setSettings(null)
      return
    }
    setSettings(json)
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  const pad = r.scaleSpace(16)

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.gold} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={{ padding: pad, paddingBottom: r.scaleSpace(32) }}>
        <Animated.View entering={FadeIn.duration(motion.durationSlow)}>
          <Text style={[styles.heading, { fontSize: r.scaleFont(22) }]}>Divine Manager</Text>
          <Text style={[styles.sub, { fontSize: r.scaleFont(13), marginBottom: r.scaleSpace(12) }]}>
            Settings from GET /api/divine/manager-settings. Full voice + realtime remain web-first (EAS Dev
            Client when you add native modules).
          </Text>
        </Animated.View>
        {error ? (
          <Text style={[styles.err, { fontSize: r.scaleFont(14) }]}>{error}</Text>
        ) : null}
        {settings ? (
          <Animated.View
            entering={FadeIn.delay(motion.stagger).duration(motion.duration)}
            style={[styles.card, { padding: r.scaleSpace(16) }]}
          >
            <Text style={[styles.line, { fontSize: r.scaleFont(14), marginBottom: r.scaleSpace(8) }]}>
              Voice hangup: {settings.voice_hangup_policy ?? '—'}
            </Text>
            <Text style={[styles.line, { fontSize: r.scaleFont(14), marginBottom: r.scaleSpace(8) }]}>
              DM focus: {settings.dm_focus_mode ?? '—'}
            </Text>
            <Text style={[styles.line, { fontSize: r.scaleFont(14), marginBottom: r.scaleSpace(8) }]}>
              Send delay: {settings.divine_send_delay_ms ?? '—'} ms
            </Text>
            <Text style={[styles.line, { fontSize: r.scaleFont(14) }]}>DM pricing style: {settings.dm_pricing_style ?? '—'}</Text>
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  heading: { fontWeight: '700', color: theme.text, marginBottom: 4 },
  sub: { color: theme.textMuted },
  err: { color: theme.danger, marginBottom: 8 },
  card: {
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  line: { color: theme.text },
})
