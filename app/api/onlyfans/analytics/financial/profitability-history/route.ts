import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireOnlyFansApi, jsonOnlyFansError } from '@/lib/onlyfans-api-route'

/** GET: query months (optional), account (optional; defaults to connected OF account id). */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const gate = await requireOnlyFansApi(supabase)
  if (!gate.ok) return gate.response
  try {
    const { searchParams } = new URL(request.url)
    const months = searchParams.get('months')
    const account = searchParams.get('account') || gate.ctx.accountId
    const data = await gate.ctx.api.analyticsProfitabilityHistory(
      account,
      months != null ? parseInt(months, 10) : undefined,
    )
    return NextResponse.json(data)
  } catch (e) {
    return jsonOnlyFansError(supabase, e)
  }
}
