import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { requireOnlyFansApi, jsonOnlyFansError } from '@/lib/onlyfans-api-route'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userListId: string }> },
) {
  const supabase = await createRouteHandlerClient(request)
  const gate = await requireOnlyFansApi(supabase)
  if (!gate.ok) return gate.response
  const { userListId } = await params
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const data = await gate.ctx.api.listUserListUsers(userListId, {
      limit: limit != null ? parseInt(limit, 10) : undefined,
      offset: offset != null ? parseInt(offset, 10) : undefined,
    })
    return NextResponse.json(data)
  } catch (e) {
    return jsonOnlyFansError(supabase, e)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userListId: string }> },
) {
  const supabase = await createRouteHandlerClient(request)
  const gate = await requireOnlyFansApi(supabase)
  if (!gate.ok) return gate.response
  const { userListId } = await params
  try {
    const body = await request.json()
    const ids = Array.isArray(body.ids) ? body.ids : []
    const data = await gate.ctx.api.addUsersToUserList(userListId, ids)
    return NextResponse.json(data)
  } catch (e) {
    return jsonOnlyFansError(supabase, e)
  }
}
