import type { ReputationMention } from '@/lib/types'

export type ReputationScore = {
  overallScore: number
  sentiment: 'positive' | 'neutral' | 'negative'
  positiveCount: number
  neutralCount: number
  negativeCount: number
}

export function computeReputationScore(mentions: ReputationMention[]): ReputationScore {
  if (!mentions.length) {
    return { overallScore: 50, sentiment: 'neutral', positiveCount: 0, neutralCount: 0, negativeCount: 0 }
  }

  let positive = 0
  let neutral = 0
  let negative = 0

  for (const m of mentions) {
    if (m.sentiment === 'positive') positive++
    else if (m.sentiment === 'negative') negative++
    else neutral++
  }

  const total = positive + neutral + negative
  const scoreRaw = (positive * 1 + neutral * 0.5 + negative * 0) / Math.max(total, 1)
  const overallScore = Math.round(scoreRaw * 100)

  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
  if (overallScore >= 66) sentiment = 'positive'
  else if (overallScore <= 33) sentiment = 'negative'

  return {
    overallScore,
    sentiment,
    positiveCount: positive,
    neutralCount: neutral,
    negativeCount: negative,
  }
}

