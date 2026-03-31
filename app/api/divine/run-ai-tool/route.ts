/**
 * Divine Manager: run an AI Studio tool by id. Used so Divine (voice) can
 * analyze content, generate captions, predict viral, etc. without the user
 * opening other screens. Core logic lives in lib/divine/run-ai-tool-core.ts.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import {
  DIVINE_AI_TOOL_IDS,
  isDivineAiToolId,
  runDivineAiToolServer,
} from '@/lib/divine/run-ai-tool-core'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const toolId = typeof body.toolId === 'string' ? body.toolId.trim() : ''
    const params = typeof body.params === 'object' && body.params !== null ? body.params : {}

    if (!toolId || !isDivineAiToolId(toolId)) {
      return NextResponse.json(
        { error: 'Invalid or disallowed toolId. Allowed: ' + DIVINE_AI_TOOL_IDS.join(', ') },
        { status: 400 },
      )
    }

    const cookie = req.headers.get('cookie') || ''
    const out = await runDivineAiToolServer(toolId, params as Record<string, unknown>, cookie)
    if (!out.success) {
      return NextResponse.json({ error: out.error }, { status: 502 })
    }
    return NextResponse.json({ success: true, result: out.result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'run-ai-tool failed'
    console.error('[divine/run-ai-tool]', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
