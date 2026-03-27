import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { queueThreadScanBackgroundJob } from '@/lib/divine/thread-scan-async'

export const maxDuration = 300

/**
 * POST — queue background DM thread scan (same engine as voice tool start_thread_scan_async).
 * Returns 202 immediately; work continues in after() on the async path inside queueThreadScanBackgroundJob.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      fanId?: string
      openPanel?: unknown
    }
    const result = await queueThreadScanBackgroundJob(supabase, user.id, {
      fanId: String(body.fanId ?? ''),
      openPanel: body.openPanel,
    })
    if (!result.taskId) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true, taskId: result.taskId, message: result.message }, { status: 202 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to queue thread scan'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
