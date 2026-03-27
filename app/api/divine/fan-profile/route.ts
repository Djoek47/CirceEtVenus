import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildUnifiedFanProfile } from '@/lib/divine/fan-profile-server'

/**
 * GET ?fanId=&platform=onlyfans — aggregated fan core + thread insight + AI summary + creator detector (profile UI).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const fanId = searchParams.get('fanId')?.trim() ?? ''
    if (!fanId) return NextResponse.json({ error: 'fanId required' }, { status: 400 })
    const platform = (searchParams.get('platform')?.trim() || 'onlyfans').toLowerCase()

    const profile = await buildUnifiedFanProfile(supabase, user.id, fanId, platform)
    return NextResponse.json(profile)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load fan profile'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
