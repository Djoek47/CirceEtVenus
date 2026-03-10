import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAllowedNiche, NicheKey } from '@/lib/niches'

type Body = {
  platform: string
  niches: string[]
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as Body
    if (!body?.platform || !Array.isArray(body.niches)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const allowed = body.niches.filter((n) => isAllowedNiche(n)) as NicheKey[]

    const { error } = await supabase
      .from('platform_connections')
      .update({ niches: allowed })
      .eq('user_id', user.id)
      .eq('platform', body.platform)

    if (error) {
      console.error('Error updating platform niches:', error)
      return NextResponse.json({ error: 'Failed to update niches' }, { status: 500 })
    }

    return NextResponse.json({ success: true, niches: allowed })
  } catch (error) {
    console.error('Error in /api/platforms/update-niches:', error)
    return NextResponse.json({ error: 'Failed to update niches' }, { status: 500 })
  }
}

