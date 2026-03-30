/**
 * @deprecated Use POST /api/messages/mass/segments — canonical mass-segment AI.
 * Kept as a stable alias for older clients or bookmarks.
 */
import { POST as canonicalPost } from '@/app/api/messages/mass/segments/route'

export const maxDuration = 60

export const POST = canonicalPost
