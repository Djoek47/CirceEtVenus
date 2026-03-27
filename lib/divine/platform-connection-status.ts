import type { SupabaseClient } from '@supabase/supabase-js'

export type PlatformConnectionSnapshot = {
  onlyfansConnected: boolean
  onlyfansUsername: string | null
  fanslyConnected: boolean
  fanslyUsername: string | null
}

/**
 * Authoritative OnlyFans/Fansly connection state used by Divine chat + voice prompts.
 */
export async function getPlatformConnectionSnapshot(
  supabase: SupabaseClient,
  userId: string,
): Promise<PlatformConnectionSnapshot> {
  const { data } = await supabase
    .from('platform_connections')
    .select('platform, platform_username, is_connected')
    .eq('user_id', userId)
    .in('platform', ['onlyfans', 'fansly'])

  let onlyfansConnected = false
  let onlyfansUsername: string | null = null
  let fanslyConnected = false
  let fanslyUsername: string | null = null

  for (const row of data || []) {
    const platform = String((row as { platform?: string }).platform ?? '')
    const connected = (row as { is_connected?: boolean }).is_connected === true
    const usernameRaw = (row as { platform_username?: string | null }).platform_username
    const username = typeof usernameRaw === 'string' && usernameRaw.trim() ? usernameRaw.trim() : null
    if (platform === 'onlyfans' && connected) {
      onlyfansConnected = true
      if (username) onlyfansUsername = username
    }
    if (platform === 'fansly' && connected) {
      fanslyConnected = true
      if (username) fanslyUsername = username
    }
  }

  return {
    onlyfansConnected,
    onlyfansUsername,
    fanslyConnected,
    fanslyUsername,
  }
}
