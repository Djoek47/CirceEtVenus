/**
 * Build normalized DM lines from raw OnlyFansAPI chat messages (text + media-only).
 * Used by dm-reply-package, dm-thread API, and Mimic draft context.
 */
import type { NormalizedChatMessage } from '@/lib/ai/message-suggestions'

function stripHtml(text: string): string {
  return String(text ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function mediaSummaryFromRaw(m: Record<string, unknown>): string {
  const media = m.media
  const previews = m.previews
  const medArr = Array.isArray(media) ? (media as Record<string, unknown>[]) : []
  const prevArr = Array.isArray(previews) ? (previews as unknown[]) : []

  if (medArr.length === 0 && prevArr.length === 0) {
    const mc = m.mediaCount
    if (typeof mc === 'number' && mc > 0) return `[${mc} media]`
    return ''
  }

  const lockedCount = medArr.filter((x) => x.canView === false).length
  const allLocked = medArr.length > 0 && medArr.every((x) => x.canView === false)
  if (allLocked) return '[locked media]'

  let photos = 0
  let videos = 0
  let locked = 0
  for (const item of medArr) {
    if (item.canView === false) {
      locked++
      continue
    }
    const t = String(item.type ?? 'photo').toLowerCase()
    if (t === 'video') videos++
    else photos++
  }

  const parts: string[] = []
  if (locked) parts.push(`${locked} locked`)
  if (photos) parts.push(`${photos} photo${photos > 1 ? 's' : ''}`)
  if (videos) parts.push(`${videos} video${videos > 1 ? 's' : ''}`)
  if (medArr.length === 0 && prevArr.length > 0) {
    parts.push(`${prevArr.length} preview${prevArr.length > 1 ? 's' : ''}`)
  }

  if (parts.length === 0) return lockedCount ? '[locked media]' : '[media]'
  return `[${parts.join(', ')}]`
}

/**
 * Single-line content for AI: body text plus optional media summary.
 */
export function buildMessageContentForAi(m: Record<string, unknown>): string | null {
  const text = stripHtml(String(m.text ?? ''))
  const mediaHint = mediaSummaryFromRaw(m)
  if (text && mediaHint) return `${text} ${mediaHint}`.slice(0, 4000)
  if (text) return text.slice(0, 4000)
  if (mediaHint) return mediaHint
  return null
}

/**
 * Map sorted raw OF messages to NormalizedChatMessage (includes media-only rows).
 */
export function normalizeSortedRawOfMessages(rawMessages: unknown[]): NormalizedChatMessage[] {
  const out: NormalizedChatMessage[] = []
  for (const raw of rawMessages) {
    if (!raw || typeof raw !== 'object') continue
    const m = raw as Record<string, unknown>
    const content = buildMessageContentForAi(m)
    if (!content) continue
    const createdAt =
      typeof m.createdAt === 'string' && m.createdAt ? m.createdAt : new Date().toISOString()
    const from = Boolean(m.isSentByMe) ? ('creator' as const) : ('fan' as const)
    out.push({ from, text: content, createdAt })
  }
  return out
}

export type FormatThreadTextOptions = {
  /** Take only the last N messages (after normalization). Default 50. */
  lastN?: number
  /** Max characters per line body (after "creator: " / "fan: "). Default 800. */
  lineMax?: number
  /** Cap total string length (keeps tail). Default 12000. */
  maxTotalChars?: number
}

/**
 * Multiline thread string for prompts and previews.
 */
export function formatThreadTextForAi(
  messages: NormalizedChatMessage[],
  opts?: FormatThreadTextOptions,
): string {
  const lastN = opts?.lastN ?? 50
  const lineMax = opts?.lineMax ?? 800
  const maxTotal = opts?.maxTotalChars ?? 12000
  const slice = messages.slice(-lastN)
  const lines = slice.map((m) => {
    const body = m.text.slice(0, lineMax)
    return `${m.from}: ${body}`
  })
  let joined = lines.join('\n')
  if (joined.length > maxTotal) joined = joined.slice(-maxTotal)
  return joined
}

export function hasMediaInRawMessage(m: Record<string, unknown>): boolean {
  const media = m.media
  const previews = m.previews
  if (Array.isArray(media) && media.length > 0) return true
  if (Array.isArray(previews) && previews.length > 0) return true
  const mc = m.mediaCount
  return typeof mc === 'number' && mc > 0
}
