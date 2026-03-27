/**
 * Structured fan lookup metadata for Divine (spellback, fuzzy fallbacks, UI hints).
 * Serialized in tool content as [divine_lookup_meta:...] and passed as lookup_meta in APIs.
 */

import type { DivineDmConversationRow } from '@/lib/divine/divine-dm-conversations'

export type DivineLookupResolved =
  | 'exact'
  | 'browse'
  | 'fuzzy_confirm_required'
  | 'multi_match_confirm_required'
  | 'fuzzy_ambiguous'
  | 'no_match'

export type DivineLookupCandidate = {
  fanId: string
  username: string
  displayName: string | null
  /** 0–1 */
  matchScore?: number
}

export type DivineLookupMeta = {
  tool: 'get_dm_conversations' | 'lookup_fan'
  heard_query: string
  resolved: DivineLookupResolved
  candidates: DivineLookupCandidate[]
  /** Dedup key for no-loop guidance */
  dedupe_key: string
  next_step_hint: string
}

const META_PREFIX = '[divine_lookup_meta:'

function normalizeAlpha(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i]![0] = i
  for (let j = 0; j <= n; j++) dp[0]![j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost)
    }
  }
  return dp[m]![n]!
}

function ratio(a: string, b: string): number {
  if (!a.length && !b.length) return 1
  const maxLen = Math.max(a.length, b.length, 1)
  return 1 - levenshtein(a, b) / maxLen
}

/** Score how well `query` matches a fan row (0–1). */
export function scoreConversationMatch(query: string, c: DivineDmConversationRow): number {
  const q = query.toLowerCase().trim()
  if (!q) return 0
  const u = (c.username || '').toLowerCase()
  const n = (c.name || '').toLowerCase()
  const hay = `${u} ${n}`
  if (hay.includes(q)) return 1
  const nu = normalizeAlpha(u)
  const nn = normalizeAlpha(n)
  const nq = normalizeAlpha(q)
  if (!nq) return 0
  const rU = ratio(nu, nq)
  const rN = nn.length ? ratio(nn, nq) : 0
  const rHay = ratio(normalizeAlpha(hay), nq)
  return Math.max(rU, rN, rHay * 0.95)
}

export function rankConversationsByQuery(
  query: string,
  rows: DivineDmConversationRow[],
  limit: number,
): Array<{ row: DivineDmConversationRow; score: number }> {
  const scored = rows
    .map((row) => ({ row, score: scoreConversationMatch(query, row) }))
    .filter((x) => x.score > 0.2)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}

export function toCandidates(
  items: Array<{ row: DivineDmConversationRow; score: number }>,
): DivineLookupCandidate[] {
  return items.map(({ row, score }) => ({
    fanId: row.fanId,
    username: row.username,
    displayName: row.name,
    matchScore: Math.round(score * 1000) / 1000,
  }))
}

export function formatSpellbackLine(heardQuery: string): string {
  const q = heardQuery.trim()
  if (!q) return ''
  return `I heard "${q}" — searching by fan id, username, or chat name.\n\n`
}

export function appendLookupMetaBlock(content: string, meta: DivineLookupMeta): string {
  const json = JSON.stringify(meta)
  return `${content}\n\n${META_PREFIX}${json}]`
}

/** Parse embedded meta from tool content (for clients). */
/** Truncate tool text without losing trailing [divine_lookup_meta:…] (needed for model + clients). */
export function truncatePreservingLookupMeta(content: string, max: number): string {
  const marker = '[divine_lookup_meta:'
  const metaIdx = content.lastIndexOf(marker)
  if (metaIdx === -1) return content.slice(0, max)
  const suffix = content.slice(metaIdx)
  if (suffix.length >= max) return suffix.slice(0, max)
  const headBudget = Math.max(0, max - suffix.length)
  return content.slice(0, metaIdx).slice(0, headBudget) + suffix
}

export function parseLookupMetaFromContent(content: string): DivineLookupMeta | null {
  const idx = content.lastIndexOf(META_PREFIX)
  if (idx === -1) return null
  const rest = content.slice(idx + META_PREFIX.length)
  const end = rest.lastIndexOf(']')
  if (end === -1) return null
  try {
    return JSON.parse(rest.slice(0, end)) as DivineLookupMeta
  } catch {
    return null
  }
}

export function formatFanLookupHint(meta: DivineLookupMeta | null | undefined): string | null {
  if (!meta) return null
  const q = meta.heard_query ? `"${meta.heard_query}"` : 'your request'
  switch (meta.resolved) {
    case 'browse':
      return 'Listing recent conversations (fan id, username, or chat name).'
    case 'exact':
      return `Matched ${q} — opening that chat.`
    case 'fuzzy_confirm_required':
      return `Close match for ${q} — confirm with the creator before opening (say the correct fan or fan id).`
    case 'fuzzy_ambiguous':
      return `Several possible matches for ${q} — ask which fan (1–3) or give fan id.`
    case 'multi_match_confirm_required':
      return `Multiple chats match ${q} — list options and ask which fan id to open.`
    case 'no_match':
      return `No fan found for ${q} — ask them to re-say or retype the exact username.`
    default:
      return `Looking up fan id, username, or chat name for ${q}.`
  }
}

export function buildDedupeKey(heard: string, candidates: DivineLookupCandidate[]): string {
  const ids = candidates
    .map((c) => c.fanId)
    .sort()
    .join(',')
  return `${heard.trim().toLowerCase()}::${ids}`
}
