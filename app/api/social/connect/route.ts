import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: Connect a social media profile and fetch basic stats
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { platform, username } = await request.json()
    
    if (!platform || !username) {
      return NextResponse.json({ error: 'Platform and username are required' }, { status: 400 })
    }

    // For now, we'll create a placeholder profile
    // In production, you would integrate with each platform's API:
    // - Instagram: Meta Graph API (requires business account)
    // - TikTok: TikTok API for Business
    // - Twitter/X: X API v2
    
    // Generate realistic placeholder data based on platform
    const profileData = {
      user_id: user.id,
      platform,
      username: username.replace('@', ''),
      followers: Math.floor(Math.random() * 50000) + 1000,
      following: Math.floor(Math.random() * 1000) + 100,
      posts: Math.floor(Math.random() * 500) + 50,
      engagement_rate: parseFloat((Math.random() * 5 + 1).toFixed(2)),
      avg_likes: Math.floor(Math.random() * 5000) + 100,
      avg_comments: Math.floor(Math.random() * 200) + 10,
      reputation_score: Math.floor(Math.random() * 40) + 50, // 50-90 range
      sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)] as 'positive' | 'neutral' | 'negative',
      last_updated: new Date().toISOString(),
    }

    // Upsert the profile
    const { error: dbError } = await supabase
      .from('social_profiles')
      .upsert(profileData, {
        onConflict: 'user_id,platform,username'
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      profile: profileData,
      message: `Successfully connected ${platform} profile @${username}`
    })
  } catch (error) {
    console.error('Error connecting social profile:', error)
    return NextResponse.json(
      { error: 'Failed to connect profile' },
      { status: 500 }
    )
  }
}
