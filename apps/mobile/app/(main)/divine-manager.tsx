import { useCallback, useEffect, useState } from 'react'
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
import Animated, { FadeIn } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { motion } from '@/constants/motion'
import { theme } from '@/constants/theme'
import { formatApiScreenError } from '@/lib/api-errors'
import { apiFetch } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useResponsive } from '@/hooks/use-responsive'
import { DivineVoiceVisual } from '@/components/divine-voice-visual'
import { useDivineVoiceSession } from '@/hooks/use-divine-voice-session'

type DivineSettings = {
  voice_hangup_policy?: string
  dm_focus_mode?: string
  divine_send_delay_ms?: number
  dm_pricing_style?: string
}

type ChatMessage = { role: 'user' | 'assistant'; content: string }

type PendingAction = { type: string; intent_id: string; summary?: string }

type ChatResponse = {
  reply?: string
  error?: string
  actions?: PendingAction[]
}

export default function DivineManagerScreen() {
  const r = useResponsive()
  const voice = useDivineVoiceSession()
  const dismissVoicePending = voice.dismissPendingConfirmation

  const [settings, setSettings] = useState<DivineSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [pendingChatActions, setPendingChatActions] = useState<PendingAction[]>([])
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [dmPreviewLoading, setDmPreviewLoading] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    const res = await apiFetch('/api/divine/manager-settings')
    const json = (await res.json()) as DivineSettings & { error?: string; message?: string }
    if (!res.ok) {
      setError(formatApiScreenError(res.status, json.error, json.message))
      setSettings(null)
      return
    }
    setSettings(json)
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

  const sendChat = useCallback(async () => {
    const trimmed = chatInput.trim()
    if (!trimmed || chatLoading) return
    let nextMessages: ChatMessage[] = []
    setChatMessages((prev) => {
      nextMessages = [...prev, { role: 'user', content: trimmed }]
      return nextMessages
    })
    setChatInput('')
    setChatLoading(true)
    setPendingChatActions([])
    try {
      const res = await apiFetch('/api/ai/divine-manager-chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })
      const data = (await res.json()) as ChatResponse
      if (!res.ok) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: formatApiScreenError(res.status, data.error, undefined),
          },
        ])
        return
      }
      if (data.reply != null && data.reply !== '') {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: data.reply as string }])
      }
      if (data.actions?.length) {
        setPendingChatActions(data.actions)
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network error. Check EXPO_PUBLIC_API_URL and try again.' },
      ])
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, chatLoading])

  const confirmIntent = useCallback(
    async (intentId: string, source: 'chat' | 'voice') => {
      setConfirmingId(intentId)
      try {
        const res = await apiFetch('/api/divine/intent', {
          method: 'POST',
          body: JSON.stringify({ intent_id: intentId, confirm: true }),
        })
        const data = (await res.json()) as { status?: string; summary?: string; error?: string }
        if (res.ok && (data.status === 'executed' || data.status === 'already_handled')) {
          if (source === 'chat') {
            setPendingChatActions((prev) => prev.filter((a) => a.intent_id !== intentId))
          } else {
            dismissVoicePending(intentId)
          }
          setChatMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: data.summary?.trim()
                ? `Confirmed: ${data.summary}`
                : 'Action confirmed.',
            },
          ])
        } else if (data.error) {
          setChatMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `Confirm failed: ${data.error}` },
          ])
        }
      } finally {
        setConfirmingId(null)
      }
    },
    [dismissVoicePending],
  )

  const loadDmPreview = useCallback(async () => {
    setDmPreviewLoading(true)
    try {
      const res = await apiFetch('/api/divine/dm-conversations?limit=15')
      const data = (await res.json()) as {
        conversations?: Array<{
          fanId: string
          username: string
          name: string | null
          unreadCount: number
          lastMessage: string | null
        }>
        message?: string
        error?: string
      }
      if (!res.ok) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: formatApiScreenError(res.status, data.error, undefined),
          },
        ])
        return
      }
      if (data.message?.trim()) {
        setChatMessages((prev) => [...prev, { role: 'assistant', content: data.message! }])
        return
      }
      const rows = data.conversations ?? []
      if (rows.length === 0) {
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'No DM conversations returned (connect OnlyFans in Settings).' },
        ])
        return
      }
      const lines = rows.map(
        (c) =>
          `@${c.username}${c.name ? ` (${c.name})` : ''} · id ${c.fanId} · unread ${c.unreadCount}${c.lastMessage ? ` · last: ${c.lastMessage.slice(0, 80)}` : ''}`,
      )
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Recent OnlyFans DMs (${rows.length}):\n${lines.join('\n')}` },
      ])
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Could not load DM list. Check connection and EXPO_PUBLIC_API_URL.' },
      ])
    } finally {
      setDmPreviewLoading(false)
    }
  }, [])

  const pad = r.scaleSpace(16)

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.gold} />
      </View>
    )
  }

  const pendingVoice = voice.pendingConfirmations
  const voiceHint =
    !voice.voiceAvailable && Platform.OS !== 'web'
      ? 'Install an EAS development build to use Divine voice (native WebRTC).'
      : !voice.voiceAvailable && Platform.OS === 'web'
        ? 'Voice is available on iOS/Android development builds, not in the browser preview.'
        : null

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <FlatList
          data={chatMessages}
          keyExtractor={(_, i) => `m-${i}`}
          contentContainerStyle={{ padding: pad, paddingBottom: r.scaleSpace(24) }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.gold} />
          }
          ListHeaderComponent={
            <Animated.View entering={FadeIn.duration(motion.durationSlow)}>
              <Text style={[styles.heading, { fontSize: r.scaleFont(22) }]}>Divine Manager</Text>
              <Text style={[styles.sub, { fontSize: r.scaleFont(13), marginBottom: r.scaleSpace(12) }]}>
                Text chat and intents use the same APIs as the web dashboard. Voice uses OpenAI Realtime over
                WebRTC on native builds.
              </Text>
              {error ? (
                <Text style={[styles.err, { fontSize: r.scaleFont(14) }]}>{error}</Text>
              ) : null}
              {settings ? (
                <Animated.View
                  entering={FadeIn.delay(motion.stagger).duration(motion.duration)}
                  style={[styles.card, { padding: r.scaleSpace(16), marginBottom: r.scaleSpace(16) }]}
                >
                  <Text style={[styles.cardTitle, { fontSize: r.scaleFont(15) }]}>Settings</Text>
                  <Text style={[styles.line, { fontSize: r.scaleFont(14), marginBottom: r.scaleSpace(6) }]}>
                    Voice hangup: {settings.voice_hangup_policy ?? '—'}
                  </Text>
                  <Text style={[styles.line, { fontSize: r.scaleFont(14), marginBottom: r.scaleSpace(6) }]}>
                    DM focus: {settings.dm_focus_mode ?? '—'}
                  </Text>
                  <Text style={[styles.line, { fontSize: r.scaleFont(14), marginBottom: r.scaleSpace(6) }]}>
                    Send delay: {settings.divine_send_delay_ms ?? '—'} ms
                  </Text>
                  <Text style={[styles.line, { fontSize: r.scaleFont(14) }]}>
                    DM pricing style: {settings.dm_pricing_style ?? '—'}
                  </Text>
                </Animated.View>
              ) : null}

              <View style={[styles.card, { padding: r.scaleSpace(16), marginBottom: r.scaleSpace(16) }]}>
                <Text style={[styles.cardTitle, { fontSize: r.scaleFont(15) }]}>DM tools</Text>
                <Text style={[styles.muted, { fontSize: r.scaleFont(12), marginBottom: r.scaleSpace(10) }]}>
                  Same API as web Divine — pull a fresh conversation list into the chat below.
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.secondaryBtn,
                    { alignSelf: 'flex-start' },
                    pressed && styles.pressed,
                    dmPreviewLoading && styles.btnDisabled,
                  ]}
                  disabled={dmPreviewLoading}
                  onPress={() => void loadDmPreview()}
                >
                  {dmPreviewLoading ? (
                    <ActivityIndicator color={theme.text} size="small" />
                  ) : (
                    <Text style={styles.secondaryBtnText}>Load recent DM list</Text>
                  )}
                </Pressable>
              </View>

              <View style={[styles.card, { padding: r.scaleSpace(16), marginBottom: r.scaleSpace(16) }]}>
                <Text style={[styles.cardTitle, { fontSize: r.scaleFont(15) }]}>Voice (Realtime)</Text>
                {voice.error ? (
                  <Text style={[styles.err, { fontSize: r.scaleFont(13), marginBottom: 8 }]}>{voice.error}</Text>
                ) : null}
                {voiceHint ? (
                  <Text style={[styles.muted, { fontSize: r.scaleFont(13), marginBottom: 10 }]}>{voiceHint}</Text>
                ) : null}
                <View style={styles.voiceRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      pressed && styles.pressed,
                      (voice.status === 'connecting' || !voice.voiceAvailable) && styles.btnDisabled,
                    ]}
                    disabled={voice.status === 'connecting' || !voice.voiceAvailable}
                    onPress={() => void voice.startVoiceCall()}
                  >
                    {voice.status === 'connecting' ? (
                      <ActivityIndicator color={theme.bg} />
                    ) : (
                      <Text style={styles.primaryBtnText}>Start voice</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      pressed && styles.pressed,
                      voice.status !== 'connected' && voice.status !== 'connecting' && styles.btnDisabled,
                    ]}
                    disabled={voice.status !== 'connected' && voice.status !== 'connecting'}
                    onPress={() => voice.endVoiceCall()}
                  >
                    <Text style={styles.secondaryBtnText}>End</Text>
                  </Pressable>
                </View>
                {voice.voiceAvailable &&
                (voice.status === 'connecting' || voice.status === 'connected') ? (
                  <DivineVoiceVisual surface={voice.voiceSurfaceState} />
                ) : null}
                <Text style={[styles.muted, { fontSize: r.scaleFont(12), marginTop: 8 }]}>
                  Status: {voice.status}
                  {voice.status === 'connected' ? ` · ${voice.voiceSurfaceState} · mic` : ''}
                </Text>
              </View>

              {(pendingChatActions.length > 0 || pendingVoice.length > 0) && (
                <View style={[styles.card, { padding: r.scaleSpace(16), marginBottom: r.scaleSpace(16) }]}>
                  <Text style={[styles.cardTitle, { fontSize: r.scaleFont(15) }]}>Confirm actions</Text>
                  {pendingChatActions.map((a) => (
                    <View key={`c-${a.intent_id}`} style={styles.intentRow}>
                      <Text style={[styles.line, { flex: 1, fontSize: r.scaleFont(13) }]}>
                        {a.type}
                        {a.summary ? `: ${a.summary}` : ''}
                      </Text>
                      <Pressable
                        style={({ pressed }) => [styles.smallBtn, pressed && styles.pressed]}
                        disabled={confirmingId === a.intent_id}
                        onPress={() => void confirmIntent(a.intent_id, 'chat')}
                      >
                        {confirmingId === a.intent_id ? (
                          <ActivityIndicator color={theme.gold} size="small" />
                        ) : (
                          <Text style={styles.smallBtnText}>Confirm</Text>
                        )}
                      </Pressable>
                    </View>
                  ))}
                  {pendingVoice.map((a: PendingAction) => (
                    <View key={`v-${a.intent_id}`} style={styles.intentRow}>
                      <Text style={[styles.line, { flex: 1, fontSize: r.scaleFont(13) }]}>
                        (voice) {a.type}
                        {a.summary ? `: ${a.summary}` : ''}
                      </Text>
                      <Pressable
                        style={({ pressed }) => [styles.smallBtn, pressed && styles.pressed]}
                        disabled={confirmingId === a.intent_id}
                        onPress={() => void confirmIntent(a.intent_id, 'voice')}
                      >
                        {confirmingId === a.intent_id ? (
                          <ActivityIndicator color={theme.gold} size="small" />
                        ) : (
                          <Text style={styles.smallBtnText}>Confirm</Text>
                        )}
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <Text style={[styles.cardTitle, { fontSize: r.scaleFont(15), marginBottom: 8 }]}>Ask Divine</Text>
            </Animated.View>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
              ]}
            >
              <Text style={[styles.bubbleText, { fontSize: r.scaleFont(14) }]}>{item.content}</Text>
            </View>
          )}
        />

        <View style={[styles.composer, { paddingHorizontal: pad, paddingBottom: r.scaleSpace(12) }]}>
          <TextInput
            style={[styles.input, { fontSize: r.scaleFont(15), minHeight: r.scaleSpace(44) }]}
            placeholder="Message Divine…"
            placeholderTextColor={theme.textDim}
            value={chatInput}
            onChangeText={setChatInput}
            editable={!chatLoading}
            multiline
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              pressed && styles.pressed,
              (!chatInput.trim() || chatLoading) && styles.btnDisabled,
            ]}
            disabled={!chatInput.trim() || chatLoading}
            onPress={() => void sendChat()}
          >
            {chatLoading ? (
              <ActivityIndicator color={theme.bg} size="small" />
            ) : (
              <Text style={styles.sendBtnText}>Send</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  heading: { fontWeight: '700', color: theme.text, marginBottom: 4 },
  sub: { color: theme.textMuted },
  err: { color: theme.danger, marginBottom: 8 },
  muted: { color: theme.textMuted },
  card: {
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardTitle: { fontWeight: '700', color: theme.text, marginBottom: 8 },
  line: { color: theme.text },
  voiceRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  primaryBtn: {
    flex: 1,
    backgroundColor: theme.gold,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryBtnText: { fontWeight: '700', color: theme.bg, fontSize: 15 },
  secondaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryBtnText: { fontWeight: '600', color: theme.text, fontSize: 15 },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.gold,
  },
  smallBtnText: { color: theme.gold, fontWeight: '600', fontSize: 13 },
  intentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  bubble: {
    maxWidth: '92%',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: 'rgba(212, 175, 55, 0.18)' },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  bubbleText: { color: theme.text },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 10,
    backgroundColor: theme.bg,
  },
  input: {
    flex: 1,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.surface,
  },
  sendBtn: {
    backgroundColor: theme.gold,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  sendBtnText: { fontWeight: '700', color: theme.bg, fontSize: 15 },
  pressed: { opacity: 0.88 },
  btnDisabled: { opacity: 0.45 },
})
