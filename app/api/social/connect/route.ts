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

    // Store profile for reputation scanning; platform stats require official API keys.
    const profileData = {
      user_id: user.id,
      platform,
      username: username.replace('@', ''),
      followers: 0,
      following: 0,
      posts: 0,
      engagement_rate: 0,
      avg_likes: 0,
      avg_comments: 0,
      reputation_score: 50,
      sentiment: 'neutral' as const,
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
