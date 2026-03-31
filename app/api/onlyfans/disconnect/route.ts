import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get the current connection to find the account ID
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('access_token, platform_username')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'No OnlyFans connection found' }, { status: 400 })
    }

    const apiKey = process.env.ONLYFANS_API_KEY
    if (apiKey && connection.access_token) {
      // Try to delete from the OnlyFans API
      const api = createOnlyFansAPI()
      const deleteResult = await api.deleteAccount(connection.access_token)
      
      if (!deleteResult.success) {
        // Log but don't fail - we still want to disconnect locally
        console.error('Failed to delete from OnlyFans API:', deleteResult.message)
      }
    }

    // Update local database to mark as disconnected
    const { error: dbError } = await supabase
      .from('platform_connections')
      .update({ 
        is_connected: false,
        access_token: null, // Clear the token
        last_sync_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')

    if (dbError) {
      return NextResponse.json({ error: 'Failed to update database' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'OnlyFans account disconnected successfully' 
    })

  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Disconnect failed' 
    }, { status: 500 })
  }
}
