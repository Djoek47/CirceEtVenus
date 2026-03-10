/**
 * Strips HTML tags from text while preserving emojis and converting
 * common HTML elements to their text equivalents
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  
  let text = html
  
  // Convert <br> and <br /> to newlines
  text = text.replace(/<br\s*\/?>/gi, '\n')
  
  // Convert </p> to double newline (paragraph break)
  text = text.replace(/<\/p>/gi, '\n\n')
  
  // Extract href from anchor tags and append URL
  text = text.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '')
  
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ')
  text = text.replace(/&amp;/g, '&')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&quot;/g, '"')
  text = text.replace(/&#39;/g, "'")
  text = text.replace(/&apos;/g, "'")
  
  // Decode numeric HTML entities (like &#128139; for emojis)
  text = text.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  
  // Clean up extra whitespace but preserve intentional line breaks
  text = text.replace(/[ \t]+/g, ' ')
  text = text.replace(/\n{3,}/g, '\n\n')
  text = text.trim()
  
  return text
}

/**
 * Strips HTML for preview purposes (single line, truncated)
 */
export function stripHtmlForPreview(html: string | null | undefined, maxLength: number = 100): string {
  const text = stripHtml(html)
  // Replace all newlines with spaces for preview
  const singleLine = text.replace(/\n+/g, ' ').trim()
  if (singleLine.length <= maxLength) return singleLine
  return singleLine.slice(0, maxLength).trim() + '...'
}
