/**
 * OnlyFans CDN assets often use CloudFront signed URLs with an IP condition. Our
 * `/api/proxy/image` handler fetches from the server IP, so the signature does not match
 * and the CDN returns 403. For those URLs, return the original URL so the browser loads
 * them with the viewer's IP. Unsigned OF URLs can still be proxied for hotlink/referrer cases.
 * Fansly media is proxied similarly when unsigned (hotlink/referrer).
 */
function isCloudFrontSigned(url: string): boolean {
  const q = url.toLowerCase()
  return q.includes('signature=') || q.includes('policy=') || q.includes('key-pair-id=')
}

export function proxyImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined

  const isOnlyFansHost =
    url.includes('onlyfans.com') ||
    url.includes('cdn2.onlyfans.com') ||
    url.includes('cdn3.onlyfans.com')

  const lower = url.toLowerCase()
  const isFanslyHost =
    lower.includes('fansly.com') ||
    lower.includes('cdn.fansly.com') ||
    lower.includes('media.fansly.com') ||
    lower.includes('thumbs.fansly.com')

  if (!isOnlyFansHost && !isFanslyHost) return url

  if (isCloudFrontSigned(url)) return url

  return `/api/proxy/image?url=${encodeURIComponent(url)}`
}
