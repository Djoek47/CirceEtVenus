import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Check if user has an OnlyFans connection
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ connected: false })
    }

    // Check for existing connection
    const { data: connection } = await supabase
      .from('platform_connections')
      .select('platform_user_id, platform_username, is_connected')
      .eq('user_id', user.id)
      .eq('platform', 'onlyfans')
      .eq('is_connected', true)
      .single()

    if (connection) {
      return NextResponse.json({
        connected: true,
        accountId: connection.platform_user_id,
        username: connection.platform_username
      })
    }

    return NextResponse.json({ connected: false })
  } catch (error) {
    console.error('Check connection error:', error)
    return NextResponse.json({ connected: false })
  }
}
