import type { SupabaseClient } from '@supabase/supabase-js'

/** Plans that unlock Divine Manager full extension (navigation, async heavy jobs, higher limits). */
export const DIVINE_FULL_PLAN_IDS = ['divine-duo', 'circe-elite', 'venus-pro'] as const

/** Shown when a tool requires Divine full (Duo / Elite / Venus Pro). */
export const DIVINE_FULL_UPGRADE_MESSAGE =
  'That feature requires Divine Duo, Circe Elite, or Venus Pro. Upgrade in Settings → Subscription to unlock full-app navigation and background leak scans.'

export async function isDivineFullAccess(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ ok: boolean; planId: string | null }> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_id')
    .eq('user_id', userId)
    .maybeSingle()

  const planId = (subscription as { plan_id?: string | null } | null)?.plan_id
  const normalized = planId?.toLowerCase() || null
  const ok = Boolean(normalized && DIVINE_FULL_PLAN_IDS.includes(normalized as (typeof DIVINE_FULL_PLAN_IDS)[number]))
  return { ok, planId: planId ?? null }
}
