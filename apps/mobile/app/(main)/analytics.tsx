import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '@/constants/theme'
import { useAuth } from '@/contexts/auth'
import { apiFetch } from '@/lib/api'
import { supabase } from '@/lib/supabase'

type RevenueResponse = {
  stats?: {
    totalRevenue?: number
    earnings?: { today?: number; thisWeek?: number; thisMonth?: number }
  }
}

export default function AnalyticsScreen() {
  const { session } = useAuth()
  const [revenue, setRevenue] = useState<RevenueResponse | null>(null)
  const [snapshotCount, setSnapshotCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const revRes = await apiFetch('/api/revenue')
    if (revRes.ok) {
      setRevenue((await revRes.json()) as RevenueResponse)
    } else {
      const j = await revRes.json().catch(() => ({}))
      setError((j as { error?: string }).error ?? revRes.statusText)
    }
    if (session?.user?.id) {
      const { count } = await supabase
        .from('analytics_snapshots')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
      setSnapshotCount(count ?? 0)
    } else {
      setSnapshotCount(0)
    }
  }, [session?.user?.id])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.gold} />
      </View>
    )
  }

  const total = revenue?.stats?.totalRevenue ?? 0
  const e = revenue?.stats?.earnings

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.heading}>Analytics</Text>
        <Text style={styles.sub}>API revenue + snapshot rows</Text>
        {error ? <Text style={styles.err}>{error}</Text> : null}
        <View style={styles.card}>
          <Text style={styles.label}>Total revenue (API)</Text>
          <Text style={styles.big}>${total.toFixed(2)}</Text>
        </View>
        {e ? (
          <View style={styles.card}>
            <Text style={styles.label}>Earnings</Text>
            <Text style={styles.line}>Today: ${(e.today ?? 0).toFixed(2)}</Text>
            <Text style={styles.line}>This week: ${(e.thisWeek ?? 0).toFixed(2)}</Text>
            <Text style={styles.line}>This month: ${(e.thisMonth ?? 0).toFixed(2)}</Text>
          </View>
        ) : null}
        <View style={styles.card}>
          <Text style={styles.label}>Analytics snapshots (DB)</Text>
          <Text style={styles.big}>{snapshotCount}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  scroll: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 22, fontWeight: '700', color: theme.text, marginBottom: 4 },
  sub: { fontSize: 13, color: theme.textMuted, marginBottom: 12 },
  err: { color: theme.danger, marginBottom: 8 },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 12,
  },
  label: { fontSize: 13, color: theme.textMuted, marginBottom: 6 },
  big: { fontSize: 28, fontWeight: '700', color: theme.gold },
  line: { fontSize: 15, color: theme.text, marginBottom: 4 },
})
