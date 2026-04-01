import * as Linking from 'expo-linking'

/** Opens http(s) URLs in the system browser. Returns false if URL is invalid or cannot be opened. */
export async function openUrlSafe(raw: string): Promise<boolean> {
  const u = raw.trim()
  if (!/^https?:\/\//i.test(u)) return false
  try {
    const can = await Linking.canOpenURL(u)
    if (!can) return false
    await Linking.openURL(u)
    return true
  } catch {
    return false
  }
}
