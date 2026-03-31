import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { runReputationScanCore } from '@/lib/reputation/run-reputation-scan'

export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const result = await runReputationScanCore(supabase, user.id, body)

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  return NextResponse.json({
    success: true,
    inserted: result.inserted,
    skipped: result.skipped,
    insertedByChannel: result.insertedByChannel,
    enriched: result.enriched,
    pro: result.pro,
    mode: result.mode,
  })
}
