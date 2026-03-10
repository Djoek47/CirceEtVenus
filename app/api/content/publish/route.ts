import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createFanslyAPI } from '@/lib/fansly-api'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'

interface PublishRequest {
  contentId?: string
  content: string
  platforms: string[]
  mediaUrls?: string[]
  scheduledFor?: string // ISO date string
}

// POST: Publish content to selected platforms
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: PublishRequest = await request.json()
    const { content, platforms, mediaUrls, scheduledFor, contentId } = body

    if (!content || !platforms || platforms.length === 0) {
      return NextResponse.json({ 
        error: 'Content and at least one platform are required' 
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

    const results: Record<string, { success: boolean; postId?: string; error?: string }> = {}

    // Publish to each platform
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

          // Get walls first
          const { walls } = await api.getWalls(accountId)
          const wallIds = walls.length > 0 ? walls.map(w => w.id) : []

          // Create post
          const result = await api.createPost(accountId, {
            content,
            wallIds,
            scheduledFor: scheduledFor ? Math.floor(new Date(scheduledFor).getTime() / 1000) : 0,
          })

          results.fansly = {
            success: result.success,
            postId: result.postId,
            error: result.success ? undefined : result.message
          }
        } else if (platform === 'onlyfans') {
          const api = createOnlyFansAPI(connection.access_token)
          
          // Create post on OnlyFans
          const result = await api.createPost({
            text: content,
            mediaFiles: mediaUrls,
            schedule: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
          })

          results.onlyfans = {
            success: result.success,
            postId: result.postId,
            error: result.success ? undefined : result.error
          }
        }
      } catch (error) {
        results[platform] = {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to publish'
        }
      }
    }

    // Update content record if contentId provided
    if (contentId) {
      const allSuccessful = Object.values(results).every(r => r.success)
      await supabase
        .from('content')
        .update({
          status: allSuccessful ? 'published' : 'partial',
          published_at: new Date().toISOString(),
          platform_post_ids: results,
        })
        .eq('id', contentId)
        .eq('user_id', user.id)
    }

    const successCount = Object.values(results).filter(r => r.success).length
    const failCount = Object.values(results).filter(r => !r.success).length

    return NextResponse.json({
      success: failCount === 0,
      message: failCount === 0 
        ? `Successfully published to ${successCount} platform(s)`
        : `Published to ${successCount} platform(s), ${failCount} failed`,
      results
    })

  } catch (error) {
    console.error('Publish error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish content' },
      { status: 500 }
    )
  }
}
