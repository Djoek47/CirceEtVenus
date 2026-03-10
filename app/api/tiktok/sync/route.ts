import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: Sync TikTok data to analytics_snapshots
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the TikTok connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'tiktok')
      .eq('is_connected', true)
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'TikTok not connected' }, { status: 400 })
    }

    const accessToken = connection.access_token

    try {
      // Fetch TikTok user info from TikTok API
      const response = await fetch(
        'https://open.tiktokapis.com/v1/user/info/?fields=open_id,union_id,display_name,avatar_url,follower_count,video_count',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`TikTok API error: ${response.status}`)
      }

      const data = await response.json()
      const userInfo = data.data?.user || {}

      // Save analytics snapshot
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('analytics_snapshots').upsert({
        user_id: user.id,
        platform: 'tiktok',
        date: today,
        total_fans: userInfo.follower_count || 0,
        new_fans: 0,
        revenue: 0, // TikTok Creator Fund data requires separate API
        messages_received: 0,
        messages_sent: 0,
      }, {
        onConflict: 'user_id,platform,date',
      })

      return NextResponse.json({ 
        success: true, 
        followers: userInfo.follower_count,
        display_name: userInfo.display_name 
      })
    } catch (error) {
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Failed to sync TikTok data',
        success: false 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('[v0] TikTok sync error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Sync failed' 
    }, { status: 500 })
  }
}
