import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { executeContentPublish, type ContentPublishParams } from '@/lib/divine-intent-actions'
import type { DivinePostDraft } from '@/lib/divine/post-types'
import { validateOnlyFansPost } from '@/lib/onlyfans-validation'

// POST: Publish content to selected platforms (shared with Divine Manager)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: DivinePostDraft | { content: string; platforms: string[] }
    try {
      const raw = await request.json()
      if (raw == null || typeof raw !== 'object') {
        return NextResponse.json(
          { error: 'Request body must be a JSON object with "text" or "content" and "platforms"' },
          { status: 400 },
        )
      }
      body = raw as DivinePostDraft | { content: string; platforms: string[] }
    } catch {
      return NextResponse.json(
        { error: 'Request body must be valid JSON' },
        { status: 400 },
      )
    }

    const text = ('text' in body ? body.text : body.content) ?? ''
    const platforms = Array.isArray(body.platforms) ? body.platforms : []
    const hasMedia = Array.isArray((body as DivinePostDraft).mediaIds) && (body as DivinePostDraft).mediaIds!.length > 0

    if (!platforms.length) {
      return NextResponse.json(
        { error: 'At least one platform is required' },
        { status: 400 },
      )
    }
    if (!text.trim() && !hasMedia) {
      return NextResponse.json(
        { error: 'Content and at least one platform are required (or media IDs for media-only posts)' },
        { status: 400 },
      )
    }

    const divineBody = body as DivinePostDraft
    const mediaIds = Array.isArray(divineBody.mediaIds) ? divineBody.mediaIds : undefined

    // Basic OnlyFans-specific validation when onlyfans is among platforms
    if (platforms.includes('onlyfans')) {
      const postError = validateOnlyFansPost({
        text,
        mediaIds,
        scheduledDate: divineBody.scheduledFor,
      })
      if (postError) {
        return NextResponse.json({ error: postError }, { status: 400 })
      }
    }

    const params: ContentPublishParams = {
      content: text,
      platforms,
      mediaIds,
      mediaUrls: divineBody.mediaUrls,
      scheduledFor: divineBody.scheduledFor,
      contentId: divineBody.contentId,
    }

    const result = await executeContentPublish(supabase, user.id, params)

    return NextResponse.json({
      success: result.success,
      message: result.summary,
      results: result.results ?? {},
    })
  } catch (error) {
    console.error('Publish error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to publish content' },
      { status: 500 },
    )
  }
}
