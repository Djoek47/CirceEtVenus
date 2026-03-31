import React from 'react'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { Redirect } from 'expo-router'
import { Drawer } from 'expo-router/drawer'
import { DrawerToggleButton } from '@react-navigation/drawer'
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { MainHeaderNav } from '@/components/main-header-nav'
import { useAuth } from '@/contexts/auth'
import { DivineQuickProvider } from '@/contexts/divine-quick'
import { theme } from '@/constants/theme'

function drawerIcon(name: React.ComponentProps<typeof FontAwesome>['name']) {
  return ({ color, size }: { color: string; size: number }) => (
    <FontAwesome name={name} size={size ?? 20} color={color} />
  )
}

/** Screen title only — logo lives on the dashboard body to avoid truncation with drawer + nav icons. */
function headerTitleOnly({ children }: { children: string }) {
  return (
    <View style={styles.headerTitleWrap}>
      <Text style={styles.headerTitleText} numberOfLines={1}>
        {children}
      </Text>
    </View>
  )
}

export default function MainDrawerLayout() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.gold} />
      </View>
    )
  }

  if (!session) {
    return <Redirect href="/login" />
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <DivineQuickProvider>
        <Drawer
          screenOptions={{
            headerStyle: { backgroundColor: theme.bg },
            headerTintColor: theme.text,
            headerShadowVisible: false,
            drawerStyle: { backgroundColor: theme.bg },
            drawerActiveTintColor: theme.gold,
            drawerInactiveTintColor: theme.textDim,
            drawerLabelStyle: { fontSize: 15 },
            drawerType: Platform.OS === 'web' ? 'front' : 'slide',
            headerTitle: (props) => headerTitleOnly({ children: props.children as string }),
            headerTitleContainerStyle: styles.headerTitleContainer,
            headerLeft: (props) => <DrawerToggleButton {...props} />,
            headerRight: () => <MainHeaderNav />,
          }}
        >
        <Drawer.Screen
          name="index"
          options={{ title: 'Dashboard', drawerLabel: 'Dashboard', drawerIcon: drawerIcon('home') }}
        />
        <Drawer.Screen
          name="messages"
          options={{ title: 'Messages', drawerLabel: 'Messages', drawerIcon: drawerIcon('envelope') }}
        />
        <Drawer.Screen
          name="ai-studio"
          options={{ title: 'AI Studio', drawerLabel: 'AI Studio', drawerIcon: drawerIcon('star'), headerShown: false }}
        />
        <Drawer.Screen
          name="divine-manager"
          options={{ title: 'Divine Manager', drawerLabel: 'Divine Manager', drawerIcon: drawerIcon('bolt') }}
        />
        <Drawer.Screen
          name="content"
          options={{ title: 'Content', drawerLabel: 'Content', drawerIcon: drawerIcon('calendar') }}
        />
        <Drawer.Screen
          name="social"
          options={{ title: 'Social', drawerLabel: 'Social', drawerIcon: drawerIcon('share-alt') }}
        />
        <Drawer.Screen
          name="content-library"
          options={{ title: 'Content library', drawerLabel: 'Content library', drawerIcon: drawerIcon('book') }}
        />
        <Drawer.Screen
          name="analytics"
          options={{ title: 'Analytics', drawerLabel: 'Analytics', drawerIcon: drawerIcon('bar-chart') }}
        />
        <Drawer.Screen
          name="protection"
          options={{ title: 'Protection', drawerLabel: 'Protection', drawerIcon: drawerIcon('shield') }}
        />
        <Drawer.Screen
          name="fans"
          options={{ title: 'Fans', drawerLabel: 'Fans', drawerIcon: drawerIcon('users') }}
        />
        <Drawer.Screen
          name="mentions"
          options={{ title: 'Mentions', drawerLabel: 'Mentions', drawerIcon: drawerIcon('line-chart') }}
        />
        <Drawer.Screen
          name="community"
          options={{ title: 'Community', drawerLabel: 'Community', drawerIcon: drawerIcon('lightbulb-o') }}
        />
        <Drawer.Screen
          name="guide"
          options={{ title: 'Guide', drawerLabel: 'Guide', drawerIcon: drawerIcon('book') }}
        />
        <Drawer.Screen
          name="settings"
          options={{ title: 'Settings', drawerLabel: 'Settings', drawerIcon: drawerIcon('cog') }}
        />
        </Drawer>
      </DivineQuickProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.bg,
  },
  headerTitleContainer: {
    flex: 1,
    maxWidth: '100%',
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  headerTitleText: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '600',
  },
})
