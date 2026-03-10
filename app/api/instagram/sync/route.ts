import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: Sync Instagram data to analytics_snapshots
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the Instagram connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'instagram')
      .eq('is_connected', true)
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 })
    }

    const accessToken = connection.access_token

    try {
      // Fetch Instagram Business Account info
      const response = await fetch(
        `https://graph.instagram.com/me?fields=id,username,name,biography,website,profile_picture_url,followers_count,media_count&access_token=${accessToken}`
      )

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.status}`)
      }

      const data = await response.json()

      // Save analytics snapshot
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('analytics_snapshots').upsert({
        user_id: user.id,
        platform: 'instagram',
        date: today,
        total_fans: data.followers_count || 0,
        new_fans: 0,
        revenue: 0, // Instagram doesn't provide revenue through Graph API
        messages_received: 0,
        messages_sent: 0,
      }, {
        onConflict: 'user_id,platform,date',
      })

      return NextResponse.json({ 
        success: true, 
        followers: data.followers_count,
        username: data.username 
      })
    } catch (error) {
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Failed to sync Instagram data',
        success: false 
      }, { status: 400 })
    }
  } catch (error) {
    console.error('[v0] Instagram sync error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Sync failed' 
    }, { status: 500 })
  }
}
