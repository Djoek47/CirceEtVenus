import * as Linking from 'expo-linking'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '@/constants/theme'

export default function GuideScreen() {
  const base = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '')
  const guideUrl = base ? `${base}/dashboard/guide` : ''

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Help &amp; guide</Text>
        <Text style={styles.p}>
          Circe et Venus pairs Circe (retention, analytics, protection) with Venus (growth, fans,
          reputation). Connect platforms in Settings, use AI Studio for tools, and open the full
          guide on the web for every section.
        </Text>
        {guideUrl ? (
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
            onPress={() => void Linking.openURL(guideUrl)}
          >
            <Text style={styles.btnText}>Open full guide in browser</Text>
          </Pressable>
        ) : (
          <Text style={styles.warn}>Set EXPO_PUBLIC_API_URL to open the web guide.</Text>
        )}
        <Text style={styles.section}>Quick tips</Text>
        <Text style={styles.bullet}>• Bearer-authenticated APIs: use the same sign-in as the web app.</Text>
        <Text style={styles.bullet}>• OnlyFans: Settings → Connect OnlyFans (in-app WebView).</Text>
        <Text style={styles.bullet}>• Fansly: Settings → email/password connect (API).</Text>
        <Text style={styles.bullet}>• Messages: requires OnlyFans connected.</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 12 },
  p: { fontSize: 15, lineHeight: 22, color: theme.textMuted, marginBottom: 16 },
  btn: {
    backgroundColor: theme.gold,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  pressed: { opacity: 0.9 },
  btnText: { color: '#0a0a0a', fontWeight: '700', fontSize: 16 },
  warn: { color: theme.danger, marginBottom: 8 },
  section: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: theme.textDim,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  bullet: { fontSize: 14, color: theme.text, marginBottom: 8, lineHeight: 20 },
})
