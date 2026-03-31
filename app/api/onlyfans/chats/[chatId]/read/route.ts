import { type NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { requireOnlyFansApi, jsonOnlyFansError } from '@/lib/onlyfans-api-route'

export async function POST(request: NextRequest, { params }: { params: Promise<{ chatId: string }> }) {
  const supabase = await createRouteHandlerClient(request)
  const gate = await requireOnlyFansApi(supabase)
  if (!gate.ok) return gate.response
  const { chatId } = await params
  try {
    const data = await gate.ctx.api.markChatAsRead(chatId)
    return NextResponse.json(data)
  } catch (e) {
    return jsonOnlyFansError(supabase, e)
  }
}
