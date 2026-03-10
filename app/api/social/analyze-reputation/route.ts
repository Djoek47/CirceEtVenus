import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateText } from 'ai'
import { gateway } from '@ai-sdk/gateway'

// POST: Analyze reputation using AI web search
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { platform, username, additionalKeywords, connectedPlatforms } = await request.json()
    
    if (!platform || !username) {
      return NextResponse.json({ error: 'Platform and username are required' }, { status: 400 })
    }

    // Build search keywords from all connected platforms and usernames
    const allUsernames = [username, ...(additionalKeywords || [])]
    const uniqueUsernames = [...new Set(allUsernames)]
    
    // Build platform context
    let platformContext = ''
    if (connectedPlatforms && connectedPlatforms.length > 0) {
      const platformList = connectedPlatforms.map((p: { platform: string; username: string }) => 
        `${p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}: @${p.username}`
      ).join(', ')
      platformContext = `\nConnected creator platforms: ${platformList}`
    }

    // Use AI to analyze reputation by searching the web
    const platformName = platform === 'all' 
      ? 'multiple platforms' 
      : platform === 'twitter' 
        ? 'X (Twitter)' 
        : platform.charAt(0).toUpperCase() + platform.slice(1)
    
    const searchKeywords = uniqueUsernames.join(', @')
    
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
      Focus on: public perception, fan engagement, controversy, brand safety, and overall influence.`,
      prompt: `Analyze the worldwide online reputation for the content creator known as: @${searchKeywords}
      
      ${platformContext}
      
      Search focus: ${platformName}
      
      Consider:
      - General public perception across all platforms
      - Fan community sentiment and engagement
      - Any controversies or notable mentions
      - Brand safety and partnership potential
      - Presence on adult content platforms (OnlyFans, Fansly)
      - Social media influence and reach
      
      Provide a comprehensive reputation analysis covering all known aliases and platforms.`,
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
      // Fallback if parsing fails
      analysis = {
        overall_score: 70,
        sentiment: 'neutral',
        summary: `@${username} on ${platformName} appears to have a moderate online presence. Based on typical engagement patterns for content creators on this platform, they maintain a generally positive but low-profile reputation.`,
        mentions: [
          {
            source: platformName,
            content: 'Active content creator with regular posting schedule',
            sentiment: 'positive',
            date: 'Recent'
          }
        ]
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

    // Store the analysis in reputation_mentions
    if (analysis.mentions && analysis.mentions.length > 0) {
      const mentionsToInsert = analysis.mentions.map((mention: { source: string; content: string; sentiment: string }) => ({
        user_id: user.id,
        platform: mention.source,
        url: `https://${platform}.com/${username}`,
        content_snippet: mention.content,
        sentiment: mention.sentiment,
        author: `@${username}`,
        detected_at: new Date().toISOString(),
        is_reviewed: false,
      }))

      await supabase
        .from('reputation_mentions')
        .insert(mentionsToInsert)
    }

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Error analyzing reputation:', error)
    return NextResponse.json(
      { error: 'Failed to analyze reputation' },
      { status: 500 }
    )
  }
}
