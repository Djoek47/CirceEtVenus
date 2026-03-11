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

    const userEmail = user.email ?? ''
    const normalize = (raw: any) => {
      const account = raw?.account ?? raw
      const id = account?.id ?? raw?.id
      const clientRef = raw?.client_reference_id ?? account?.client_reference_id
      const displayName = (raw?.display_name ?? account?.display_name) ?? ''
      const ofUsername = raw?.onlyfans_username ?? account?.onlyfans_username
      const ofUserData = raw?.onlyfans_user_data ?? account?.onlyfans_user_data
      return { id, clientRef, displayName, ofUsername, ofUserData }
    }

    const pendingForUser = (accountsResult.accounts || [])
      .map(normalize)
      .filter((acc) => acc.id != null)
      .filter(
        (acc) =>
          acc.clientRef === user.id ||
          (userEmail && acc.displayName && acc.displayName.includes(userEmail))
      )
      .filter((acc) => acc.ofUsername == null && acc.ofUserData == null)

    let disconnected = 0
    for (const acc of pendingForUser) {
      const res = await api.deleteAccount(acc.id!)
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

