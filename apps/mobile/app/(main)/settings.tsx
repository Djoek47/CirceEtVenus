import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BrandLogo } from '@/components/brand-logo'
import { theme } from '@/constants/theme'
import { useAuth } from '@/contexts/auth'
import { apiFetch } from '@/lib/api'
import { supabase } from '@/lib/supabase'

export default function SettingsScreen() {
  const { session, signOut } = useAuth()
  const [onlyfansConnected, setOnlyfansConnected] = useState<boolean | null>(null)
  const [ofUsername, setOfUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [ofBusy, setOfBusy] = useState(false)
  const [ofModal, setOfModal] = useState(false)
  const [injectDone, setInjectDone] = useState(false)
  const [wvKey, setWvKey] = useState(0)
  const webRef = useRef<WebView>(null)

  const base = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '')

  const loadConnections = useCallback(async () => {
    if (!session?.user?.id) return
    const { data } = await supabase
      .from('platform_connections')
      .select('is_connected, platform_username')
      .eq('user_id', session.user.id)
      .eq('platform', 'onlyfans')
      .maybeSingle()
    setOnlyfansConnected(!!data?.is_connected)
    setOfUsername(data?.platform_username ?? null)
  }, [session?.user?.id])

  useEffect(() => {
    loadConnections().finally(() => setLoading(false))
  }, [loadConnections])

  const injectSession = useCallback(() => {
    if (!session || injectDone) return
    const payload = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    })
    const js = `
      (function(){
        window.__CREATIX_SESSION__ = ${payload};
        window.dispatchEvent(new Event('creatix-session-ready'));
      })();
      true;
    `
    webRef.current?.injectJavaScript(js)
    setInjectDone(true)
  }, [session, injectDone])

  async function disconnectOnlyfans() {
    setOfBusy(true)
    try {
      const res = await apiFetch('/api/onlyfans/disconnect', { method: 'POST' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error((j as { error?: string }).error ?? res.statusText)
      }
      await loadConnections()
    } finally {
      setOfBusy(false)
    }
  }

  function onWebMessage(event: { nativeEvent: { data: string } }) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type?: string }
      if (data.type === 'onlyfans-success') {
        setOfModal(false)
        setInjectDone(false)
        void loadConnections()
      }
      if (data.type === 'onlyfans-error') {
        setOfModal(false)
        setInjectDone(false)
      }
    } catch {
      /* ignore */
    }
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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <BrandLogo size={48} />
          <Text style={styles.heroTitle}>Settings</Text>
          <Text style={styles.heroSub}>Account and integrations (mirrors web dashboard)</Text>
        </View>

        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{session?.user?.email ?? '—'}</Text>
          <Pressable style={styles.signOut} onPress={() => void signOut()}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionLabel}>Integrations</Text>
        <View style={styles.card}>
          <Text style={styles.label}>OnlyFans</Text>
          <Text style={styles.value}>
            {onlyfansConnected
              ? `Connected${ofUsername ? ` · @${ofUsername}` : ''}`
              : 'Not connected'}
          </Text>
          {!base ? (
            <Text style={styles.warn}>Set EXPO_PUBLIC_API_URL to your web API origin to connect.</Text>
          ) : null}
          <View style={styles.row}>
            <Pressable
              style={[styles.btn, styles.btnPrimary, ofBusy && styles.btnDisabled]}
              disabled={ofBusy || !base || onlyfansConnected === true}
              onPress={() => {
                setInjectDone(false)
                setWvKey((k) => k + 1)
                setOfModal(true)
              }}
            >
              <Text style={styles.btnPrimaryText}>Connect OnlyFans</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnGhost, (ofBusy || !onlyfansConnected) && styles.btnDisabled]}
              disabled={ofBusy || !onlyfansConnected}
              onPress={() => void disconnectOnlyfans()}
            >
              <Text style={styles.btnGhostText}>Disconnect</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal visible={ofModal} animationType="slide" onRequestClose={() => setOfModal(false)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalBar}>
            <Pressable onPress={() => setOfModal(false)}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
            <Text style={styles.modalTitle}>OnlyFans</Text>
            <View style={{ width: 48 }} />
          </View>
          {base ? (
            <WebView
              key={wvKey}
              ref={webRef}
              source={{ uri: `${base}/mobile/onlyfans-connect` }}
              onLoadEnd={() => injectSession()}
              onMessage={onWebMessage}
              originWhitelist={['*']}
              javaScriptEnabled
              domStorageEnabled
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              setSupportMultipleWindows={false}
            />
          ) : (
            <Text style={styles.warn}>Missing EXPO_PUBLIC_API_URL</Text>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bg,
  },
  hero: { marginBottom: 20 },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text,
    marginTop: 12,
  },
  heroSub: { fontSize: 14, color: theme.textMuted, marginTop: 4 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: theme.textDim,
    marginBottom: 8,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 16,
    marginBottom: 12,
  },
  label: { fontSize: 13, color: theme.textMuted, marginBottom: 4 },
  value: { fontSize: 16, color: theme.text, marginBottom: 12 },
  warn: { fontSize: 13, color: theme.danger, marginBottom: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: theme.onlyfans },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.border,
  },
  btnGhostText: { color: theme.text, fontWeight: '600', fontSize: 15 },
  btnDisabled: { opacity: 0.5 },
  signOut: { alignSelf: 'flex-start', marginTop: 4 },
  signOutText: { color: theme.danger, fontWeight: '600', fontSize: 15 },
  modalWrap: { flex: 1, backgroundColor: theme.bg },
  modalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  close: { color: theme.gold, fontSize: 16, fontWeight: '600' },
  modalTitle: { color: theme.text, fontSize: 17, fontWeight: '600' },
})
