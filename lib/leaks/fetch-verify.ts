/**
 * Optional HTTP fetch of a page to verify creator aliases appear in HTML.
 * Best-effort: many hosts block bots; failures return false (caller may skip or keep URL).
 */
export async function pageLikelyMentionsAliases(
  url: string,
  aliases: string[],
  opts?: { timeoutMs?: number; maxBytes?: number },
): Promise<boolean> {
  const timeoutMs = opts?.timeoutMs ?? 8000
  const maxBytes = opts?.maxBytes ?? 120_000
  const needles = aliases
    .map((a) => a.replace(/^@/, '').trim().toLowerCase())
    .filter((s) => s.length >= 2)
  if (needles.length === 0) return true

  const ac = new AbortController()
  const t = setTimeout(() => ac.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ac.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
    })
    if (!res.ok) return false
    const buf = await res.arrayBuffer()
    const slice = buf.byteLength > maxBytes ? buf.slice(0, maxBytes) : buf
    const text = new TextDecoder('utf-8', { fatal: false }).decode(slice)
    const lower = stripTags(text).toLowerCase()
    return needles.some((n) => lower.includes(n))
  } catch {
    return false
  } finally {
    clearTimeout(t)
  }
}

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
}
