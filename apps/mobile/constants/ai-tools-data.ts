/**
 * Kept in sync with `lib/ai-tools-data.ts` — single source for AI Studio grid + tool runner.
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
  { id: 'caption-generator', name: 'Caption Generator', description: 'AI-powered captions for any content', longDescription: 'Generate engaging, platform-optimized captions with hashtags, emojis, and calls-to-action tailored to your audience.', category: 'content', badge: 'Popular', credits: 1, hasRunner: true },
  { id: 'fantasy-writer', name: 'Fantasy Writer', description: 'Roleplay and story generator', longDescription: 'Create immersive roleplay scenarios, fantasy stories, and personalized narratives that captivate your audience.', category: 'content', badge: 'Popular', credits: 2, hasRunner: true },
  { id: 'content-ideas', name: 'Content Ideas', description: 'Trending content suggestions', longDescription: 'Get AI-powered content ideas based on trending topics, your niche, and what performs best for similar creators.', category: 'content', credits: 1, hasRunner: true },
  { id: 'aesthetic-matcher', name: 'Aesthetic Matcher', description: 'Match trending visual styles', longDescription: 'Analyze your content aesthetic and get recommendations to align with trending styles while maintaining your unique brand.', category: 'content', credits: 1, hasRunner: true },
  { id: 'photo-enhancer', name: 'Safe photo touch-up', description: 'Blur, lighting, emoji on photos only', longDescription: 'Apply blur, gentle lighting tweaks, or emoji overlays to photos. Runs from AI Studio → Media & Vault when you open an item. No beautify, inpaint, or video.', category: 'content', credits: 1, hasRunner: false },
  { id: 'ai-chatter', name: 'AI Chatter', description: 'Fan messaging automation', longDescription: 'Use Messages and Divine Manager for real conversations; automated chatter flows ship through those surfaces.', category: 'engagement', credits: 1, hasRunner: false },
  { id: 'mood-detector', name: 'Mood Detector', description: 'Analyze fan emotional state', longDescription: 'Understand your fans better by analyzing message sentiment to tailor your responses and content.', category: 'engagement', badge: 'New', credits: 1, hasRunner: true },
  { id: 'gift-suggester', name: 'Gift Suggester', description: 'Personalized gift recommendations', longDescription: 'Suggest personalized gifts and rewards for your top fans based on their engagement patterns and preferences.', category: 'engagement', credits: 1, hasRunner: true },
  { id: 'whale-whisperer', name: 'Whale Whisperer', description: 'High-value fan engagement', longDescription: 'Specialized AI assistance for engaging with your highest-spending fans to maximize retention and tips.', category: 'engagement', credits: 2, hasRunner: true },
  { id: 'price-optimizer', name: 'Price Optimizer', description: 'Optimal pricing suggestions', longDescription: 'AI analyzes your engagement data to suggest optimal pricing for subscriptions, PPV, and custom content.', category: 'analytics', credits: 2, hasRunner: true },
  { id: 'dm-bundle-pricing', name: 'DM Bundle Pricing', description: 'PPV / paid DM bundle price and copy', longDescription: 'Used by Divine Manager to suggest bundle pricing and fan-facing teaser copy from your goal, fan context, and vault summary.', category: 'engagement', credits: 1, hasRunner: true },
  { id: 'viral-predictor', name: 'Viral Predictor', description: 'Content success prediction', longDescription: 'Predict which content is most likely to go viral before you post, based on trending patterns and your audience.', category: 'analytics', badge: 'Beta', credits: 2, hasRunner: true },
  { id: 'churn-predictor', name: 'Churn Predictor', description: 'Retention from CRM + thread context', longDescription: 'Uses spend level, subscription status, optional thread snapshot, and your notes to score churn risk and suggest treats, timing, and win-back copy.', category: 'analytics', credits: 2, hasRunner: true },
  { id: 'leak-scanner', name: 'Leak Scanner', description: 'Content leak detection', longDescription: 'Circe continuously scans the web to find unauthorized copies of your content for DMCA takedown.', category: 'protection', credits: 3, hasRunner: false },
  { id: 'dmca-automator', name: 'DMCA Automator', description: 'Automated takedown requests', longDescription: 'Automatically generate and submit DMCA takedown requests when leaked content is detected.', category: 'protection', credits: 2, hasRunner: false },
  { id: 'voice-cloning', name: 'Voice Cloning', description: 'Clone your voice for responses', longDescription: 'Create an AI clone of your voice to send personalized audio messages at scale.', category: 'premium', isPro: true, credits: 5, hasRunner: true },
  { id: 'video-script-ai', name: 'Video Script AI', description: 'Generate video scripts', longDescription: 'Create engaging video scripts tailored to your style, including intros, outros, and calls-to-action.', category: 'premium', isPro: true, credits: 3, hasRunner: false },
  { id: 'competitor-analysis', name: 'Competitor Analysis', description: 'AI-powered competitor insights', longDescription: 'Analyze competitor strategies, pricing, and content to stay ahead of the competition.', category: 'premium', isPro: true, credits: 5, hasRunner: false },
  { id: 'circe-oracle', name: "Circe's Oracle", description: 'Deep retention prophecies', longDescription: 'Like the enchantress who foresaw the future, receive prophetic insights on subscriber behavior and loyalty patterns.', category: 'premium', isPro: true, badge: 'Circe Pro', credits: 4, hasRunner: true },
  { id: 'circe-transformation', name: "Circe's Transformation", description: 'Transform casual fans into whales', longDescription: 'Just as Circe transformed men, this AI identifies and nurtures casual fans with potential to become high-value supporters.', category: 'premium', isPro: true, badge: 'Circe Pro', credits: 4, hasRunner: true },
  { id: 'circe-protection-shield', name: "Circe's Aegis", description: 'Ultimate content protection', longDescription: 'Like the divine protection Circe offered heroes, this shield provides enterprise-grade content monitoring across all platforms.', category: 'premium', isPro: true, badge: 'Circe Pro', credits: 6, hasRunner: false },
  { id: 'venus-attraction', name: "Venus's Allure", description: 'Magnetic content optimization', longDescription: 'Channel the goddess of beauty to optimize your content for maximum attraction and new subscriber conversion.', category: 'premium', isPro: true, badge: 'Venus Pro', credits: 4, hasRunner: true },
  { id: 'venus-cupid', name: "Cupid's Arrow", description: 'Target perfect new fans', longDescription: "Like Venus's son Cupid, this AI identifies and targets potential fans most likely to fall in love with your content.", category: 'premium', isPro: true, badge: 'Venus Pro', credits: 5, hasRunner: true },
  { id: 'venus-garden', name: "Venus's Garden", description: 'Cultivate fan relationships', longDescription: 'Nurture your fan community like a divine garden, with AI-powered relationship management and engagement strategies.', category: 'premium', isPro: true, badge: 'Venus Pro', credits: 4, hasRunner: true },
  { id: 'divine-forecast', name: 'Divine Forecast', description: 'Revenue and growth predictions', longDescription: 'Receive divine prophecies about your revenue trajectory, growth potential, and optimal business decisions.', category: 'premium', isPro: true, badge: 'Agency', credits: 8, hasRunner: true },
  { id: 'standard-of-attraction', name: 'Standard of Attraction', description: 'Pro rating of how commercially attractive your content is', longDescription: 'Let Venus and Circe rate how commercially attractive your latest photos and videos are—through their eyes—before you post.', category: 'premium', isPro: true, badge: 'Pro', credits: 3, hasRunner: true },
]

export const TOOL_IDS_WITH_RUNNER = new Set(ALL_TOOLS_META.filter((t) => t.hasRunner).map((t) => t.id))

export function getToolMeta(id: string): AIToolMeta | undefined {
  return ALL_TOOLS_META.find((t) => t.id === id)
}
