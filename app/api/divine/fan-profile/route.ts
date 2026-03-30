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

/**
 * PATCH { fanId, platform?, creator_classification? } — nullable creator label on fans row (RLS).
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      fanId?: string
      platform?: string
      creator_classification?: string | null
    }
    const fanId = typeof body.fanId === 'string' ? body.fanId.trim() : ''
    if (!fanId) return NextResponse.json({ error: 'fanId required' }, { status: 400 })
    const platform = (body.platform?.trim() || 'onlyfans').toLowerCase()
    if (platform !== 'onlyfans' && platform !== 'fansly') {
      return NextResponse.json({ error: 'platform must be onlyfans or fansly' }, { status: 400 })
    }

    let classification: string | null = null
    if (body.creator_classification === null || body.creator_classification === '') {
      classification = null
    } else if (typeof body.creator_classification === 'string') {
      classification = body.creator_classification.trim().slice(0, 2000) || null
    } else {
      return NextResponse.json({ error: 'creator_classification invalid' }, { status: 400 })
    }

    const { error } = await supabase
      .from('fans')
      .update({
        creator_classification: classification,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('platform_fan_id', fanId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const profile = await buildUnifiedFanProfile(supabase, user.id, fanId, platform)
    return NextResponse.json(profile)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to update classification'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
