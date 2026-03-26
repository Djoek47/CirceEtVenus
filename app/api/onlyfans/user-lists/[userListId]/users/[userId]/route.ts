import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOnlyFansApi, jsonOnlyFansError } from '@/lib/onlyfans-api-route'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userListId: string; userId: string }> },
) {
  const supabase = await createClient()
  const gate = await requireOnlyFansApi(supabase)
  if (!gate.ok) return gate.response
  const { userListId, userId } = await params
  try {
    const data = await gate.ctx.api.removeUserFromUserList(userListId, userId)
    return NextResponse.json(data)
  } catch (e) {
    return jsonOnlyFansError(supabase, e)
  }
}
