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

type MentionRow = {
  id: string
  platform: string | null
  sentiment: string | null
  snippet: string | null
  detected_at: string | null
  is_reviewed: boolean | null
}

export default function MentionsScreen() {
  const { session } = useAuth()
  const [items, setItems] = useState<MentionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!session?.user?.id) return
    const { data } = await supabase
      .from('reputation_mentions')
      .select('id, platform, sentiment, snippet, detected_at, is_reviewed')
      .eq('user_id', session.user.id)
      .order('detected_at', { ascending: false })
      .limit(100)
    setItems((data as MentionRow[]) ?? [])
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
      <Text style={styles.heading}>Mentions</Text>
      <Text style={styles.sub}>Reputation mentions (Supabase)</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No mentions yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {item.platform ?? '—'} · {item.sentiment ?? '—'}
              {item.is_reviewed ? ' · reviewed' : ''}
            </Text>
            {item.snippet ? <Text style={styles.body}>{item.snippet}</Text> : null}
            <Text style={styles.meta}>
              {item.detected_at ? new Date(item.detected_at).toLocaleString() : ''}
            </Text>
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
  cardTitle: { fontSize: 14, fontWeight: '600', color: theme.text },
  body: { fontSize: 14, color: theme.textMuted, marginTop: 6 },
  meta: { fontSize: 12, color: theme.textDim, marginTop: 6 },
})
