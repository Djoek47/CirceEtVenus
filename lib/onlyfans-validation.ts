export function validateOnlyFansPost(params: {
  text?: string
  mediaIds?: unknown[]
  scheduledDate?: string
  expireDays?: number
  saveForLater?: boolean
}): string | null {
  const hasText = typeof params.text === 'string' && params.text.trim().length > 0
  const hasMedia = Array.isArray(params.mediaIds) && params.mediaIds.length > 0
  if (!hasText && !hasMedia) {
    return 'Post text or media required.'
  }
  if (params.expireDays && ![1, 3, 7, 30].includes(params.expireDays)) {
    return 'expireDays must be 1, 3, 7, or 30.'
  }
  if (params.scheduledDate && Number.isNaN(Date.parse(params.scheduledDate))) {
    return 'scheduledDate must be a valid ISO date-time string.'
  }
  return null
}

export function validateOnlyFansMessage(params: {
  text?: string
  mediaIds?: (string | number)[]
  previews?: (string | number)[]
  price?: number
}): string | null {
  const trimmed = params.text?.trim() ?? ''
  const hasText = trimmed.length > 0
  const hasMedia = Array.isArray(params.mediaIds) && params.mediaIds.length > 0

  if (!hasText && !hasMedia) {
    return 'Message text or media required.'
  }

  if (typeof params.price === 'number' && params.price > 0 && !hasMedia) {
    return 'Paid messages must include at least one media file.'
  }

  if (Array.isArray(params.previews) && params.previews.length > 0 && hasMedia) {
    const mediaSet = new Set(params.mediaIds!.map((m) => String(m)))
    const invalid = params.previews.find((p) => !mediaSet.has(String(p)))
    if (invalid !== undefined) {
      return 'Preview media must also be included in media files.'
    }
  }

  return null
}

