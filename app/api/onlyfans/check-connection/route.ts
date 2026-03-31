import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

// GET: Report if the current user has an OnlyFans connection. Does NOT assign accounts
// from the OnlyFans API to the current user; new connections are only created in the callback.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ connected: false }, { status: 401 })
    }

    // Load current user's OnlyFans connection from our DB only
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token, platform_username')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .maybeSingle()

    const apiKey = process.env.ONLYFANS_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        connected: !!connection,
        accountId: connection?.access_token ?? undefined,
        username: connection?.platform_username ?? undefined,
      })
    }

    const api = createOnlyFansAPI()
    const accountsResult = await api.listAccounts()

    // If user has no connection in our DB, only report status — do not assign any API account
    if (!connection) {
      return NextResponse.json({
        connected: false,
        accountId: undefined,
        username: undefined,
      })
    }

    // User has a connection: verify it still exists and is fully connected on the API
    if (!accountsResult.success || !accountsResult.accounts || accountsResult.accounts.length === 0) {
      await supabase
        .from('platform_connections')
        .update({ is_connected: false })
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
      return NextResponse.json({
        connected: false,
        accountId: undefined,
        username: undefined,
      })
    }

    const fullyConnectedAccounts = (accountsResult.accounts || []).filter(
      (acc: { onlyfans_username?: string; onlyfans_user_data?: unknown }) =>
        acc.onlyfans_username != null || (acc as any)?.onlyfans_user_data != null
    )

    const matchingAccount = fullyConnectedAccounts.find(
      (acc: { id?: string }) => acc.id === connection.access_token
    )

    if (!matchingAccount) {
      await supabase
        .from('platform_connections')
        .update({ is_connected: false })
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
      return NextResponse.json({
        connected: false,
        accountId: undefined,
        username: undefined,
      })
    }

    const userData = (matchingAccount as any)?.onlyfans_user_data || {}
    const displayName =
      userData.name ?? (matchingAccount as any).onlyfans_username ?? connection.platform_username ?? 'Unknown'

    if (connection.platform_username !== displayName) {
      await supabase
        .from('platform_connections')
        .update({ platform_username: displayName })
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
    }

    return NextResponse.json({
      connected: true,
      accountId: connection.access_token,
      username: displayName,
    })
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Check failed',
    })
  }
}
