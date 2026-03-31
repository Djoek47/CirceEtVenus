import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

type Body = {
  proofPaths: string[]
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const { claimId } = await params
  const supabase = await createRouteHandlerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: Body = await req.json().catch(() => ({ proofPaths: [] }))
  const proofPaths = Array.isArray(body.proofPaths) ? body.proofPaths.filter(Boolean) : []
  if (proofPaths.length === 0) {
    return NextResponse.json({ error: 'proofPaths is required' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('dmca_claims')
    .select('id,proof_urls')
    .eq('id', claimId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existing) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

  const current: string[] = Array.isArray((existing as any).proof_urls) ? (existing as any).proof_urls : []
  const next = Array.from(new Set([...current, ...proofPaths]))

  const { error } = await supabase
    .from('dmca_claims')
    .update({ proof_urls: next, updated_at: new Date().toISOString() })
    .eq('id', claimId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, proof_urls: next })
}

