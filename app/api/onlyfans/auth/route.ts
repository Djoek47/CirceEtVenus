import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Return the OnlyFans API console URL for account connection
// Users connect their OF account at app.onlyfansapi.com, then sync from here
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return the console URL - users connect their OF account there
    return NextResponse.json({ 
      consoleUrl: 'https://app.onlyfansapi.com',
      userId: user.id
    })
  } catch (error) {
    console.error('Error in auth endpoint:', error)
    return NextResponse.json(
      { error: 'Failed to initialize' },
      { status: 500 }
    )
  }
}
