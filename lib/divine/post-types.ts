export interface DivinePostDraft {
  /** Caption or body text for the post. */
  text: string
  /** Target platforms, e.g. ['onlyfans', 'fansly'] */
  platforms: string[]
  /** Optional array of OnlyFans/Fansly media IDs already uploaded. */
  mediaIds?: string[]
  /** Optional raw media URLs (used when IDs are not yet known). */
  mediaUrls?: string[]
  /** Content kind so we can extend behavior later. */
  contentType?: 'image' | 'video' | 'text'
  /** Optional PPV pricing fields (OnlyFans). */
  price?: number
  previewMediaCount?: number
  isLockedText?: boolean
  /** Optional ISO schedule date for future publishing. */
  scheduledFor?: string
  /** Optional link to a saved content record. */
  contentId?: string
}

