import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
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
import { openUrlSafe } from '@/lib/open-url'
import { supabase } from '@/lib/supabase'

type LeakRow = {
  id: string
  status: string | null
  severity: string | null
  detected_at: string | null
  source_url?: string | null
}

type ScanIdentityHandle = { value: string; label?: string; source?: string }

export default function ProtectionScreen() {
  const { session } = useAuth()
  const [items, setItems] = useState<LeakRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [scanMessage, setScanMessage] = useState<string | null>(null)

  const [dmcaOpen, setDmcaOpen] = useState(false)
  const [dmcaLoading, setDmcaLoading] = useState(false)
  const [dmcaNotice, setDmcaNotice] = useState('')
  const [dmcaError, setDmcaError] = useState<string | null>(null)

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

  const runProtectionScan = useCallback(async () => {
    setScanMessage(null)
    setScanLoading(true)
    try {
      const idRes = await apiFetch('/api/user/scan-identity')
      const idJson = (await idRes.json()) as { handles?: ScanIdentityHandle[]; error?: string }
      if (!idRes.ok) {
        setScanMessage(formatApiScreenError(idRes.status, idJson.error, undefined))
        return
      }
      const handles = idJson.handles ?? []
      const focus = handles.map((h) => h.value).filter(Boolean)
      if (focus.length === 0) {
        setScanMessage('Add connected platforms or identity handles on the web (Settings / Protection) first.')
        return
      }
      const res = await apiFetch('/api/leaks/scan', {
        method: 'POST',
        body: JSON.stringify({
          focus_handles: focus,
          strict: true,
          include_content_titles: true,
        }),
      })
      const data = (await res.json()) as {
        success?: boolean
        error?: string
        message?: string
        inserted?: number
        skipped?: number
      }
      if (!res.ok) {
        setScanMessage(data.error || data.message || `Scan failed (${res.status})`)
        return
      }
      setScanMessage(
        `Scan complete. New alerts: ${data.inserted ?? 0}. Skipped duplicates: ${data.skipped ?? 0}.`,
      )
      await load()
    } catch {
      setScanMessage('Network error. Check EXPO_PUBLIC_API_URL.')
    } finally {
      setScanLoading(false)
    }
  }, [load])

  const startDmca = useCallback(async (alert: LeakRow) => {
    setDmcaError(null)
    setDmcaNotice('')
    setDmcaOpen(true)
    setDmcaLoading(true)
    try {
      const res = await apiFetch('/api/dmca/claim', {
        method: 'POST',
        body: JSON.stringify({ leakAlertId: alert.id }),
      })
      const data = (await res.json()) as { notice?: string; error?: string; claimId?: string }
      if (!res.ok) {
        setDmcaError(data.error || formatApiScreenError(res.status, undefined, undefined))
        return
      }
      setDmcaNotice(data.notice ?? '')
    } catch {
      setDmcaError('Network error.')
    } finally {
      setDmcaLoading(false)
    }
  }, [])

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
      <Text style={styles.sub}>Leak alerts and DMCA drafts (same APIs as the web dashboard).</Text>

      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          disabled={scanLoading}
          onPress={() => void runProtectionScan()}
        >
          {scanLoading ? (
            <ActivityIndicator color={theme.bg} />
          ) : (
            <>
              <FontAwesome name="search" size={16} color={theme.bg} />
              <Text style={styles.actionBtnText}>Run leak scan</Text>
            </>
          )}
        </Pressable>
      </View>
      {scanMessage ? <Text style={styles.banner}>{scanMessage}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.gold} />}
        ListEmptyComponent={<Text style={styles.empty}>No leak alerts.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.status ?? '—'} · {item.severity ?? 'unknown'}</Text>
            <Text style={styles.meta}>
              {item.detected_at ? new Date(item.detected_at).toLocaleString() : ''}
            </Text>
            {item.source_url ? (
              <Pressable
                style={styles.linkRow}
                onPress={() => void openUrlSafe(item.source_url!)}
              >
                <FontAwesome name="external-link" size={14} color={theme.gold} />
                <Text style={styles.linkText} numberOfLines={2}>
                  {item.source_url}
                </Text>
              </Pressable>
            ) : null}
            <View style={styles.rowBtns}>
              {item.source_url ? (
                <Pressable
                  style={({ pressed }) => [styles.smallBtn, pressed && styles.pressed]}
                  onPress={() => void openUrlSafe(item.source_url!)}
                >
                  <Text style={styles.smallBtnText}>Open link</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={({ pressed }) => [styles.dmcaBtn, pressed && styles.pressed]}
                onPress={() => void startDmca(item)}
              >
                <FontAwesome name="gavel" size={14} color={theme.bg} />
                <Text style={styles.dmcaBtnText}>DMCA draft</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal visible={dmcaOpen} animationType="slide" transparent onRequestClose={() => setDmcaOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setDmcaOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>DMCA notice draft</Text>
            {dmcaLoading ? (
              <ActivityIndicator size="large" color={theme.gold} style={{ marginVertical: 24 }} />
            ) : dmcaError ? (
              <Text style={styles.err}>{dmcaError}</Text>
            ) : (
              <ScrollView style={styles.noticeScroll}>
                <Text style={styles.noticeText} selectable>
                  {dmcaNotice || 'No notice text returned.'}
                </Text>
              </ScrollView>
            )}
            <Pressable style={styles.modalClose} onPress={() => setDmcaOpen(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
    backgroundColor: theme.gold,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: { fontWeight: '700', color: theme.bg, fontSize: 15 },
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
  cardTitle: { fontSize: 15, fontWeight: '600', color: theme.text },
  meta: { fontSize: 12, color: theme.textDim, marginTop: 4 },
  linkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  linkText: { flex: 1, fontSize: 13, color: theme.gold },
  rowBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surfaceElevated,
  },
  smallBtnText: { color: theme.text, fontWeight: '600', fontSize: 13 },
  dmcaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.circe,
  },
  dmcaBtnText: { color: theme.bg, fontWeight: '700', fontSize: 13 },
  pressed: { opacity: 0.88 },
  err: { color: theme.danger, marginBottom: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: theme.surfaceElevated,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: theme.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 12 },
  noticeScroll: { maxHeight: 420 },
  noticeText: { fontSize: 13, color: theme.textMuted, lineHeight: 20 },
  modalClose: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  modalCloseText: { color: theme.gold, fontWeight: '700', fontSize: 16 },
})
