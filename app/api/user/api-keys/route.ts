import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHmac, randomBytes } from 'crypto'

const PREFIX = 'cev_live_sk_'
const KEY_BYTES = 32

function hashKey(secret: string): string {
  return createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    .update(secret)
    .digest('hex')
}

function generateKey(): { fullKey: string; prefix: string; hash: string } {
  const secret = randomBytes(KEY_BYTES).toString('base64url')
  const fullKey = PREFIX + secret
  const prefix = PREFIX + secret.slice(0, 8) + '…'
  const hash = hashKey(fullKey)
  return { fullKey, prefix, hash }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_api_keys')
    .select('id, key_prefix, name, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ keys: data || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() || null : null

  const { fullKey, prefix, hash } = generateKey()

  const { data: row, error } = await supabase
    .from('user_api_keys')
    .insert({ user_id: user.id, key_prefix: prefix, key_hash: hash, name })
    .select('id, key_prefix, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    id: row.id,
    key: fullKey,
    key_prefix: row.key_prefix,
    created_at: row.created_at,
    message: 'Copy this key now. It will not be shown again.',
  })
}
