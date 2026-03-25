/**
 * OnlyFans CDN assets often use CloudFront signed URLs with an IP condition. Our
 * `/api/proxy/image` handler fetches from the server IP, so the signature does not match
 * and the CDN returns 403. For those URLs, return the original URL so the browser loads
 * them with the viewer's IP. Unsigned OF URLs can still be proxied for hotlink/referrer cases.
 */
export function proxyImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined

  const isOnlyFansHost =
    url.includes('onlyfans.com') ||
    url.includes('cdn2.onlyfans.com') ||
    url.includes('cdn3.onlyfans.com')

  if (!isOnlyFansHost) return url

  const q = url.toLowerCase()
  const isCloudFrontSigned =
    q.includes('signature=') || q.includes('policy=') || q.includes('key-pair-id=')

  if (isCloudFrontSigned) return url

  return `/api/proxy/image?url=${encodeURIComponent(url)}`
}
