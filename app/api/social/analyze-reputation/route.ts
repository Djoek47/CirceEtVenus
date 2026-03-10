import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { gateway } from '@ai-sdk/gateway'
import { computeReputationScore } from '@/lib/reputation/score'

// POST: Analyze reputation using AI web search
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { platform, username, additionalKeywords, connectedPlatforms, skipScan } = await request.json()
    
    if (!platform || !username) {
      return NextResponse.json({ error: 'Platform and username are required' }, { status: 400 })
    }

    // Build search keywords from all connected platforms and usernames
    const allUsernames = [username, ...(additionalKeywords || [])]
    const uniqueUsernames = [...new Set(allUsernames)]
    
    // Optionally trigger a fresh scan first (unless explicitly skipped)
    if (!skipScan) {
      try {
        await fetch(new URL('/api/social/scan-reputation', request.url), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      } catch {
        // ignore scan failure for analysis
      }
    }

    // Build platform context
    let platformContext = ''
    if (connectedPlatforms && connectedPlatforms.length > 0) {
      const platformList = connectedPlatforms.map((p: { platform: string; username: string }) => 
        `${p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}: @${p.username}`
      ).join(', ')
      platformContext = `\nConnected creator platforms: ${platformList}`
    }

    // Use AI to analyze reputation based on stored mentions + web search
    const platformName = platform === 'all' 
      ? 'multiple platforms' 
      : platform === 'twitter' 
        ? 'X (Twitter)' 
        : platform.charAt(0).toUpperCase() + platform.slice(1)
    
    const searchKeywords = uniqueUsernames.join(', @')

    // Pull recent mentions from DB to inform both scoring and the AI summary
    const { data: dbMentions } = await supabase
      .from('reputation_mentions')
      .select('*')
      .eq('user_id', user.id)
      .order('detected_at', { ascending: false })
      .limit(100)

    const score = computeReputationScore((dbMentions || []) as any)

    // Optionally include niche/boundary context from platform_connections
    const { data: platformRows } = await supabase
      .from('platform_connections')
      .select('platform,niches')
      .eq('user_id', user.id)
      .eq('is_connected', true)

    const niches =
      platformRows
        ?.flatMap((p: any) => p.niches || [])
        .filter((v: any, i: number, arr: any[]) => typeof v === 'string' && arr.indexOf(v) === i) || []

    const nicheContext = niches.length
      ? `Creator niches: ${niches.join(', ')}. Treat these as consensual adult branding, but still follow all safety rules.\n`
      : ''

    const { text } = await generateText({
      model: gateway('openai/gpt-4o-mini'),
      system: `You are a social media and content creator reputation analyst. Analyze the online reputation of content creators across all platforms including OnlyFans, Fansly, Instagram, TikTok, Twitter/X, and other social media.
      
      Provide analysis in JSON format with the following structure:
      {
        "overall_score": number (0-100),
        "sentiment": "positive" | "neutral" | "negative",
        "summary": "Brief 2-3 sentence summary of their online reputation across all platforms",
        "mentions": [
          {
            "source": "Platform/Website name",
            "content": "Brief quote or description of mention",
            "sentiment": "positive" | "neutral" | "negative",
            "date": "Approximate date or 'Recent'"
          }
        ],
        "platforms_analyzed": ["list of platforms checked"],
        "risk_factors": ["any potential reputation risks"],
        "positive_factors": ["positive reputation indicators"]
      }
      
      Consider their presence on adult content platforms (OnlyFans, Fansly) as legitimate business activity.
      Some creators serve specific niches (e.g. domination, foot fetish, findom, sfw_only, no_sex). When such niches are provided, interpret \"rough\" or \"kinky\" language in that consensual context, but never normalize illegal or non-consensual behavior.
      Focus on: public perception, fan engagement, controversy, brand safety, and overall influence.`,
      prompt: `Analyze the worldwide online reputation for the content creator known as: @${searchKeywords}
      
      ${nicheContext}
      ${platformContext}
      
      Search focus: ${platformName}
      
      Consider:
      - General public perception across all platforms
      - Fan community sentiment and engagement
      - Any controversies or notable mentions
      - Brand safety and partnership potential
      - Presence on adult content platforms (OnlyFans, Fansly)
      - Social media influence and reach
      
      Provide a comprehensive reputation analysis covering all known aliases and platforms.

      Here are up to 100 recent mentions we have already collected from the web for this creator:
      ${JSON.stringify(dbMentions || [], null, 2)}
      `,
    })

    // Parse the AI response
    let analysis
    try {
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch {
      // Fallback if parsing fails: synthesize analysis from score
      analysis = {
        overall_score: score.overallScore,
        sentiment: score.sentiment,
        summary: `@${username} on ${platformName} has an overall ${score.sentiment} reputation based on recent mentions.`,
        mentions: (dbMentions || []).slice(0, 5).map((m: any) => ({
          source: m.platform,
          content: m.content_snippet,
          sentiment: m.sentiment,
          date: m.detected_at,
        })),
      }
    }

    // Update the profile with new reputation data
    await supabase
      .from('social_profiles')
      .update({
        reputation_score: analysis.overall_score,
        sentiment: analysis.sentiment,
        last_updated: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('platform', platform)
      .eq('username', username)

    // Do NOT synthesize extra mentions into DB anymore; rely on real scanned mentions.

    return NextResponse.json({
      ...analysis,
      score: score,
    })
  } catch (error) {
    console.error('Error analyzing reputation:', error)
    return NextResponse.json(
      { error: 'Failed to analyze reputation' },
      { status: 500 }
    )
  }
}
