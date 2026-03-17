export interface DivineMessagePayload {
  /** Core message text */
  text: string
  /** Optional OnlyFans/Fansly media IDs */
  mediaIds?: (string | number)[]
  /**
   * Optional preview media IDs (OnlyFans).
   * Every preview must also be present in mediaIds, per OnlyFans docs.
   */
  previews?: (string | number)[]
  /** Optional PPV price. If set, at least one mediaIds entry is required. */
  price?: number
  /** Optional creator tags (OnlyFans rfTag) */
  rfTag?: (string | number)[]
}

