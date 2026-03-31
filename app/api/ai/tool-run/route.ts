import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { getToolMeta } from '@/lib/ai-tools-data'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const toolId = typeof body.toolId === 'string' ? body.toolId : ''
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
    if (!toolId || !prompt) {
      return NextResponse.json(
        { error: 'toolId and prompt are required' },
        { status: 400 }
      )
    }

    const meta = getToolMeta(toolId)
    const toolName = meta?.name ?? toolId
    const toolDesc = meta?.longDescription ?? meta?.description ?? ''

    const { text } = await generateText({
      model: 'openai/gpt-4o-mini',
      system: `You are an expert AI assistant for the creator tool "${toolName}".
${toolDesc ? `Tool description: ${toolDesc}` : ''}
Respond with actionable, helpful output tailored to the creator's request. Be concise but complete. Use plain text or short bullet points where appropriate.`,
      prompt,
    })

    return NextResponse.json({ content: text })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tool run failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
