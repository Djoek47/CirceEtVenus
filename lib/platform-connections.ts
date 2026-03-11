import { SupabaseClient } from '@supabase/supabase-js'

type Database = any // We only use a very small subset of fields here

/**
 * Ensure a given external platform account (e.g. OnlyFans accountId) is not already connected
 * to a different Circe et Venus user.
 */
export async function assertPlatformAccountAvailable(
  supabase: SupabaseClient<Database>,
  opts: { platform: string; externalAccountId: string; currentUserId: string }
): Promise<
  | { ok: true }
  | {
      ok: false
      ownedByOtherUser: boolean
    }
> {
  const { platform, externalAccountId, currentUserId } = opts

  const { data: existingOwner } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', platform)
    .eq('access_token', externalAccountId)
    .eq('is_connected', true)
    .maybeSingle()

  if (existingOwner && existingOwner.user_id && existingOwner.user_id !== currentUserId) {
    return { ok: false, ownedByOtherUser: true }
  }

  return { ok: true }
}

