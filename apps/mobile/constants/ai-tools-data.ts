/**
 * Mirror of web `lib/ai-tools-data.ts` for mobile AI Studio.
 */
export type AIToolCategory = 'content' | 'engagement' | 'analytics' | 'protection' | 'premium'

export interface AIToolMeta {
  id: string
  name: string
  description: string
  longDescription: string
  category: AIToolCategory
  badge?: string
  isPro?: boolean
  credits?: number
  hasRunner?: boolean
}

export const ALL_TOOLS_META: AIToolMeta[] = [
  { id: 'caption-generator', name: 'Caption Generator', description: 'AI-powered captions for any content', longDescription: '', category: 'content', badge: 'Popular', credits: 1, hasRunner: true },
  { id: 'fantasy-writer', name: 'Fantasy Writer', description: 'Roleplay and story generator', longDescription: '', category: 'content', badge: 'Popular', credits: 2, hasRunner: true },
  { id: 'content-ideas', name: 'Content Ideas', description: 'Trending content suggestions', longDescription: '', category: 'content', credits: 1, hasRunner: true },
  { id: 'aesthetic-matcher', name: 'Aesthetic Matcher', description: 'Match trending visual styles', longDescription: '', category: 'content', credits: 1, hasRunner: true },
  { id: 'photo-enhancer', name: 'Safe photo touch-up', description: 'Blur, lighting, emoji on photos only', longDescription: '', category: 'content', credits: 1, hasRunner: false },
  { id: 'ai-chatter', name: 'AI Chatter', description: 'Fan messaging automation', longDescription: '', category: 'engagement', credits: 1, hasRunner: false },
  { id: 'mood-detector', name: 'Mood Detector', description: 'Analyze fan emotional state', longDescription: '', category: 'engagement', badge: 'New', credits: 1, hasRunner: true },
  { id: 'gift-suggester', name: 'Gift Suggester', description: 'Personalized gift recommendations', longDescription: '', category: 'engagement', credits: 1, hasRunner: true },
  { id: 'whale-whisperer', name: 'Whale Whisperer', description: 'High-value fan engagement', longDescription: '', category: 'engagement', credits: 2, hasRunner: true },
  { id: 'price-optimizer', name: 'Price Optimizer', description: 'Optimal pricing suggestions', longDescription: '', category: 'analytics', credits: 2, hasRunner: true },
  { id: 'dm-bundle-pricing', name: 'DM Bundle Pricing', description: 'PPV / paid DM bundle price and copy', longDescription: '', category: 'engagement', credits: 1, hasRunner: true },
  { id: 'viral-predictor', name: 'Viral Predictor', description: 'Content success prediction', longDescription: '', category: 'analytics', badge: 'Beta', credits: 2, hasRunner: true },
  { id: 'churn-predictor', name: 'Churn Predictor', description: 'Retention from CRM + thread context', longDescription: '', category: 'analytics', credits: 2, hasRunner: true },
  { id: 'leak-scanner', name: 'Leak Scanner', description: 'Content leak detection', longDescription: '', category: 'protection', credits: 3, hasRunner: false },
  { id: 'dmca-automator', name: 'DMCA Automator', description: 'Automated takedown requests', longDescription: '', category: 'protection', credits: 2, hasRunner: false },
  { id: 'voice-cloning', name: 'Voice Cloning', description: 'Clone your voice for responses', longDescription: '', category: 'premium', isPro: true, credits: 5, hasRunner: true },
  { id: 'video-script-ai', name: 'Video Script AI', description: 'Generate video scripts', longDescription: '', category: 'premium', isPro: true, credits: 3, hasRunner: false },
  { id: 'competitor-analysis', name: 'Competitor Analysis', description: 'AI-powered competitor insights', longDescription: '', category: 'premium', isPro: true, credits: 5, hasRunner: false },
  { id: 'circe-oracle', name: "Circe's Oracle", description: 'Deep retention prophecies', longDescription: '', category: 'premium', isPro: true, badge: 'Circe Pro', credits: 4, hasRunner: true },
  { id: 'circe-transformation', name: "Circe's Transformation", description: 'Transform casual fans into whales', longDescription: '', category: 'premium', isPro: true, badge: 'Circe Pro', credits: 4, hasRunner: true },
  { id: 'circe-protection-shield', name: "Circe's Aegis", description: 'Ultimate content protection', longDescription: '', category: 'premium', isPro: true, badge: 'Circe Pro', credits: 6, hasRunner: false },
  { id: 'venus-attraction', name: "Venus's Allure", description: 'Magnetic content optimization', longDescription: '', category: 'premium', isPro: true, badge: 'Venus Pro', credits: 4, hasRunner: true },
  { id: 'venus-cupid', name: "Cupid's Arrow", description: 'Target perfect new fans', longDescription: '', category: 'premium', isPro: true, badge: 'Venus Pro', credits: 5, hasRunner: true },
  { id: 'venus-garden', name: "Venus's Garden", description: 'Cultivate fan relationships', longDescription: '', category: 'premium', isPro: true, badge: 'Venus Pro', credits: 4, hasRunner: true },
  { id: 'divine-forecast', name: 'Divine Forecast', description: 'Revenue and growth predictions', longDescription: '', category: 'premium', isPro: true, badge: 'Agency', credits: 8, hasRunner: true },
  { id: 'standard-of-attraction', name: 'Standard of Attraction', description: 'Pro rating of commercial attractiveness', longDescription: '', category: 'premium', isPro: true, badge: 'Pro', credits: 3, hasRunner: true },
]

export const TOOL_IDS_WITH_RUNNER = new Set(ALL_TOOLS_META.filter((t) => t.hasRunner).map((t) => t.id))

export function getToolMeta(id: string): AIToolMeta | undefined {
  return ALL_TOOLS_META.find((t) => t.id === id)
}
