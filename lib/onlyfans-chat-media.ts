/**
 * OnlyFans chat media rules (OnlyFansAPI):
 * - Messages must use mediaFiles[] with IDs from POST .../media/upload (e.g. ofapi_media_*).
 * - You cannot pass cdn2.onlyfans.com URLs as media; upload first (file or fetchable file_url).
 * - Each prefixed_id is typically single-use per message.
 */

export function validateChatMediaIdsForSend(mediaIds: unknown): string | null {
  if (!Array.isArray(mediaIds) || mediaIds.length === 0) return null
  for (const m of mediaIds) {
    const s = String(m).trim()
    if (!s) continue
    if (/^https?:\/\//i.test(s)) {
      return (
        'Chat media must be upload IDs from /api/onlyfans/media/upload (e.g. ofapi_media_…), not HTTP(S) URLs. ' +
        'Upload the image first, then send using the returned id. Signed OnlyFans CDN URLs cannot be used as file_url.'
      )
    }
    if (/cdn\d*\.onlyfans\.com/i.test(s) || /onlyfans\.com\/files\//i.test(s)) {
      return (
        'Do not use OnlyFans CDN or page URLs as media IDs. Upload via /api/onlyfans/media/upload, then use the returned id in mediaIds.'
      )
    }
  }
  return null
}
