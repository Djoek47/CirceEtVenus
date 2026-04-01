import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '@/constants/theme'
import { useAuth } from '@/contexts/auth'
import { formatApiScreenError } from '@/lib/api-errors'
import { apiFetch } from '@/lib/api'
import { extractHttpUrls } from '@/lib/extract-urls'
import { openUrlSafe } from '@/lib/open-url'
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
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [briefingMessage, setBriefingMessage] = useState<string | null>(null)

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

  const runReputationBriefing = useCallback(async () => {
    setBriefingMessage(null)
    setBriefingLoading(true)
    try {
      const res = await apiFetch('/api/social/reputation-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = (await res.json()) as { error?: string; message?: string; success?: boolean }
      if (!res.ok) {
        setBriefingMessage(
          data.error ?? formatApiScreenError(res.status, res.status === 403 ? 'Pro required' : undefined, undefined),
        )
        return
      }
      setBriefingMessage(data.message ?? 'Briefing updated.')
      await load()
    } catch {
      setBriefingMessage('Network error.')
    } finally {
      setBriefingLoading(false)
    }
  }, [load])

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
      <Text style={styles.sub}>Reputation mentions (Supabase). AI briefing requires Pro.</Text>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed, briefingLoading && styles.disabled]}
          disabled={briefingLoading}
          onPress={() => void runReputationBriefing()}
        >
          {briefingLoading ? (
            <ActivityIndicator color={theme.bg} />
          ) : (
            <>
              <FontAwesome name="refresh" size={16} color={theme.bg} />
              <Text style={styles.actionBtnText}>Refresh AI briefing</Text>
            </>
          )}
        </Pressable>
      </View>
      {briefingMessage ? <Text style={styles.banner}>{briefingMessage}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.gold} />}
        ListEmptyComponent={<Text style={styles.empty}>No mentions yet.</Text>}
        renderItem={({ item }) => {
          const urls = extractHttpUrls(item.snippet ?? '')
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {item.platform ?? '—'} · {item.sentiment ?? '—'}
                {item.is_reviewed ? ' · reviewed' : ''}
              </Text>
              {item.snippet ? <Text style={styles.body}>{item.snippet}</Text> : null}
              {urls.length > 0 ? (
                <View style={styles.urlWrap}>
                  {urls.map((u) => (
                    <Pressable
                      key={u}
                      style={({ pressed }) => [styles.urlChip, pressed && styles.pressed]}
                      onPress={() => void openUrlSafe(u)}
                    >
                      <FontAwesome name="link" size={12} color={theme.gold} />
                      <Text style={styles.urlChipText} numberOfLines={1}>
                        {u.replace(/^https?:\/\//i, '')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Text style={styles.meta}>
                {item.detected_at ? new Date(item.detected_at).toLocaleString() : ''}
              </Text>
            </View>
          )
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  heading: { fontSize: 22, fontWeight: '700', color: theme.text, paddingHorizontal: 16, marginTop: 8 },
  sub: { fontSize: 13, color: theme.textMuted, paddingHorizontal: 16, marginBottom: 8 },
  actions: { paddingHorizontal: 16, marginBottom: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.circe,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: { fontWeight: '700', color: theme.bg, fontSize: 15 },
  disabled: { opacity: 0.6 },
  banner: { fontSize: 13, color: theme.textMuted, paddingHorizontal: 16, marginBottom: 8 },
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
  urlWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  urlChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.gold,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
  },
  urlChipText: { flexShrink: 1, fontSize: 12, color: theme.gold, fontWeight: '600' },
  meta: { fontSize: 12, color: theme.textDim, marginTop: 6 },
  pressed: { opacity: 0.88 },
})
