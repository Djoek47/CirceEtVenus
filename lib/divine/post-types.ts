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
  /** Optional OnlyFans post labels (labelIds). */
  labelIds?: (string | number)[]
  /** Optional OnlyFans expireDays (1,3,7,30). */
  expireDays?: 1 | 3 | 7 | 30
  /** Save for later instead of publishing immediately. */
  saveForLater?: boolean
  /** Fundraising target amount for fundraising posts. */
  fundRaisingTargetAmount?: number
  /** Tip presets for fundraising posts. */
  fundRaisingTipsPresets?: number[]
  /** Optional voting configuration for polls/quizzes. */
  votingType?: 'poll' | 'quiz'
  votingOptions?: string[]
  votingDue?: 1 | 3 | 7 | 30
  votingCorrectIndex?: number
}

