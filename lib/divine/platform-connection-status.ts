import type { SupabaseClient } from '@supabase/supabase-js'

export type PlatformConnectionSnapshot = {
  onlyfansConnected: boolean
  onlyfansUsername: string | null
  fanslyConnected: boolean
  fanslyUsername: string | null
}

export type RuntimePlatform = 'onlyfans' | 'fansly'

export type RuntimePlatformConnection = {
  platform: RuntimePlatform
  connected: boolean
  reason?: 'not_connected' | 'missing_credential'
  username: string | null
  accessToken: string | null
  platformUserId: string | null
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

/**
 * Runtime contract for action handlers:
 * - onlyfans requires accessToken (account id in this codebase)
 * - fansly requires platformUserId
 */
export async function getRuntimePlatformConnection(
  supabase: SupabaseClient,
  userId: string,
  platform: RuntimePlatform,
): Promise<RuntimePlatformConnection> {
  const { data: row } = await supabase
    .from('platform_connections')
    .select('is_connected, platform_username, access_token, platform_user_id')
    .eq('user_id', userId)
    .eq('platform', platform)
    .maybeSingle()

  const isConnected = (row as { is_connected?: boolean } | null)?.is_connected === true
  const accessTokenRaw = (row as { access_token?: string | null } | null)?.access_token
  const platformUserIdRaw = (row as { platform_user_id?: string | null } | null)?.platform_user_id
  const usernameRaw = (row as { platform_username?: string | null } | null)?.platform_username

  const accessToken =
    typeof accessTokenRaw === 'string' && accessTokenRaw.trim() ? accessTokenRaw.trim() : null
  const platformUserId =
    typeof platformUserIdRaw === 'string' && platformUserIdRaw.trim()
      ? platformUserIdRaw.trim()
      : null
  const username = typeof usernameRaw === 'string' && usernameRaw.trim() ? usernameRaw.trim() : null

  const hasRequiredCredential =
    platform === 'onlyfans' ? accessToken != null : platformUserId != null

  if (!isConnected) {
    return {
      platform,
      connected: false,
      reason: 'not_connected',
      username,
      accessToken,
      platformUserId,
    }
  }
  if (!hasRequiredCredential) {
    return {
      platform,
      connected: false,
      reason: 'missing_credential',
      username,
      accessToken,
      platformUserId,
    }
  }
  return {
    platform,
    connected: true,
    username,
    accessToken,
    platformUserId,
  }
}
