import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

// POST: Cancel OnlyFans auth for current user by disconnecting any pending/authenticating
// OnlyFansAPI accounts created with this user's client_reference_id.
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const api = createOnlyFansAPI()
    const accountsResult = await api.listAccounts()

    if (!accountsResult.success || !accountsResult.accounts) {
      return NextResponse.json({ success: true, disconnected: 0 })
    }

    const pendingForUser = (accountsResult.accounts || [])
      .filter((acc: any) => acc?.client_reference_id === user.id)
      .filter((acc: any) => acc?.onlyfans_username == null && acc?.onlyfans_user_data == null)

    let disconnected = 0
    for (const acc of pendingForUser) {
      const res = await api.deleteAccount(acc.id)
      if (res.success) disconnected += 1
    }

    return NextResponse.json({ success: true, disconnected })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel authentication' },
      { status: 500 }
    )
  }
}

