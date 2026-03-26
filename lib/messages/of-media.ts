import { proxyImageUrl } from '@/lib/proxy-image-url'

/** Raw media item from OnlyFans chat API (nested files or legacy url/preview). */
export type RawOnlyFansMedia = {
  id?: number | string
  type?: 'photo' | 'video' | string
  canView?: boolean
  files?: {
    full?: { url?: string | null }
    thumb?: { url?: string | null }
    preview?: { url?: string | null }
    squarePreview?: { url?: string | null }
  }
  url?: string
  preview?: string
}

export type ProxiedMediaPresentation = {
  kind: 'photo' | 'video'
  /** First URL to try (best quality for photos). */
  displaySrc: string | undefined
  /** Second URL if display fails (e.g. thumb after full). */
  altSrc: string | undefined
  poster: string | undefined
}

/**
 * Prefer full-size image URL first; fall back to thumb/preview on load error.
 * Videos use full URL for src and thumb/preview for poster.
 */
export function getProxiedMediaPresentation(m: RawOnlyFansMedia): ProxiedMediaPresentation {
  const full = m.files?.full?.url || m.url || undefined
  const thumb =
    m.files?.thumb?.url ||
    m.files?.squarePreview?.url ||
    m.files?.preview?.url ||
    m.preview ||
    undefined
  const isVideo = m.type === 'video'

  if (isVideo) {
    return {
      kind: 'video',
      displaySrc: proxyImageUrl(full || thumb),
      altSrc: proxyImageUrl(thumb && thumb !== full ? thumb : undefined),
      poster: proxyImageUrl(thumb || m.preview),
    }
  }

  const primary = full || thumb
  const secondary = full && thumb && full !== thumb ? thumb : undefined
  return {
    kind: 'photo',
    displaySrc: proxyImageUrl(primary),
    altSrc: proxyImageUrl(secondary),
    poster: undefined,
  }
}

export function isVideoMedia(m: RawOnlyFansMedia): boolean {
  return m.type === 'video'
}
