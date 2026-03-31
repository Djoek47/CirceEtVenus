import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { motion } from '@/constants/motion'
import { theme } from '@/constants/theme'
import { formatApiScreenError } from '@/lib/api-errors'
import { apiFetch } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useResponsive } from '@/hooks/use-responsive'

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
  const r = useResponsive()

  const load = useCallback(async () => {
    setError(null)
    const res = await apiFetch('/api/community/tips')
    const json = (await res.json()) as TipsResponse & { error?: string; message?: string }
    if (!res.ok) {
      setError(formatApiScreenError(res.status, json.error, json.message))
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
    await supabase.auth.refreshSession()
    await load()
    setRefreshing(false)
  }

  const hPad = r.scaleSpace(16)

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.gold} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Text style={[styles.heading, { fontSize: r.scaleFont(22), paddingHorizontal: hPad }]}>
        Community tips
      </Text>
      <Text style={[styles.sub, { fontSize: r.scaleFont(13), paddingHorizontal: hPad }]}>
        Approved tips via Bearer-authenticated API
      </Text>
      {error ? (
        <Text style={[styles.error, { fontSize: r.scaleFont(14), paddingHorizontal: hPad }]}>{error}</Text>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={[styles.empty, { fontSize: r.scaleFont(14), padding: r.scaleSpace(24) }]}>
            No tips yet. Pull to refresh after sign-in, or check EXPO_PUBLIC_API_URL in `.env`.
          </Text>
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(Math.min(index * 40, 320)).duration(motion.duration)}
          >
            <View style={[styles.card, { marginHorizontal: hPad, marginBottom: r.scaleSpace(12), padding: r.scaleSpace(14) }]}>
              <Text style={[styles.cardTitle, { fontSize: r.scaleFont(17) }]}>{item.title}</Text>
              <Text style={[styles.meta, { fontSize: r.scaleFont(12) }]}>
                {item.author_name ?? 'Creator'} · {new Date(item.created_at).toLocaleDateString()}
              </Text>
              <Text style={[styles.body, { fontSize: r.scaleFont(15), lineHeight: r.scaleFont(22) }]}>
                {item.body}
              </Text>
            </View>
          </Animated.View>
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
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },
  sub: {
    color: theme.textMuted,
    marginBottom: 12,
  },
  error: {
    color: theme.danger,
    marginBottom: 8,
  },
  empty: {
    color: theme.textDim,
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardTitle: {
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  meta: {
    color: theme.textDim,
    marginBottom: 8,
  },
  body: {
    color: theme.textMuted,
  },
})
