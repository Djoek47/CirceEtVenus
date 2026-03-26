import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { syncHousekeepingListsForUser } from '@/lib/housekeeping-fan-lists'
import type { HousekeepingListsConfig } from '@/lib/divine-manager'

export const maxDuration = 300

/**
 * Sync OnlyFans user lists from divine_manager_settings.housekeeping_lists for each connected creator.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const vercelCron = req.headers.get('x-vercel-cron')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}` && vercelCron !== 'true') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceRoleClient()

  const { data: rows, error } = await supabase
    .from('platform_connections')
    .select('user_id, access_token')
    .eq('platform', 'onlyfans')
    .eq('is_connected', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results: { userId: string; ok: boolean; details?: string[]; error?: string }[] = []

  for (const row of rows ?? []) {
    const userId = row.user_id as string
    const accessToken = row.access_token as string | null
    if (!accessToken) {
      results.push({ userId, ok: false, error: 'missing token' })
      continue
    }

    const { data: settings } = await supabase
      .from('divine_manager_settings')
      .select('housekeeping_lists')
      .eq('user_id', userId)
      .maybeSingle()

    const config = (settings?.housekeeping_lists ?? {}) as HousekeepingListsConfig
    if (!config.enabled) {
      results.push({ userId, ok: true, details: ['skipped: disabled'] })
      continue
    }

    try {
      const out = await syncHousekeepingListsForUser(supabase, userId, accessToken, config)
      results.push({ userId, ok: out.ok, details: out.details, error: out.error })
    } catch (e) {
      results.push({
        userId,
        ok: false,
        error: e instanceof Error ? e.message : 'sync failed',
      })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
