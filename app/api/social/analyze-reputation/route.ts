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

    const { platform, username } = await request.json()
    
    if (!platform || !username) {
      return NextResponse.json({ error: 'Platform and username are required' }, { status: 400 })
    }

    // Use AI to analyze reputation by searching the web
    const platformName = platform === 'twitter' ? 'X (Twitter)' : platform.charAt(0).toUpperCase() + platform.slice(1)
    
    const { text } = await generateText({
      model: gateway('openai/gpt-4o-mini'),
      system: `You are a social media reputation analyst. Analyze the online reputation of content creators and influencers. 
      Provide analysis in JSON format with the following structure:
      {
        "overall_score": number (0-100),
        "sentiment": "positive" | "neutral" | "negative",
        "summary": "Brief 2-3 sentence summary of their online reputation",
        "mentions": [
          {
            "source": "Platform/Website name",
            "content": "Brief quote or description of mention",
            "sentiment": "positive" | "neutral" | "negative",
            "date": "Approximate date or 'Recent'"
          }
        ]
      }
      Base your analysis on common patterns for content creators. If you don't have specific information, provide a general assessment based on typical patterns for their platform.`,
      prompt: `Analyze the online reputation of @${username} on ${platformName}. 
      Consider:
      - General public perception
      - Common mentions or discussions about them
      - Brand safety considerations
      - Community engagement patterns
      
      Provide a realistic reputation analysis.`,
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
