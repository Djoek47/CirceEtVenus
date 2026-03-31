import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

type Body = {
  claimId: string
  filename: string
  contentType?: string
}

export async function POST(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
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

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      {
        error:
          'Server misconfiguration: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (Vercel env) to upload DMCA proofs.',
      },
      { status: 500 },
    )
  }

  const service = createServiceClient(supabaseUrl, serviceKey)
  const safeName = body.filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  // Path inside bucket dmca-proofs: {userId}/{claimId}/{file} — bucket must exist (see scripts/021_dmca_proofs_storage_bucket.sql)
  const path = `${user.id}/${body.claimId}/${Date.now()}-${safeName}`

  const { data, error } = await service.storage
    .from('dmca-proofs')
    .createSignedUploadUrl(path)

  if (error) {
    const msg = error.message || 'Storage error'
    const hint =
      /not exist|NoSuchBucket|Bucket not found/i.test(msg)
        ? ' Create the private Storage bucket `dmca-proofs` in Supabase (SQL in scripts/021_dmca_proofs_storage_bucket.sql), then retry.'
        : ''
    return NextResponse.json({ error: msg + hint }, { status: 500 })
  }

  return NextResponse.json({
    path,
    token: data.token,
    signedUrl: data.signedUrl,
  })
}

