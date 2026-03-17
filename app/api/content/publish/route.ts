import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeContentPublish, type ContentPublishParams } from '@/lib/divine-intent-actions'
import type { DivinePostDraft } from '@/lib/divine/post-types'
import { validateOnlyFansPost } from '@/lib/onlyfans-validation'

// POST: Publish content to selected platforms (shared with Divine Manager)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as DivinePostDraft | { content: string; platforms: string[] }
    const text = 'text' in body ? body.text : body.content
    const platforms = body.platforms

    if (!text?.trim() || !platforms?.length) {
      return NextResponse.json(
        { error: 'Content and at least one platform are required' },
        { status: 400 },
      )
    }

    const divineBody = body as DivinePostDraft

    // Basic OnlyFans-specific validation when onlyfans is among platforms
    if (platforms.includes('onlyfans')) {
      const postError = validateOnlyFansPost({
        text,
        mediaIds: divineBody.mediaIds,
        scheduledDate: divineBody.scheduledFor,
      })
      if (postError) {
        return NextResponse.json({ error: postError }, { status: 400 })
      }
    }

    const params: ContentPublishParams = {
      content: text,
      platforms,
      mediaIds: divineBody.mediaIds,
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
