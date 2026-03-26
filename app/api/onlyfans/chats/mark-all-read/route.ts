import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOnlyFansApi, jsonOnlyFansError } from '@/lib/onlyfans-api-route'

export async function POST() {
  const supabase = await createClient()
  const gate = await requireOnlyFansApi(supabase)
  if (!gate.ok) return gate.response
  try {
    const data = await gate.ctx.api.markAllChatsAsRead()
    return NextResponse.json(data)
  } catch (e) {
    return jsonOnlyFansError(supabase, e)
  }
}
