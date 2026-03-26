/**
 * Run AI Studio tools by id + args (same routes as the dashboard library; uses session cookie).
 */
import { getToolMeta } from '@/lib/ai-tools-data'
import { runDivineAiToolServer, isDivineAiToolId, type DivineAiToolId } from '@/lib/divine/run-ai-tool-core'

function apiBase(): string {
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return baseUrl + '/api/ai'
}

export type RunAiStudioToolResult = { success: true; result: unknown } | { success: false; error: string }

/**
 * POST JSON to /api/ai/:path with cookie auth.
 */
async function postAi(
  path: string,
  body: Record<string, unknown>,
  cookie: string,
): Promise<RunAiStudioToolResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Cookie: cookie,
  }
  const res = await fetch(`${apiBase()}/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { success: false, error: (data as { error?: string }).error || `HTTP ${res.status}` }
  return { success: true, result: data }
}

/**
 * Maps tool id (ai-tools-data) to API subpath and body builder from generic args.
 */
export async function runAiStudioToolServer(
  toolId: string,
  args: Record<string, unknown>,
  cookie: string,
): Promise<RunAiStudioToolResult> {
  const meta = getToolMeta(toolId)
  if (!meta) {
    return { success: false, error: `Unknown tool id: ${toolId}` }
  }
  if (!meta.hasRunner) {
    return {
      success: false,
      error: `Tool "${meta.name}" has no API runner in AI Studio. Use a listed tool id with hasRunner.`,
    }
  }
  const a = args ?? {}

  if (isDivineAiToolId(toolId)) {
    return runDivineAiToolServer(toolId as DivineAiToolId, a, cookie)
  }

  switch (toolId) {
    case 'fantasy-writer':
      return postAi('fantasy-writer', {
        scenario: a.scenario ?? a.contentDescription ?? a.description ?? '',
        tone: a.tone ?? a.contentType ?? 'romantic',
        platform: a.platform ?? 'onlyfans',
      }, cookie)
    case 'gift-suggester':
      return postAi('gift-suggester', {
        fanInfo: a.fanInfo ?? a.message ?? '',
        budget: a.budget ?? a.currentPrice ?? '',
      }, cookie)
    case 'price-optimizer':
      return postAi('revenue-optimizer', {
        currentPrice: a.currentPrice ?? '',
        contentType: a.contentType ?? 'photo',
        platform: a.platform ?? 'onlyfans',
        description: a.description ?? a.contentDescription ?? '',
      }, cookie)
    case 'voice-cloning':
      return postAi('voice-clone', {
        sampleText: a.sampleText ?? '',
        targetTone: a.targetTone ?? a.contentType ?? 'natural',
        context: a.context ?? a.description ?? '',
      }, cookie)
    case 'pricing-optimizer':
      return postAi('pricing-optimizer', {
        contentType: a.contentType ?? 'photo',
        currentPrice: a.currentPrice ?? '',
        niche: a.niche ?? '',
        subscriberCount: a.subscriberCount ?? a.fanMessage ?? '',
      }, cookie)
    case 'mass-dm-composer':
      return postAi('mass-dm-composer', {
        campaign: a.campaign ?? a.campaignGoal ?? '',
        audienceSegment: a.audienceSegment ?? 'all',
        tone: a.tone ?? a.contentType ?? 'friendly',
        callToAction: a.callToAction ?? a.description ?? '',
      }, cookie)
    case 'venus-attraction':
      return postAi('venus-attraction', {
        prompt: a.prompt ?? a.description ?? a.contentDescription ?? '',
        niche: a.niche ?? '',
        platform: a.platform ?? 'onlyfans',
      }, cookie)
    case 'venus-cupid':
      return postAi('venus-cupid', {
        prompt: a.prompt ?? a.description ?? '',
        niche: a.niche ?? '',
      }, cookie)
    case 'venus-garden':
      return postAi('venus-garden', {
        prompt: a.prompt ?? a.description ?? '',
        niche: a.niche ?? '',
      }, cookie)
    case 'circe-oracle':
      return postAi('circe-oracle', {
        prompt: a.prompt ?? a.description ?? '',
        niche: a.niche ?? '',
      }, cookie)
    case 'circe-transformation':
      return postAi('circe-transformation', {
        prompt: a.prompt ?? a.description ?? '',
        niche: a.niche ?? '',
      }, cookie)
    case 'divine-forecast':
      return postAi('tool-run', {
        toolId: 'divine-forecast',
        prompt: typeof a.prompt === 'string' && a.prompt.trim()
          ? a.prompt
          : 'Revenue and growth forecast for my creator business.',
      }, cookie)
    default:
      return { success: false, error: `Unhandled AI Studio tool: ${toolId}` }
  }
}
