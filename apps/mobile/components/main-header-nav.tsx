import { Pressable, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { theme } from '@/constants/theme'
import { useDivineQuick } from '@/contexts/divine-quick'

const BTN_SIZE = 40

export function MainHeaderNav() {
  const router = useRouter()
  const { openDivinePopup } = useDivineQuick()

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Messages"
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        onPress={() => router.push('/(main)/messages')}
      >
        <FontAwesome name="envelope" size={18} color={theme.gold} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="AI Studio"
        style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        onPress={() => router.push('/(main)/ai-studio')}
      >
        <FontAwesome name="star" size={18} color={theme.gold} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Divine quick actions"
        style={({ pressed }) => [styles.btn, styles.divineBtn, pressed && styles.pressed]}
        onPress={openDivinePopup}
      >
        <FontAwesome name="bolt" size={18} color={theme.bg} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 4,
  },
  btn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
  },
  divineBtn: {
    backgroundColor: theme.gold,
    borderColor: theme.goldMuted,
  },
  pressed: { opacity: 0.85 },
})
