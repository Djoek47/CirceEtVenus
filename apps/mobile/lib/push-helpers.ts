import Constants from 'expo-constants'

/**
 * When you add `expo-notifications`, only call `getExpoPushTokenAsync` if the EAS project id
 * is present (see `app.config.ts` `extra.eas.projectId` / `eas init`).
 */
export function hasEasProjectIdForPush(): boolean {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined
  const id = extra?.eas?.projectId
  return typeof id === 'string' && id.length > 0
}
