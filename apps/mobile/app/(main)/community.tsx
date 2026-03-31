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
import { apiFetch } from '@/lib/api'
import { theme } from '@/constants/theme'

type TipRow = {
  id: string
  title: string
  body: string
  author_name: string | null
  created_at: string
}

type TipsResponse = {
  feed?: TipRow[]
  error?: string
}

export default function CommunityScreen() {
  const [items, setItems] = useState<TipRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const res = await apiFetch('/api/community/tips')
    const json = (await res.json()) as TipsResponse
    if (!res.ok) {
      setError((json as { error?: string }).error ?? res.statusText)
      setItems([])
      return
    }
    setItems(json.feed ?? [])
  }, [])

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
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Text style={styles.heading}>Community tips</Text>
      <Text style={styles.sub}>Approved tips via Bearer-authenticated API</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={styles.empty}>No tips yet (check EXPO_PUBLIC_API_URL and sign-in).</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.meta}>
              {item.author_name ?? 'Creator'} · {new Date(item.created_at).toLocaleDateString()}
            </Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingTop: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bg,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    color: theme.textMuted,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  error: {
    color: theme.danger,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  empty: {
    color: theme.textDim,
    textAlign: 'center',
    padding: 24,
    fontSize: 14,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: theme.textDim,
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.textMuted,
  },
})
