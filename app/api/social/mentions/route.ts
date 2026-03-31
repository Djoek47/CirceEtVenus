import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const sentiment = searchParams.get('sentiment')
    const platform = searchParams.get('platform')
    const reviewed = searchParams.get('reviewed')

    let query = supabase
      .from('reputation_mentions')
      .select('*')
      .eq('user_id', user.id)
      .order('detected_at', { ascending: false })
      .limit(limit)

    if (sentiment && ['positive', 'neutral', 'negative'].includes(sentiment)) {
      query = query.eq('sentiment', sentiment)
    }

    if (platform) {
      query = query.eq('platform', platform)
    }

    if (reviewed === 'true') {
      query = query.eq('is_reviewed', true)
    } else if (reviewed === 'false') {
      query = query.eq('is_reviewed', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching reputation mentions:', error)
      return NextResponse.json({ error: 'Failed to fetch mentions' }, { status: 500 })
    }

    return NextResponse.json({ mentions: data || [] })
  } catch (error) {
    console.error('Error in /api/social/mentions:', error)
    return NextResponse.json({ error: 'Failed to fetch mentions' }, { status: 500 })
  }
}

