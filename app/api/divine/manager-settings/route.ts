import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSettings } from '@/lib/divine-manager'

/**
 * GET — subset of Divine Manager settings for voice UI + client overlays (auth cookie).
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = await getSettings(supabase, user.id)
    const ar = settings?.automation_rules ?? {}
    const delayRaw = ar.divine_send_delay_ms
    const divine_send_delay_ms =
      typeof delayRaw === 'number' && !Number.isNaN(delayRaw)
        ? Math.max(0, Math.min(120_000, Math.floor(delayRaw)))
        : 3000
    const style = ar.dm_pricing_style
    const dm_pricing_style =
      style === 'maximize_revenue' || style === 'premium_domme' ? style : 'balanced'
    return NextResponse.json({
      voice_hangup_policy: ar.voice_hangup_policy === 'after_closing_prompt' ? 'after_closing_prompt' : 'always',
      dm_focus_mode: ar.dm_focus_mode === 'overlay' ? 'overlay' : 'navigate',
      divine_send_delay_ms,
      dm_pricing_style,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load settings'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
