/**
 * OnlyFans chat media rules (OnlyFansAPI):
 * - Messages must use mediaFiles[] with IDs from POST .../media/upload (e.g. ofapi_media_*).
 * - Do not pass raw CDN strings as chat `mediaIds`. Upload via /api/onlyfans/media/upload
 *   (multipart, public file_url, or OnlyFans CDN file_url — server uses media/download + upload).
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
        'POST the file or file_url to upload first, then use the returned id in mediaIds.'
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
