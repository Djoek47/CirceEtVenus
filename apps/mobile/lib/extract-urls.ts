/** Extract http(s) URLs from arbitrary text (mentions, snippets, etc.). */
export function extractHttpUrls(text: string): string[] {
  const re = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of text.matchAll(re)) {
    const u = m[0].replace(/[),.;]+$/, '')
    if (!seen.has(u)) {
      seen.add(u)
      out.push(u)
    }
  }
  return out
}
