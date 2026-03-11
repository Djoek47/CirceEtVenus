import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

// GET: Check if user has OnlyFans accounts connected via the API and sync to our database
// This is called on app load to detect accounts that completed authentication asynchronously
// (OnlyFans auth takes ~45 seconds to complete after user signs in)
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ connected: false }, { status: 401 })
    }

    const apiKey = process.env.ONLYFANS_API_KEY
    if (!apiKey) {
      // No API key - just check local database
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('access_token, platform_username')
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
        .eq('is_connected', true)
        .single()

      return NextResponse.json({
        connected: !!connection,
        accountId: connection?.access_token,
        username: connection?.platform_username
      })
    }

    const api = createOnlyFansAPI()
    
    // Check for accounts connected via OnlyFans API
    const accountsResult = await api.listAccounts()
    
    if (!accountsResult.success || !accountsResult.accounts || accountsResult.accounts.length === 0) {
      // No accounts on API - check local database as fallback
      const { data: connection } = await supabase
        .from('platform_connections')
        .select('access_token, platform_username')
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
        .eq('is_connected', true)
        .single()

      return NextResponse.json({
        connected: !!connection,
        accountId: connection?.access_token,
        username: connection?.platform_username
      })
    }

    // Only treat accounts as connected when auth has finished (onlyfans_user_data / onlyfans_username present)
    // Accounts still "authenticating" have no OnlyFans user data yet — don't show as connected
    const fullyConnectedAccounts = (accountsResult.accounts || []).filter(
      (acc: { onlyfans_username?: string; onlyfans_user_data?: unknown }) =>
        acc.onlyfans_username != null ||
        (acc as any)?.onlyfans_user_data != null
    )
    if (fullyConnectedAccounts.length === 0) {
      await supabase
        .from('platform_connections')
        .update({ is_connected: false })
        .eq('user_id', user.id)
        .eq('platform', 'onlyfans')
      return NextResponse.json({
        connected: false,
        accountId: null,
        username: null
      })
    }

    const account = fullyConnectedAccounts[fullyConnectedAccounts.length - 1]
    const userData = (account as any)?.onlyfans_user_data || {}
    const displayName = userData.name || (account as any).onlyfans_username || 'Unknown'
    
    // Check if we already have this connection saved
    const { data: existingConnection } = await supabase
      .from('platform_connections')
      .select('access_token, platform_username')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .single()

    // If already saved with same account ID but wrong username, update it
    if (existingConnection && existingConnection.access_token === account.id) {
      // Always update the username to the correct display name
      if (existingConnection.platform_username !== displayName) {
        await supabase
          .from('platform_connections')
          .update({ platform_username: displayName })
          .eq('user_id', user.id)
          .eq('platform', 'onlyfans')
      }
      return NextResponse.json({
        connected: true,
        accountId: account.id,
        username: displayName
      })
    }

    // Save/update the connection to our database (new or different account)
    // First delete any existing connection for this user+platform, then insert new one
    await supabase
      .from('platform_connections')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
    
    const { error: insertError } = await supabase
      .from('platform_connections')
      .insert({
        user_id: user.id,
        platform: 'onlyfans',
        platform_username: displayName,
        is_connected: true,
        access_token: account.id,
        last_sync_at: new Date().toISOString(),
      })
    
    if (insertError) {
      console.error('Failed to save connection:', insertError)
    }

    return NextResponse.json({
      connected: true,
      accountId: account.id,
      username: displayName,
      newlySynced: true
    })

  } catch (error) {
    return NextResponse.json({ 
      connected: false, 
      error: error instanceof Error ? error.message : 'Check failed' 
    })
  }
}
