import { useRouter } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ALL_TOOLS_META, type AIToolCategory } from '@/constants/ai-tools-data'
import { theme } from '@/constants/theme'

const CATEGORY_ORDER: AIToolCategory[] = ['content', 'engagement', 'analytics', 'protection', 'premium']

function groupByCategory() {
  const map = new Map<AIToolCategory, typeof ALL_TOOLS_META>()
  for (const t of ALL_TOOLS_META) {
    const list = map.get(t.category) ?? []
    list.push(t)
    map.set(t.category, list)
  }
  return map
}

export default function AiStudioScreen() {
  const router = useRouter()
  const grouped = groupByCategory()

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>AI Studio</Text>
        <Text style={styles.title}>Tools</Text>
        <Text style={styles.sub}>Tap a tool to run it against your deployed API (Bearer auth).</Text>

        {CATEGORY_ORDER.map((cat) => {
          const tools = grouped.get(cat) ?? []
          if (!tools.length) return null
          return (
            <View key={cat} style={styles.section}>
              <Text style={styles.sectionTitle}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
              {tools.map((t) => (
                <Pressable
                  key={t.id}
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                  onPress={() => {
                    if (t.hasRunner) {
                      router.push(`/(main)/ai-studio/tool/${t.id}`)
                    }
                  }}
                  disabled={!t.hasRunner}
                >
                  <Text style={styles.cardTitle}>{t.name}</Text>
                  <Text style={styles.cardDesc}>{t.description}</Text>
                  {!t.hasRunner ? (
                    <Text style={styles.muted}>Use web dashboard for this tool</Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )
        })}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 16, paddingBottom: 32 },
  kicker: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, color: theme.textDim, textTransform: 'uppercase' },
  title: { fontSize: 26, fontWeight: '700', color: theme.text, marginBottom: 4 },
  sub: { fontSize: 14, color: theme.textMuted, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: theme.gold, marginBottom: 10 },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
  },
  cardPressed: { opacity: 0.9 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: theme.text, marginBottom: 4 },
  cardDesc: { fontSize: 14, color: theme.textMuted },
  muted: { fontSize: 12, color: theme.textDim, marginTop: 6 },
})
