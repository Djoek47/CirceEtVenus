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

type FanRow = {
  id: string
  username?: string | null
  platform_username?: string | null
  display_name: string | null
  platform: string | null
  total_spent: number | null
  created_at: string | null
}

export default function FansScreen() {
  const { session } = useAuth()
  const [items, setItems] = useState<FanRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!session?.user?.id) return
    const { data } = await supabase
      .from('fans')
      .select('id, username, platform_username, display_name, platform, total_spent, created_at')
      .eq('user_id', session.user.id)
      .order('total_spent', { ascending: false })
      .limit(100)
    setItems((data as FanRow[]) ?? [])
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
      <Text style={styles.heading}>Fans</Text>
      <Text style={styles.sub}>CRM fans table (RLS)</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>No fans synced yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {item.display_name || item.platform_username || item.username || 'Fan'}
            </Text>
            <Text style={styles.meta}>
              {item.platform ?? '—'} · spent ${(item.total_spent ?? 0).toFixed(2)}
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
  cardTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
  meta: { fontSize: 13, color: theme.textMuted, marginTop: 4 },
})
