import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { requireOnlyFansApi, jsonOnlyFansError } from '@/lib/onlyfans-api-route'

function isSummaryReady(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false
  const o = raw as Record<string, unknown>
  if (o.status === 'completed' || o.status === 'ready') return true
  if (o.data && typeof o.data === 'object') {
    const d = o.data as Record<string, unknown>
    if (d.summary || d.preferences) return true
  }
  return Boolean(o.summary || o.preferences)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fanId: string }> },
) {
  const supabase = await createRouteHandlerClient(request)
  const gate = await requireOnlyFansApi(supabase)
  if (!gate.ok) return gate.response
  const { fanId } = await params
  try {
    const { searchParams } = new URL(request.url)
    const refresh = searchParams.get('refresh') === '1'

    const { data: row } = await supabase
      .from('fan_ai_summaries')
      .select('*')
      .eq('user_id', gate.ctx.userId)
      .eq('platform_fan_id', fanId)
      .maybeSingle()

    if (!refresh && row?.status === 'completed' && row.summary_json) {
      return NextResponse.json({
        source: 'database',
        pending: false,
        data: row.summary_json,
        meta: { updated_at: row.updated_at, analyzed_message_count: row.analyzed_message_count },
      })
    }

    const remote = await gate.ctx.api.getFanAiSummary(fanId)
    const ready = isSummaryReady(remote)

    if (ready) {
      const summary_json =
        remote && typeof remote === 'object' && 'data' in (remote as object)
          ? (remote as { data?: unknown }).data ?? remote
          : remote
      await supabase.from('fan_ai_summaries').upsert(
        {
          user_id: gate.ctx.userId,
          platform_fan_id: fanId,
          status: 'completed',
          summary_json: summary_json as object,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform_fan_id' },
      )
      return NextResponse.json({ source: 'onlyfans', pending: false, data: remote })
    }

    return NextResponse.json({
      source: row ? 'database' : 'onlyfans',
      pending: true,
      cached: row,
      data: remote ?? row?.summary_json ?? null,
    })
  } catch (e) {
    return jsonOnlyFansError(supabase, e)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ fanId: string }> },
) {
  const supabase = await createRouteHandlerClient(request)
  const gate = await requireOnlyFansApi(supabase)
  if (!gate.ok) return gate.response
  const { fanId } = await params
  try {
    const body = await request.json().catch(() => ({}))
    const regenerate = Boolean((body as { regenerate?: boolean }).regenerate)

    await supabase.from('fan_ai_summaries').upsert(
      {
        user_id: gate.ctx.userId,
        platform_fan_id: fanId,
        status: 'pending',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,platform_fan_id' },
    )

    const remote = await gate.ctx.api.generateFanAiSummary(fanId, { regenerate })
    return NextResponse.json({
      ok: true,
      note: 'Generation uses API credits (~200 on completion). Summary will update when ready.',
      data: remote,
    })
  } catch (e) {
    return jsonOnlyFansError(supabase, e)
  }
}
