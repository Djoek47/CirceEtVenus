import { Stack } from 'expo-router'
import { MainHeaderNav } from '@/components/main-header-nav'
import { theme } from '@/constants/theme'

export default function AiStudioStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.bg },
        headerRight: () => <MainHeaderNav />,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'AI Studio' }} />
      <Stack.Screen name="tool/[toolId]" options={{ title: 'Tool' }} />
    </Stack>
  )
}
