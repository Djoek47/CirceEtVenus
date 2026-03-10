import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ claimId: string }> },
) {
  const { claimId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: claim } = await supabase
    .from('dmca_claims')
    .select('id,notice_text,claimant_name,proof_urls')
    .eq('id', claimId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

  const proofs: string[] = Array.isArray((claim as any).proof_urls) ? (claim as any).proof_urls : []
  if (proofs.length === 0) {
    return NextResponse.json({ error: 'Proof of ownership required before download' }, { status: 400 })
  }

  const text = (claim as any).notice_text || ''
  const filename = `dmca-notice-${claimId}.txt`

  return new NextResponse(text, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

