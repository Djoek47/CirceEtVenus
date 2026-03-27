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
    return NextResponse.json({
      voice_hangup_policy: ar.voice_hangup_policy === 'after_closing_prompt' ? 'after_closing_prompt' : 'always',
      dm_focus_mode: ar.dm_focus_mode === 'overlay' ? 'overlay' : 'navigate',
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load settings'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
