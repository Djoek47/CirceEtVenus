import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: Sync Twitter/X data to analytics_snapshots
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the Twitter connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'twitter')
      .eq('is_connected', true)
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'Twitter not connected' }, { status: 400 })
    }

    // Parse stored data (access_token contains the auth data for Twitter API v2)
    const accessToken = connection.access_token
    
    try {
      // Fetch user info from Twitter API v2
      const response = await fetch('https://api.twitter.com/2/users/me?user.fields=public_metrics,created_at', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.status}`)
      }

      const data = await response.json()
      const metrics = data.data?.public_metrics || {}

      // Save analytics snapshot
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('analytics_snapshots').upsert({
        user_id: user.id,
        platform: 'twitter',
        date: today,
        total_fans: metrics.followers_count || 0,
        new_fans: 0,
        revenue: 0, // Twitter doesn't provide direct revenue through this endpoint
        messages_received: 0,
        messages_sent: 0,
      }, {
        onConflict: 'user_id,platform,date',
      })

      return NextResponse.json({ success: true, followers: metrics.followers_count })
    } catch (error) {
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Failed to sync Twitter data',
        success: false 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('[v0] Twitter sync error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Sync failed' 
    }, { status: 500 })
  }
}
