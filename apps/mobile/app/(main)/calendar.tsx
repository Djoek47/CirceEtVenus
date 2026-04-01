import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '@/constants/theme'
import { useAuth } from '@/contexts/auth'
import { supabase } from '@/lib/supabase'

type ContentRow = {
  id: string
  title: string | null
  status: string | null
  scheduled_at: string | null
  created_at: string | null
}

type Section = { title: string; data: ContentRow[] }

function dayKey(iso: string | null): string {
  if (!iso) return 'Unscheduled'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Unscheduled'
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function CalendarScreen() {
  const { session } = useAuth()
  const [items, setItems] = useState<ContentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!session?.user?.id) return
    const { data } = await supabase
      .from('content')
      .select('id, title, status, scheduled_at, created_at')
      .eq('user_id', session.user.id)
      .order('scheduled_at', { ascending: true, nullsFirst: false })
    setItems((data as ContentRow[]) ?? [])
  }, [session?.user?.id])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const sections = useMemo(() => {
    const map = new Map<string, ContentRow[]>()
    for (const row of items) {
      const key = row.scheduled_at ? dayKey(row.scheduled_at) : 'Unscheduled / drafts'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(row)
    }
    const out: Section[] = []
    for (const [title, data] of map) {
      out.push({ title, data })
    }
    return out
  }, [items])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.gold} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Text style={styles.heading}>Content calendar</Text>
      <Text style={styles.sub}>Scheduled posts from your content library (same as web Content → calendar).</Text>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.gold} />}
        ListEmptyComponent={<Text style={styles.empty}>No content yet. Add posts on the web or in Content.</Text>}
        renderSectionHeader={({ section: { title } }) => (
          <Text style={styles.sectionHeader}>{title}</Text>
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title || 'Untitled'}</Text>
            <Text style={styles.meta}>
              {item.status ?? '—'}
              {item.scheduled_at
                ? ` · ${new Date(item.scheduled_at).toLocaleString()}`
                : item.created_at
                  ? ` · created ${new Date(item.created_at).toLocaleDateString()}`
                  : ''}
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
      <Text style={styles.footer}>
        Tip: open the full calendar editor on the web dashboard for drag-and-drop scheduling.
      </Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  heading: { fontSize: 22, fontWeight: '700', color: theme.text, paddingHorizontal: 16, marginTop: 8 },
  sub: { fontSize: 13, color: theme.textMuted, paddingHorizontal: 16, marginBottom: 8 },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.gold,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    backgroundColor: theme.bg,
  },
  empty: { color: theme.textDim, textAlign: 'center', padding: 24 },
  card: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: theme.text },
  meta: { fontSize: 12, color: theme.textDim, marginTop: 4 },
  footer: { fontSize: 11, color: theme.textDim, paddingHorizontal: 16, paddingVertical: 10 },
})
