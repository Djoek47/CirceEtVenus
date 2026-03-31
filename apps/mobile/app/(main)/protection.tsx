import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '@/constants/theme'
import { useAuth } from '@/contexts/auth'
import { supabase } from '@/lib/supabase'

type LeakRow = {
  id: string
  status: string | null
  severity: string | null
  detected_at: string | null
  source_url?: string | null
}

export default function ProtectionScreen() {
  const { session } = useAuth()
  const [items, setItems] = useState<LeakRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!session?.user?.id) return
    const { data } = await supabase
      .from('leak_alerts')
      .select('id, status, severity, detected_at, source_url')
      .eq('user_id', session.user.id)
      .order('detected_at', { ascending: false })
    setItems((data as LeakRow[]) ?? [])
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

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Text style={styles.heading}>Protection</Text>
      <Text style={styles.sub}>Leak alerts from your database (same as web)</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No leak alerts.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.status ?? '—'} · {item.severity ?? 'unknown'}</Text>
            <Text style={styles.meta}>
              {item.detected_at ? new Date(item.detected_at).toLocaleString() : ''}
            </Text>
            {item.source_url ? (
              <Text style={styles.url} numberOfLines={2}>
                {item.source_url}
              </Text>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  heading: { fontSize: 22, fontWeight: '700', color: theme.text, paddingHorizontal: 16, marginTop: 8 },
  sub: { fontSize: 13, color: theme.textMuted, paddingHorizontal: 16, marginBottom: 12 },
  empty: { color: theme.textDim, textAlign: 'center', padding: 24 },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: theme.text },
  meta: { fontSize: 12, color: theme.textDim, marginTop: 4 },
  url: { fontSize: 12, color: theme.textMuted, marginTop: 6 },
})
