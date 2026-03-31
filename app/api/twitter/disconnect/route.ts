import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'

// POST: Disconnect Twitter/X account
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete the connection from database
    const { error } = await supabase
      .from('platform_connections')
      .update({ is_connected: false, access_token: null, refresh_token: null })
      .eq('user_id', user.id)
      .eq('platform', 'twitter')

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Twitter disconnect error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Disconnect failed' 
    }, { status: 500 })
  }
}
