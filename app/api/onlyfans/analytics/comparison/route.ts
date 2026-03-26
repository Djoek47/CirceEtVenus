import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOnlyFansApi, jsonOnlyFansError, withDefaultAccountIds } from '@/lib/onlyfans-api-route'

export async function POST(request: Request) {
  const supabase = await createClient()
  const gate = await requireOnlyFansApi(supabase)
  if (!gate.ok) return gate.response
  try {
    const body = withDefaultAccountIds(await request.json(), gate.ctx.accountId)
    const data = await gate.ctx.api.analyticsPeriodComparison(body)
    return NextResponse.json(data)
  } catch (e) {
    return jsonOnlyFansError(supabase, e)
  }
}
