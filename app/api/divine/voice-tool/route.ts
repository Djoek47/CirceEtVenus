import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { isDivineFullAccess } from '@/lib/divine/divine-full-access'
import { runToolCall } from '@/lib/divine/manager-chat-tools'

/**
 * OnlyFans + AI tools can exceed default Vercel limits (often 10s on Hobby).
 * Raise in Vercel Project → Functions if this route 504s. Pro/Enterprise supports up to 800s.
 */
export const maxDuration = 120

/**
 * POST: run a single Divine Manager tool with the same logic as text chat (for Realtime voice).
 * Body: { name: string, arguments?: Record<string, unknown> }
 * Returns `ui_actions` unchanged from `runToolCall` — client applies via `applyUiActionsFromTools` (idempotent focus).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      name?: string
      arguments?: Record<string, unknown>
    }
    const name = typeof body.name === 'string' ? body.name : ''
    if (!name.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const args = body.arguments && typeof body.arguments === 'object' ? body.arguments : {}
    const fromHeader = req.headers.get('cookie') || ''
    const jar = await cookies()
    const fromJar = jar.getAll().map((c) => `${c.name}=${c.value}`).join('; ')
    const cookie = fromHeader || fromJar
    const { ok: divineFull } = await isDivineFullAccess(supabase, user.id)

    const result = await runToolCall(
      {
        id: 'voice',
        function: { name, arguments: JSON.stringify(args) },
      },
      { cookie, supabase, userId: user.id, divineFull },
    )

    return NextResponse.json({
      content: result.content,
      ui_actions: result.uiActions,
      pending_confirmations: result.pendingConfirmations,
      lookup_meta: result.lookupMeta ?? undefined,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Voice tool failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
