import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET: Create a client session token for the @onlyfansapi/auth package
// This allows users to connect their OnlyFans account through our app
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKey = process.env.ONLYFANS_API_KEY
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OnlyFans API not configured. Please add ONLYFANS_API_KEY.' 
      }, { status: 500 })
    }

    // Create a client session token via OnlyFans API
    const response = await fetch('https://app.onlyfansapi.com/api/client-sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: `Circe et Venus - ${user.email}`,
        client_reference_id: user.id,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('OnlyFans API error:', errorData)
      return NextResponse.json({ 
        error: 'Failed to create authentication session' 
      }, { status: 500 })
    }

    const data = await response.json()
    
    // Return the client session token (starts with ofapi_cs_)
    return NextResponse.json({ 
      token: data.data?.token || data.token,
      userId: user.id
    })
  } catch (error) {
    console.error('Error creating client session:', error)
    return NextResponse.json(
      { error: 'Failed to initialize authentication' },
      { status: 500 }
    )
  }
}
