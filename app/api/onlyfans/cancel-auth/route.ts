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

    const userEmail = (user.email ?? '').toLowerCase()
    const normalize = (raw: any) => {
      const account = raw?.account ?? raw
      const id = account?.id ?? raw?.id
      const clientRef = raw?.client_reference_id ?? account?.client_reference_id
      const displayName = String(raw?.display_name ?? account?.display_name ?? '').trim()
      const ofUsername = raw?.onlyfans_username ?? account?.onlyfans_username
      const ofUserData = raw?.onlyfans_user_data ?? account?.onlyfans_user_data
      const isAuthenticated = raw?.is_authenticated ?? account?.is_authenticated
      const authProgress = raw?.authentication_progress ?? account?.authentication_progress ?? raw?.state ?? account?.state
      const hasOnlyFansData = !!(ofUsername || (ofUserData && (ofUserData.username != null || ofUserData.id != null)))
      const isPending = isAuthenticated === false || authProgress === 'authenticating' || !hasOnlyFansData
      return { id, clientRef, displayName, ofUsername, ofUserData, isPending }
    }

    const belongsToUser = (acc: ReturnType<typeof normalize>) =>
      acc.clientRef === user.id ||
      (userEmail && acc.displayName && acc.displayName.toLowerCase().includes(userEmail))

    const pendingForUser = (accountsResult.accounts || [])
      .map(normalize)
      .filter((acc) => acc.id != null)
      .filter(belongsToUser)
      .filter((acc) => acc.isPending)

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

