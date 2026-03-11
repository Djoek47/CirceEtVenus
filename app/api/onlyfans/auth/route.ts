import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

/**
 * OnlyFans connection uses the OnlyFansAPI.com SDK flow only.
 * GET: Create a client session token for the SDK (display_name + client_reference_id = user.id).
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.ONLYFANS_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OnlyFans API not configured. Please add ONLYFANS_API_KEY.' },
        { status: 500 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    const fullName = (profile as { full_name?: string } | null)?.full_name?.trim() ?? ''
    const email = user.email ?? ''
    const name = fullName || user.user_metadata?.full_name || (email ? email.split('@')[0] : '') || 'user'
    const displayName = email ? `${name} (${email})` : name

    const api = createOnlyFansAPI()
    const session = await api.createClientSession(displayName, 'us', user.id)

    return NextResponse.json({
      token: session.token,
      userId: user.id,
    })
  } catch (error) {
    console.error('OnlyFans auth error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    )
  }
}
