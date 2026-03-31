import { NextRequest } from 'next/server'
import { generateText, Output } from 'ai'
import { z } from 'zod'

export const maxDuration = 30

const photoSpotSchema = z.object({
  spots: z.array(z.object({
    name: z.string().describe('Name of the photo location'),
    type: z.enum(['beach', 'park', 'urban', 'landmark', 'scenic', 'indoor', 'rooftop', 'cafe', 'studio']).describe('Type of location'),
    distance: z.string().describe('Estimated distance from user'),
    rating: z.number().min(1).max(5).describe('Quality rating for content creation'),
    bestTime: z.string().describe('Best time of day for shooting'),
    contentIdeas: z.array(z.string()).describe('3-5 specific content ideas for this location'),
    aesthetic: z.string().describe('Visual aesthetic/vibe of this location'),
    tips: z.string().describe('Pro tip for shooting at this location'),
    seasonalNote: z.string().nullable().describe('Any seasonal considerations'),
  })),
  generalAdvice: z.string().describe('General advice for content creation in this area'),
  weatherTip: z.string().describe('Weather-related tip for today'),
})

export async function POST(req: NextRequest) {
  try {
    const { lat, lng, city, country, userRequest, contentType, zodiacSign, moonPhase } = await req.json()

    const prompt = `You are Venus, the AI goddess of attraction and growth, helping content creators find perfect photo spots.

LOCATION: ${city}, ${country} (Coordinates: ${lat}, ${lng})
USER REQUEST: "${userRequest || 'Find me great spots for content creation'}"
CONTENT TYPE PREFERENCE: ${contentType || 'General lifestyle/glamour content'}
CURRENT ZODIAC: ${zodiacSign || 'Not specified'}
MOON PHASE: ${moonPhase || 'Not specified'}

Based on the user's location and request, suggest 6-8 real photo spots that would be PERFECT for a content creator. Consider:

1. **Types of locations nearby**: beaches, parks, urban areas, landmarks, rooftops, cafes, scenic viewpoints
2. **User's specific request**: If they mentioned a mood (sexy, elegant, casual, etc.) or content type
3. **Time of day**: Golden hour, blue hour, natural lighting conditions
4. **Cosmic alignment**: The current zodiac energy and moon phase for content themes
5. **Practical factors**: Distance, accessibility, best times to avoid crowds

For each spot, provide:
- Realistic name (use actual type of place that would exist in ${city})
- Specific content ideas that match the user's vibe
- Pro tips for getting the best shots
- Aesthetic description

Be specific to the location - mention actual neighborhoods, types of venues, or geographic features typical of ${city}, ${country}.`

    const result = await generateText({
      model: 'openai/gpt-4o-mini',
      prompt,
      experimental_output: Output.object({
        schema: photoSpotSchema,
      }),
    })

    return Response.json(result.experimental_output)
  } catch (error) {
    console.error('Photo spots AI error:', error)
    return Response.json(
      { error: 'Failed to generate photo spot recommendations' },
      { status: 500 }
    )
  }
}
