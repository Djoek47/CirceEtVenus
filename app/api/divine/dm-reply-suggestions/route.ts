import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchDmReplySuggestionsPackage } from '@/lib/divine/dm-reply-package'

/**
 * POST: Get Scan Thread + Circe / Venus / Flirt reply suggestions for a fan, plus a recommendation.
 * Body: { fanId: string, username?: string, name?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const result = await fetchDmReplySuggestionsPackage(supabase, user.id, body)
    if ('error' in result && result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    const { threadPreview: _tp, ...rest } = result as Record<string, unknown>
    return NextResponse.json(rest)
  } catch (e) {
    console.error('[divine/dm-reply-suggestions]', e)
    return NextResponse.json({ error: 'Failed to generate reply suggestions' }, { status: 500 })
  }
}
