import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOnlyFansApi, jsonOnlyFansError } from '@/lib/onlyfans-api-route'

export async function POST(_request: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const supabase = await createClient()
  const gate = await requireOnlyFansApi(supabase)
  if (!gate.ok) return gate.response
  const { chatId } = await params
  try {
    const data = await gate.ctx.api.markChatAsUnread(chatId)
    return NextResponse.json(data)
  } catch (e) {
    return jsonOnlyFansError(supabase, e)
  }
}
