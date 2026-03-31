import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { theme } from '@/constants/theme'

type DivineQuickContextValue = {
  openDivinePopup: () => void
  closeDivinePopup: () => void
}

const DivineQuickContext = createContext<DivineQuickContextValue | null>(null)

export function useDivineQuick() {
  const ctx = useContext(DivineQuickContext)
  if (!ctx) {
    throw new Error('useDivineQuick must be used within DivineQuickProvider')
  }
  return ctx
}

export function DivineQuickProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  const openDivinePopup = useCallback(() => setVisible(true), [])
  const closeDivinePopup = useCallback(() => setVisible(false), [])

  const value = useMemo(
    () => ({ openDivinePopup, closeDivinePopup }),
    [openDivinePopup, closeDivinePopup],
  )

  return (
    <DivineQuickContext.Provider value={value}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={closeDivinePopup}
      >
        <Pressable style={styles.backdrop} onPress={closeDivinePopup}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleRow}>
                <FontAwesome name="bolt" size={22} color={theme.gold} />
                <Text style={styles.sheetTitle}>Divine</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                hitSlop={12}
                onPress={closeDivinePopup}
              >
                <FontAwesome name="times" size={22} color={theme.textDim} />
              </Pressable>
            </View>
            <Text style={styles.sheetBody}>
              Automate fan conversations, DM bundles, and voice policies. Open the full manager to view and
              adjust settings synced from the web.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
              onPress={() => {
                closeDivinePopup()
                router.push('/(main)/divine-manager')
              }}
            >
              <Text style={styles.primaryBtnText}>Open Divine Manager</Text>
              <FontAwesome name="chevron-right" size={14} color={theme.bg} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}
              onPress={() => {
                closeDivinePopup()
                router.push('/(main)/messages')
              }}
            >
              <FontAwesome name="envelope" size={16} color={theme.gold} />
              <Text style={styles.secondaryBtnText}>Messages</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </DivineQuickContext.Provider>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    borderRadius: 16,
    backgroundColor: theme.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 20,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
  },
  sheetBody: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.textMuted,
    marginBottom: 20,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.gold,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  primaryBtnPressed: { opacity: 0.9 },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.bg,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  secondaryBtnPressed: { opacity: 0.85 },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
})
