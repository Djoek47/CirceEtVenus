import { useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BrandLogo } from '@/components/brand-logo'
import { motion } from '@/constants/motion'
import { theme } from '@/constants/theme'
import { useAuth } from '@/contexts/auth'
import { useDivineQuick } from '@/contexts/divine-quick'
import { useDashboardStats } from '@/hooks/use-dashboard-stats'
import { useResponsive } from '@/hooks/use-responsive'

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`
  return `$${Math.round(n)}`
}

export default function HomeScreen() {
  const { session } = useAuth()
  const router = useRouter()
  const { openDivinePopup } = useDivineQuick()
  const { stats, loading } = useDashboardStats()
  const r = useResponsive()

  const navButtons = [
    { label: 'Messages', icon: 'envelope' as const, onPress: () => router.push('/(main)/messages') },
    { label: 'AI Studio', icon: 'star' as const, onPress: () => router.push('/(main)/ai-studio') },
    { label: 'Analytics', icon: 'bar-chart' as const, onPress: () => router.push('/(main)/analytics') },
    { label: 'Divine', icon: 'bolt' as const, onPress: openDivinePopup, accent: true },
  ]

  const shortcuts = [
    { title: 'Community tips', sub: 'Approved tips via Bearer API', href: '/(main)/community' as const },
    { title: 'AI Studio', sub: 'Tools & runners', href: '/(main)/ai-studio' as const },
    { title: 'Analytics', sub: 'Revenue & snapshots', href: '/(main)/analytics' as const },
    { title: 'Messages', sub: 'OnlyFans threads (when connected)', href: '/(main)/messages' as const },
  ]

  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingHorizontal: r.scaleSpace(24), paddingBottom: r.scaleSpace(40) },
        ]}
      >
        <Animated.View entering={FadeIn.duration(motion.duration)}>
          <View style={styles.brandRow}>
            <BrandLogo size={r.scaleSpace(56)} />
            <Text style={[styles.kicker, { fontSize: r.scaleFont(12) }]}>Welcome back</Text>
            <Text style={[styles.title, { fontSize: r.scaleFont(28) }]}>Circe et Venus</Text>
            <Text style={[styles.muted, { fontSize: r.scaleFont(15) }]}>
              {session?.user?.email ?? '—'}
            </Text>
          </View>
        </Animated.View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.navRow,
            { gap: r.scaleSpace(10), paddingVertical: r.scaleSpace(4), marginBottom: r.scaleSpace(10) },
          ]}
        >
          {navButtons.map((b) => (
            <Pressable
              key={b.label}
              accessibilityRole="button"
              accessibilityLabel={b.label}
              onPress={b.onPress}
              style={({ pressed }) => [
                styles.navPill,
                b.accent && styles.navPillAccent,
                { paddingVertical: r.scaleSpace(10), paddingHorizontal: r.scaleSpace(14) },
                pressed && styles.cardPressed,
              ]}
            >
              <FontAwesome
                name={b.icon}
                size={r.scaleFont(14)}
                color={b.accent ? theme.bg : theme.gold}
              />
              <Text
                style={[
                  styles.navPillText,
                  b.accent && styles.navPillTextAccent,
                  { fontSize: r.scaleFont(13) },
                ]}
              >
                {b.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator size="large" color={theme.gold} style={styles.loader} />
        ) : stats ? (
          <View style={[styles.grid, { gap: r.scaleSpace(10) }]}>
            {(
              [
                ['Revenue (snapshots)', fmtMoney(stats.totalRevenue)],
                ['Fans', String(stats.totalFans)],
                ['Conversations', String(stats.activeConversations)],
                ['Scheduled', String(stats.scheduledContent)],
                ['Leak alerts', String(stats.leakAlerts)],
                ['Mentions to review', String(stats.mentionsToReview)],
              ] as const
            ).map(([label, value], i) => (
              <Animated.View
                key={label}
                entering={FadeInDown.delay(i * motion.stagger).duration(motion.duration)}
                style={[
                  styles.statCard,
                  stats.leakAlerts > 0 && label === 'Leak alerts' && styles.statAlert,
                  { padding: r.scaleSpace(14), width: '47%' },
                ]}
              >
                <Text style={[styles.statLabel, { fontSize: r.scaleFont(12) }]}>{label}</Text>
                <Text style={[styles.statValue, { fontSize: r.scaleFont(22) }]}>{value}</Text>
              </Animated.View>
            ))}
          </View>
        ) : (
          <Text style={[styles.hint, { fontSize: r.scaleFont(14) }]}>Sign in to load dashboard stats.</Text>
        )}

        {!stats?.hasConnectedPlatforms ? (
          <Text style={[styles.banner, { fontSize: r.scaleFont(13), padding: r.scaleSpace(12) }]}>
            Connect OnlyFans or Fansly in Settings to sync platform analytics and messages.
          </Text>
        ) : null}

        <Text style={[styles.section, { fontSize: r.scaleFont(12) }]}>Shortcuts</Text>
        {shortcuts.map((s, i) => (
          <Animated.View
            key={s.href}
            entering={FadeInDown.delay(200 + i * motion.stagger).duration(motion.duration)}
          >
            <Pressable
              style={({ pressed }) => [
                styles.card,
                { padding: r.scaleSpace(16), marginBottom: r.scaleSpace(10) },
                pressed && styles.cardPressed,
              ]}
              onPress={() => router.push(s.href)}
            >
              <Text style={[styles.cardTitle, { fontSize: r.scaleFont(17) }]}>{s.title}</Text>
              <Text style={[styles.cardSub, { fontSize: r.scaleFont(13) }]}>{s.sub}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { flexGrow: 1 },
  brandRow: { alignItems: 'flex-start', marginBottom: 8 },
  navRow: { flexDirection: 'row', alignItems: 'center' },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  navPillAccent: {
    backgroundColor: theme.gold,
    borderColor: theme.goldMuted,
  },
  navPillText: { fontWeight: '600', color: theme.text },
  navPillTextAccent: { color: theme.bg },
  kicker: {
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: theme.textDim,
    marginBottom: 6,
    marginTop: 12,
  },
  title: { fontWeight: '700', color: theme.text, marginBottom: 6 },
  muted: { color: theme.textMuted, marginBottom: 8 },
  loader: { marginVertical: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  statCard: {
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  statAlert: { borderColor: theme.danger },
  statLabel: { color: theme.textDim, marginBottom: 4 },
  statValue: { fontWeight: '700', color: theme.text },
  hint: { color: theme.textMuted, marginBottom: 12 },
  banner: {
    color: theme.gold,
    marginBottom: 16,
    borderRadius: 10,
    backgroundColor: theme.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.border,
  },
  section: {
    fontWeight: '700',
    letterSpacing: 1,
    color: theme.textDim,
    marginBottom: 10,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 14,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardPressed: { opacity: 0.9 },
  cardTitle: { fontWeight: '600', color: theme.text, marginBottom: 4 },
  cardSub: { color: theme.textDim },
})
