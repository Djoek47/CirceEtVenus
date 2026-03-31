import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BrandLogo } from '@/components/brand-logo'
import { theme } from '@/constants/theme'
import { useAuth } from '@/contexts/auth'
import { useImagePick } from '@/hooks/use-image-pick'
import { apiFetch } from '@/lib/api'
import { supabase } from '@/lib/supabase'

const FANSLY = '#009fff'

export default function SettingsScreen() {
  const { session, signOut } = useAuth()
  const [onlyfansConnected, setOnlyfansConnected] = useState<boolean | null>(null)
  const [fanslyConnected, setFanslyConnected] = useState<boolean | null>(null)
  const [ofUsername, setOfUsername] = useState<string | null>(null)
  const [fanslyUsername, setFanslyUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [ofBusy, setOfBusy] = useState(false)
  const [fanslyBusy, setFanslyBusy] = useState(false)
  const [ofModal, setOfModal] = useState(false)
  const [injectDone, setInjectDone] = useState(false)
  const [wvKey, setWvKey] = useState(0)
  const webRef = useRef<WebView>(null)

  const [fanslyModal, setFanslyModal] = useState(false)
  const [fanslyEmail, setFanslyEmail] = useState('')
  const [fanslyPassword, setFanslyPassword] = useState('')
  const [fansly2FAToken, setFansly2FAToken] = useState<string | null>(null)
  const [fansly2FACode, setFansly2FACode] = useState('')
  const [fanslyMasked, setFanslyMasked] = useState<string | null>(null)
  const [lastPickUri, setLastPickUri] = useState<string | null>(null)

  const { pickLibrary, pickCamera } = useImagePick()
  const base = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '')

  const loadConnections = useCallback(async () => {
    if (!session?.user?.id) return
    const { data } = await supabase
      .from('platform_connections')
      .select('platform, is_connected, platform_username')
      .eq('user_id', session.user.id)
      .in('platform', ['onlyfans', 'fansly'])

    const rows = data ?? []
    const of = rows.find((r) => r.platform === 'onlyfans')
    const fs = rows.find((r) => r.platform === 'fansly')
    setOnlyfansConnected(!!of?.is_connected)
    setOfUsername(of?.platform_username ?? null)
    setFanslyConnected(!!fs?.is_connected)
    setFanslyUsername(fs?.platform_username ?? null)
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
        const msg = (j as { error?: string }).error ?? res.statusText
        Alert.alert(
          'OnlyFans',
          res.status === 401
            ? 'Session expired or not signed in. Sign out and sign in again, and confirm EXPO_PUBLIC_API_URL matches your live site.'
            : msg,
        )
        return
      }
      await loadConnections()
    } catch (e) {
      Alert.alert('OnlyFans', e instanceof Error ? e.message : 'Disconnect failed')
    } finally {
      setOfBusy(false)
    }
  }

  function resetFanslyForm() {
    setFanslyEmail('')
    setFanslyPassword('')
    setFansly2FAToken(null)
    setFansly2FACode('')
    setFanslyMasked(null)
  }

  async function submitFansly() {
    setFanslyBusy(true)
    try {
      const body: Record<string, string | undefined> = {
        username: fanslyEmail.trim(),
        password: fanslyPassword,
        countryCode: 'US',
      }
      if (fansly2FAToken && fansly2FACode.trim()) {
        body.twoFactorToken = fansly2FAToken
        body.twoFactorCode = fansly2FACode.trim()
      }
      const res = await apiFetch('/api/fansly/auth', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as {
        success?: boolean
        requires_2fa?: boolean
        twoFactorToken?: string
        masked_email?: string
        error?: string
        code?: string
      }
      if (res.status === 409 && json.code === 'ALREADY_CONNECTED') {
        setFanslyModal(false)
        resetFanslyForm()
        await loadConnections()
        return
      }
      if (!res.ok) {
        throw new Error(json.error ?? res.statusText)
      }
      if (json.requires_2fa && json.twoFactorToken) {
        setFansly2FAToken(json.twoFactorToken)
        setFanslyMasked(json.masked_email ?? null)
        return
      }
      if (json.success) {
        try {
          await apiFetch('/api/fansly/sync', { method: 'POST' })
        } catch {
          /* non-fatal */
        }
        setFanslyModal(false)
        resetFanslyForm()
        await loadConnections()
      }
    } catch (e) {
      Alert.alert('Fansly', e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setFanslyBusy(false)
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

        <Text style={styles.sectionLabel}>Media (demo)</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Camera and library</Text>
          <Text style={styles.hint}>
            Uses expo-image-picker; iOS/Android permission strings are in app.config. Prefer a physical device
            for camera tests.
          </Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.btn, styles.btnGhost]}
              onPress={async () => {
                const res = await pickLibrary()
                if (res.ok) {
                  setLastPickUri(res.uri)
                  Alert.alert('Photo', res.uri.slice(-48))
                } else if (res.reason) Alert.alert('Photos', res.reason)
              }}
            >
              <Text style={styles.btnGhostText}>Pick photo</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnGhost]}
              onPress={async () => {
                const res = await pickCamera()
                if (res.ok) {
                  setLastPickUri(res.uri)
                  Alert.alert('Camera', res.uri.slice(-48))
                } else if (res.reason) Alert.alert('Camera', res.reason)
              }}
            >
              <Text style={styles.btnGhostText}>Take photo</Text>
            </Pressable>
          </View>
          {lastPickUri ? (
            <Text style={styles.uriPreview} numberOfLines={2}>
              Last: {lastPickUri}
            </Text>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>Integrations</Text>
        <View style={styles.card}>
          <Text style={styles.label}>OnlyFans</Text>
          <Text style={styles.value}>
            {onlyfansConnected ? `Connected${ofUsername ? ` · @${ofUsername}` : ''}` : 'Not connected'}
          </Text>
          {!base ? (
            <Text style={styles.warn}>Set EXPO_PUBLIC_API_URL to your web API origin to connect.</Text>
          ) : null}
          <View style={styles.row}>
            <Pressable
              style={[styles.btn, styles.btnOf, ofBusy && styles.btnDisabled]}
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

        <View style={styles.card}>
          <Text style={styles.label}>Fansly</Text>
          <Text style={styles.value}>
            {fanslyConnected ? `Connected${fanslyUsername ? ` · ${fanslyUsername}` : ''}` : 'Not connected'}
          </Text>
          <Text style={styles.hint}>Uses the same Fansly login API as the web app (2FA supported).</Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.btn, { backgroundColor: FANSLY }, fanslyBusy && styles.btnDisabled]}
              disabled={fanslyBusy || fanslyConnected === true}
              onPress={() => {
                resetFanslyForm()
                setFanslyModal(true)
              }}
            >
              <Text style={styles.btnPrimaryText}>Connect Fansly</Text>
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

      <Modal visible={fanslyModal} animationType="slide" onRequestClose={() => setFanslyModal(false)}>
        <SafeAreaView style={styles.modalWrap}>
          <View style={styles.modalBar}>
            <Pressable onPress={() => setFanslyModal(false)}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Fansly</Text>
            <View style={{ width: 48 }} />
          </View>
          <ScrollView contentContainerStyle={styles.fanslyScroll} keyboardShouldPersistTaps="handled">
            {fanslyMasked ? (
              <Text style={styles.hint}>Code sent to {fanslyMasked}</Text>
            ) : null}
            {fansly2FAToken ? (
              <TextInput
                style={styles.input}
                placeholder="6-digit code"
                placeholderTextColor={theme.textDim}
                value={fansly2FACode}
                onChangeText={setFansly2FACode}
                keyboardType="number-pad"
              />
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor={theme.textDim}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={fanslyEmail}
                  onChangeText={setFanslyEmail}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={theme.textDim}
                  secureTextEntry
                  value={fanslyPassword}
                  onChangeText={setFanslyPassword}
                />
              </>
            )}
            <Pressable
              style={[styles.btn, { backgroundColor: FANSLY }, fanslyBusy && styles.btnDisabled]}
              disabled={fanslyBusy}
              onPress={() => void submitFansly()}
            >
              <Text style={styles.btnPrimaryText}>Connect</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
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
  hint: { fontSize: 13, color: theme.textMuted, marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
  },
  btnOf: { backgroundColor: theme.onlyfans },
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
  uriPreview: { fontSize: 11, color: theme.textDim, marginTop: 8 },
  fanslyScroll: { padding: 16 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.text,
    marginBottom: 12,
    backgroundColor: theme.surface,
  },
})
