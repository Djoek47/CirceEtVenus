import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { requireOnlyFansApi, jsonOnlyFansError, withDefaultAccountIds } from '@/lib/onlyfans-api-route'

export async function POST(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const gate = await requireOnlyFansApi(supabase)
  if (!gate.ok) return gate.response
  try {
    const body = withDefaultAccountIds(await request.json(), gate.ctx.accountId)
    const data = await gate.ctx.api.analyticsTransactionsByType(body as { account_ids: string[]; start_date: string; end_date: string })
    return NextResponse.json(data)
  } catch (e) {
    return jsonOnlyFansError(supabase, e)
  }
}
