export type NicheKey =
  | 'nude'
  | 'domination'
  | 'submissive'
  | 'foot'
  | 'findom'
  | 'gfe'
  | 'cosplay'
  | 'fetish_other'
  | 'sfw_only'
  | 'no_sex'

export const NICHE_LABELS: Record<NicheKey, string> = {
  nude: 'Nude / Glamour',
  domination: 'Domination',
  submissive: 'Submissive / Brat',
  foot: 'Foot / Worship',
  findom: 'Findom',
  gfe: 'GFE / Romance',
  cosplay: 'Cosplay',
  fetish_other: 'Other Fetish',
  sfw_only: 'SFW Only',
  no_sex: 'No explicit sex',
}

export const BOUNDARY_NICHES: NicheKey[] = ['sfw_only', 'no_sex']

export function isBoundaryNiche(niche: string): niche is NicheKey {
  return BOUNDARY_NICHES.includes(niche as NicheKey)
}

export function isAllowedNiche(niche: string): niche is NicheKey {
  return (Object.keys(NICHE_LABELS) as NicheKey[]).includes(niche as NicheKey)
}

