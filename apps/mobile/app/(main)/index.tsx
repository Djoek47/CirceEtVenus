import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BrandLogo } from '@/components/brand-logo'
import { theme } from '@/constants/theme'
import { useAuth } from '@/contexts/auth'

export default function HomeScreen() {
  const { session } = useAuth()
  const router = useRouter()

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.brandRow}>
          <BrandLogo size={56} />
          <Text style={styles.kicker}>Welcome back</Text>
          <Text style={styles.title}>Circe et Venus</Text>
        </View>
        <Text style={styles.muted}>{session?.user?.email ?? '—'}</Text>

        <Pressable
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          onPress={() => router.push('/(main)/community')}
        >
          <Text style={styles.cardTitle}>Community tips</Text>
          <Text style={styles.cardSub}>Same `/api/community/tips` as the web app (Bearer auth)</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  container: {
    flex: 1,
    padding: 24,
  },
  brandRow: {
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  kicker: {
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontSize: 12,
    color: theme.textDim,
    marginBottom: 6,
    marginTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 6,
  },
  muted: {
    fontSize: 15,
    color: theme.textMuted,
    marginBottom: 28,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 13,
    color: theme.textDim,
  },
})
