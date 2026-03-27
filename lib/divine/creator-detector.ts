/**
 * Lightweight creator-likelihood heuristic for fan profile UI only (not chat/composer).
 */

export type CreatorDetectorSignal = {
  is_creator_likely: boolean
  /** 0–1 heuristic score from keyword matches */
  confidence: number
  rationale_snippets: string[]
}

const SIGNALS: Array<{ re: RegExp; w: number; note: string }> = [
  { re: /\bonlyfans\b/i, w: 0.22, note: 'Mentions OnlyFans' },
  { re: /\bfansly\b/i, w: 0.2, note: 'Mentions Fansly' },
  { re: /\bcontent creator\b/i, w: 0.18, note: 'Says "content creator"' },
  { re: /\bmy (?:of|fansly|page|subs|subscribers)\b/i, w: 0.2, note: 'Creator-style ownership language' },
  { re: /\b(?:instagram|tiktok|twitter|x\.com)\b.*\b(?:promo|link|follow)\b/i, w: 0.12, note: 'Cross-promo language' },
  { re: /\b(?:shoot|filming|collab|collaboration)\b/i, w: 0.1, note: 'Production / collab terms' },
  { re: /\b(?:ppv|tip menu|custom(?:s)?)\b/i, w: 0.15, note: 'Monetization jargon' },
]

/**
 * Score free text (username, summaries, thread excerpt) for creator-like language.
 */
export function detectCreatorLikelyFromText(haystack: string): CreatorDetectorSignal {
  const text = (haystack || '').slice(0, 50_000)
  let score = 0
  const rationale_snippets: string[] = []
  for (const s of SIGNALS) {
    if (s.re.test(text)) {
      score += s.w
      if (rationale_snippets.length < 6) rationale_snippets.push(s.note)
    }
  }
  const confidence = Math.min(1, score)
  const is_creator_likely = confidence >= 0.35
  return { is_creator_likely, confidence, rationale_snippets }
}
