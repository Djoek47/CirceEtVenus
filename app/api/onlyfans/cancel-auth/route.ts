import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

// POST: Cancel OnlyFans auth for current user. Disconnect any OnlyFans API account that
// belongs to this user except the one we have linked in our DB (so closing the modal
// without completing the flow cleans up the API dashboard).
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Load current user's linked OnlyFans account (if any) — we must not delete this one
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .maybeSingle()
    const linkedAccountId = connection?.access_token ?? null

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
      return { id, clientRef, displayName }
    }

    const belongsToUser = (acc: ReturnType<typeof normalize>) =>
      acc.clientRef === user.id ||
      (userEmail && acc.displayName && acc.displayName.toLowerCase().includes(userEmail))

    // 2. List accounts; 3. Delete any user-owned account whose id is NOT the linked one
    const toDisconnect = (accountsResult.accounts || [])
      .map(normalize)
      .filter((acc) => acc.id != null)
      .filter(belongsToUser)
      .filter((acc) => acc.id !== linkedAccountId)

    let disconnected = 0
    for (const acc of toDisconnect) {
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

