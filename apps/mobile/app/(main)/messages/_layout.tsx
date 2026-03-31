import { Stack } from 'expo-router'
import { theme } from '@/constants/theme'

export default function MessagesStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[fanId]" options={{ title: 'Chat' }} />
    </Stack>
  )
}
