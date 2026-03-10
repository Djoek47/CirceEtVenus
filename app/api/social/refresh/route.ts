import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST: Refresh social media profile stats
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

    // Get existing profile
    const { data: existingProfile } = await supabase
      .from('social_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('username', username)
      .single()

    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // In production, fetch real data from platform APIs
    // For now, simulate growth/changes
    const growthFactor = 1 + (Math.random() * 0.1 - 0.02) // -2% to +8% change
    
    const updatedData = {
      followers: Math.floor(existingProfile.followers * growthFactor),
      posts: existingProfile.posts + Math.floor(Math.random() * 3),
      avg_likes: Math.floor(existingProfile.avg_likes * (1 + (Math.random() * 0.2 - 0.1))),
      avg_comments: Math.floor(existingProfile.avg_comments * (1 + (Math.random() * 0.2 - 0.1))),
      engagement_rate: parseFloat((existingProfile.engagement_rate * (1 + (Math.random() * 0.1 - 0.05))).toFixed(2)),
      last_updated: new Date().toISOString(),
    }

    const { error: dbError } = await supabase
      .from('social_profiles')
      .update(updatedData)
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('username', username)

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      profile: { ...existingProfile, ...updatedData }
    })
  } catch (error) {
    console.error('Error refreshing social profile:', error)
    return NextResponse.json(
      { error: 'Failed to refresh profile' },
      { status: 500 }
    )
  }
}
