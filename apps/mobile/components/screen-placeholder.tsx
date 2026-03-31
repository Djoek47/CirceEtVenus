import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { theme } from '@/constants/theme'

type Props = {
  title: string
  description?: string
}

export function ScreenPlaceholder({ title, description }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>
          {description ?? 'Full parity with the web dashboard is coming soon. Use the web app for this area.'}
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  container: { flex: 1, padding: 24 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
  },
  sub: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.textMuted,
  },
})
