import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '@/constants/theme'
import { formatApiScreenError } from '@/lib/api-errors'
import { apiFetch } from '@/lib/api'

type Msg = {
  id: string
  text?: string
  createdAt?: string
  fromUser?: { id?: string; username?: string; name?: string }
}

export default function MessageThreadScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const { fanId, fanUsername } = useLocalSearchParams<{ fanId: string; fanUsername?: string }>()
  const fid = typeof fanId === 'string' ? fanId : Array.isArray(fanId) ? fanId[0] : ''
  const [items, setItems] = useState<Msg[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const listRef = useRef<FlatList<Msg>>(null)

  useLayoutEffect(() => {
    const title = fanUsername ? `@${fanUsername}` : 'Chat'
    navigation.setOptions({ title, headerBackTitle: 'Messages' })
  }, [navigation, fanUsername])

  const load = useCallback(async () => {
    if (!fid) return
    setError(null)
    const res = await apiFetch(`/api/onlyfans/messages/${encodeURIComponent(fid)}?limit=80`)
    const json = (await res.json()) as { messages?: Msg[]; error?: string; message?: string }
    if (!res.ok) {
      setError(formatApiScreenError(res.status, json.error, json.message))
      setItems([])
      return
    }
    setItems(json.messages ?? [])
    void apiFetch(`/api/onlyfans/chats/${encodeURIComponent(fid)}/read`, { method: 'POST' }).catch(() => undefined)
  }, [fid])

  useEffect(() => {
    if (!fid) return
    load().finally(() => setLoading(false))
  }, [fid, load])

  async function onRefresh() {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  async function send() {
    const text = draft.trim()
    if (!text || !fid || sending) return
    setSending(true)
    setDraft('')
    try {
      const res = await apiFetch(`/api/onlyfans/messages/${encodeURIComponent(fid)}`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string }
      if (!res.ok) {
        setError(formatApiScreenError(res.status, json.error, json.message))
        setDraft(text)
        return
      }
      await load()
    } finally {
      setSending(false)
    }
  }

  const isFromFan = (m: Msg) => String(m.fromUser?.id) === String(fid)

  if (!fid) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>Missing chat id.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.gold} />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {error ? <Text style={styles.bannerErr}>{error}</Text> : null}
        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(m) => String(m.id)}
          inverted
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.gold} />}
          ListEmptyComponent={
            <Text style={styles.empty}>{error ? ' ' : 'No messages yet. Send a reply below.'}</Text>
          }
          renderItem={({ item: m }) => (
            <View
              style={[
                styles.bubbleWrap,
                isFromFan(m) ? styles.bubbleAlignLeft : styles.bubbleAlignRight,
              ]}
            >
              <View style={[styles.bubble, isFromFan(m) ? styles.bubbleFan : styles.bubbleMe]}>
                <Text style={styles.bubbleText}>{m.text ?? ''}</Text>
                {m.createdAt ? (
                  <Text style={styles.meta}>{new Date(m.createdAt).toLocaleString()}</Text>
                ) : null}
              </View>
            </View>
          )}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Message…"
            placeholderTextColor={theme.textDim}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={8000}
            editable={!sending}
          />
          <Pressable
            style={({ pressed }) => [styles.sendBtn, pressed && styles.sendBtnPressed, sending && styles.sendDisabled]}
            onPress={() => void send()}
            disabled={sending || !draft.trim()}
          >
            <Text style={styles.sendText}>{sending ? '…' : 'Send'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  bannerErr: { color: theme.danger, paddingHorizontal: 12, paddingVertical: 8 },
  listContent: { paddingHorizontal: 12, paddingVertical: 8 },
  empty: { color: theme.textDim, textAlign: 'center', padding: 24 },
  bubbleWrap: { marginBottom: 8, maxWidth: '92%' },
  bubbleAlignLeft: { alignSelf: 'flex-start' },
  bubbleAlignRight: { alignSelf: 'flex-end' },
  bubble: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: '100%',
  },
  bubbleFan: {
    backgroundColor: theme.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.border,
  },
  bubbleMe: {
    backgroundColor: theme.circeMuted,
  },
  bubbleText: { color: theme.text, fontSize: 15 },
  meta: { color: theme.textDim, fontSize: 10, marginTop: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: theme.text,
    backgroundColor: theme.surface,
    fontSize: 16,
  },
  sendBtn: {
    backgroundColor: theme.gold,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  sendBtnPressed: { opacity: 0.9 },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: theme.bg, fontWeight: '700' },
  err: { color: theme.danger, marginBottom: 8 },
  backBtn: { marginTop: 12 },
  backText: { color: theme.gold },
})
