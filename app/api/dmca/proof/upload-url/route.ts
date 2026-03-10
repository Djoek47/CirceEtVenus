import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAuthedClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

type Body = {
  claimId: string
  filename: string
  contentType?: string
}

export async function POST(req: NextRequest) {
  const supabase = await createAuthedClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: Body = await req.json()
  if (!body?.claimId || !body?.filename) {
    return NextResponse.json({ error: 'claimId and filename are required' }, { status: 400 })
  }

  // Ensure the claim belongs to the user
  const { data: claim } = await supabase
    .from('dmca_claims')
    .select('id,user_id')
    .eq('id', body.claimId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

  const service = createServiceClient(supabaseUrl, serviceKey)
  const safeName = body.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `dmca-proofs/${user.id}/${body.claimId}/${Date.now()}-${safeName}`

  const { data, error } = await service.storage
    .from('dmca-proofs')
    .createSignedUploadUrl(path)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    path,
    token: data.token,
    signedUrl: data.signedUrl,
  })
}

