import { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/server'

type Database = any // We only use a very small subset of fields here

/**
 * Ensure a given external platform account (e.g. OnlyFans accountId) is not already connected
 * to a different Circe et Venus user. Uses the service-role client so we can see all rows
 * (RLS would otherwise hide other users' connections and allow duplicate claims).
 */
export async function assertPlatformAccountAvailable(
  _supabase: SupabaseClient<Database>,
  opts: { platform: string; externalAccountId: string; currentUserId: string }
): Promise<
  | { ok: true }
  | {
      ok: false
      ownedByOtherUser: boolean
    }
> {
  const { platform, externalAccountId, currentUserId } = opts

  const admin = createServiceRoleClient()
  const { data: existingOwner } = await admin
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

