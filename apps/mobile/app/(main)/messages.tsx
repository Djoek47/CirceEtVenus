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
import { formatApiScreenError } from '@/lib/api-errors'
import { apiFetch } from '@/lib/api'
import { supabase } from '@/lib/supabase'

type Conv = {
  id?: string
  user?: { username?: string; name?: string }
  lastMessage?: { text?: string; createdAt?: string }
  unreadCount?: number
}

export default function MessagesScreen() {
  const [items, setItems] = useState<Conv[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const res = await apiFetch('/api/onlyfans/conversations?limit=50')
    const json = (await res.json()) as { conversations?: Conv[]; error?: string; code?: string }
    if (!res.ok) {
      setError(formatApiScreenError(res.status, json.error))
      setItems([])
      return
    }
    setItems(json.conversations ?? [])
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  async function onRefresh() {
    setRefreshing(true)
    await supabase.auth.refreshSession()
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
      <Text style={styles.heading}>Messages</Text>
      <Text style={styles.sub}>OnlyFans conversations (requires OnlyFans connected)</Text>
      {error ? <Text style={styles.err}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item, i) => String(item.id ?? i)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {error ? 'Fix the error above or connect OnlyFans in Settings.' : 'No conversations yet.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              @{item.user?.username ?? item.user?.name ?? 'Fan'}
            </Text>
            {item.lastMessage?.text ? (
              <Text style={styles.body} numberOfLines={2}>
                {item.lastMessage.text}
              </Text>
            ) : null}
            {item.unreadCount ? (
              <Text style={styles.unread}>{item.unreadCount} unread</Text>
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
  sub: { fontSize: 13, color: theme.textMuted, paddingHorizontal: 16, marginBottom: 8 },
  err: { color: theme.danger, paddingHorizontal: 16, marginBottom: 8 },
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
  cardTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
  body: { fontSize: 14, color: theme.textMuted, marginTop: 6 },
  unread: { fontSize: 12, color: theme.gold, marginTop: 6 },
})
