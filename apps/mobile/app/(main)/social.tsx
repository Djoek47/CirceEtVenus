import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '@/constants/theme'
import { apiFetch } from '@/lib/api'

type CommunityLink = { id: string; label: string; url: string }

export default function SocialScreen() {
  const [links, setLinks] = useState<CommunityLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const res = await apiFetch('/api/profile/community-links')
    const json = (await res.json()) as { links?: CommunityLink[]; error?: string }
    if (!res.ok) {
      setError(json.error ?? res.statusText)
      setLinks([])
      return
    }
    setLinks(json.links ?? [])
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
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
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Social</Text>
        <Text style={styles.sub}>Community links from your profile (GET /api/profile/community-links)</Text>
        {error ? <Text style={styles.err}>{error}</Text> : null}
        {links.map((l) => (
          <Pressable
            key={l.id}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => void Linking.openURL(l.url)}
          >
            <Text style={styles.cardTitle}>{l.label}</Text>
            <Text style={styles.url} numberOfLines={2}>
              {l.url}
            </Text>
          </Pressable>
        ))}
        {links.length === 0 && !error ? (
          <Text style={styles.hint}>Add links on the web dashboard → Social.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.bg },
  scroll: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 22, fontWeight: '700', color: theme.text, marginBottom: 4 },
  sub: { fontSize: 13, color: theme.textMuted, marginBottom: 12 },
  err: { color: theme.danger, marginBottom: 8 },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
  },
  pressed: { opacity: 0.85 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: theme.text },
  url: { fontSize: 13, color: theme.circe, marginTop: 6 },
  hint: { fontSize: 14, color: theme.textDim, marginTop: 8 },
})
