import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createFanslyAPI } from '@/lib/fansly-api'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

interface MassMessageRequest {
  message: string
  platforms: string[]
  mediaIds?: string[]
  price?: number
  filter?: 'all' | 'active' | 'expired' | 'renewing'
}

// POST: Send mass message to all subscribers across platforms
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: MassMessageRequest = await request.json()
    const { message, platforms, mediaIds, price, filter = 'all' } = body

    if (!message || !platforms || platforms.length === 0) {
      return NextResponse.json({ 
        error: 'Message and at least one platform are required' 
      }, { status: 400 })
    }

    // Get platform connections
    const { data: connections } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_connected', true)
      .in('platform', platforms)

    if (!connections || connections.length === 0) {
      return NextResponse.json({ 
        error: 'No connected platforms found. Please connect your accounts first.' 
      }, { status: 400 })
    }

    const results: Record<string, { 
      success: boolean
      sent?: number
      failed?: number
      error?: string 
    }> = {}

    let totalSent = 0
    let totalFailed = 0

    // Send to each platform
    for (const platform of platforms) {
      const connection = connections.find(c => c.platform === platform)
      
      if (!connection) {
        results[platform] = { success: false, error: 'Platform not connected' }
        continue
      }

      try {
        if (platform === 'fansly') {
          const api = createFanslyAPI()
          const accountId = connection.platform_user_id

          const result = await api.sendMassMessage(accountId, {
            content: message,
            mediaIds,
            price,
            subscriberFilter: filter,
          })

          results.fansly = {
            success: result.success,
            sent: result.sent,
            failed: result.failed,
            error: result.success ? undefined : result.message
          }

          totalSent += result.sent || 0
          totalFailed += result.failed || 0

        } else if (platform === 'onlyfans') {
          const api = createOnlyFansAPI(connection.access_token)
          
          const result = await api.sendMassMessage({
            text: message,
            mediaIds,
            price,
          })

          results.onlyfans = {
            success: result.sent > 0,
            sent: result.sent,
            failed: result.failed,
            error: result.sent === 0 ? 'Failed to send messages' : undefined
          }

          totalSent += result.sent || 0
          totalFailed += result.failed || 0
        }
      } catch (error) {
        results[platform] = {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send'
        }
      }
    }

    const allSuccessful = Object.values(results).every(r => r.success)

    return NextResponse.json({
      success: allSuccessful,
      totalSent,
      totalFailed,
      message: allSuccessful 
        ? `Successfully sent to ${totalSent} subscribers`
        : `Sent to ${totalSent} subscribers, ${totalFailed} failed`,
      results
    })

  } catch (error) {
    console.error('Mass message error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send mass message' },
      { status: 500 }
    )
  }
}
