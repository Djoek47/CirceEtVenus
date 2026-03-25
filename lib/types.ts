// Database Types for CREATRIX Platform

export type Platform = 'onlyfans' | 'fansly' | 'manyvids' | 'mym' | 'loyalfans'
export type FanTier = 'whale' | 'regular' | 'new' | 'inactive'
export type ContentStatus = 'draft' | 'scheduled' | 'published' | 'archived'
export type ConversationStatus = 'active' | 'pending' | 'archived'
export type LeakSeverity = 'critical' | 'high' | 'medium' | 'low'
export type MentionSentiment = 'positive' | 'neutral' | 'negative'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  timezone: string
  notification_preferences: NotificationPreferences
  encrypted_birthday: string | null
  birthday_passphrase_hash: string | null
  has_birthday_set: boolean
  /** Prior platform handles for leak search (rebrands) */
  former_usernames?: string[] | null
  /** Manual content title hints for leak search */
  leak_search_title_hints?: string[] | null
  created_at: string
  updated_at: string
}

export interface NotificationPreferences {
  email_notifications: boolean
  leak_alerts: boolean
  reputation_alerts: boolean
  daily_digest: boolean
}

export interface Fan {
  id: string
  user_id: string
  platform: Platform
  platform_username: string
  display_name: string | null
  avatar_url: string | null
  tier: FanTier
  total_spent: number
  subscription_start: string | null
  last_interaction: string | null
  notes: string | null
  tags: string[]
  is_favorite: boolean
  is_blocked: boolean
  created_at: string
  updated_at: string
}

export interface Content {
  id: string
  user_id: string
  title: string
  description: string | null
  media_urls: string[]
  platforms: Platform[]
  status: ContentStatus
  scheduled_at: string | null
  published_at: string | null
  performance_metrics: PerformanceMetrics
  tags: string[]
  created_at: string
  updated_at: string
}

export interface PerformanceMetrics {
  views: number
  likes: number
  comments: number
  shares: number
  revenue: number
}

export interface Conversation {
  id: string
  user_id: string
  fan_id: string
  platform: Platform
  status: ConversationStatus
  last_message_at: string | null
  unread_count: number
  created_at: string
  updated_at: string
  fan?: Fan
}

export interface Message {
  id: string
  conversation_id: string
  sender_type: 'creator' | 'fan'
  content: string
  media_urls: string[]
  is_ppv: boolean
  ppv_price: number | null
  is_read: boolean
  sent_at: string
}

export interface LeakAlert {
  id: string
  user_id: string
  source_url: string
  source_platform: string
  matched_content_id: string | null
  severity: LeakSeverity
  status: 'detected' | 'reviewing' | 'resolved' | 'false_positive'
  detected_at: string
  resolved_at: string | null
  notes: string | null
}

export type ReputationScanChannel = 'web_wide' | 'social'
export type AiReputationImpact = 'harmful' | 'helpful' | 'neutral'
export type AiRecommendedReputationAction = 'reply' | 'report' | 'monitor' | 'ignore'

export interface ReputationMention {
  id: string
  user_id: string
  // Source platform/host where the mention was found (e.g. twitter, reddit)
  platform: string
  // Canonical URL for the mention
  source_url: string
  title?: string | null
  content_preview: string
  sentiment: MentionSentiment
  author: string | null
  detected_at: string
  is_reviewed: boolean
  /** Serper pass: wide web vs social-focused */
  scan_channel?: ReputationScanChannel | null
  // Optional AI enrichment fields (filled by Grok for Pro users)
  ai_category?: string | null
  ai_rationale?: string | null
  ai_suggested_reply?: string | null
  ai_reputation_impact?: AiReputationImpact | null
  ai_recommended_action?: AiRecommendedReputationAction | null
}

export interface AnalyticsSnapshot {
  id: string
  user_id: string
  date: string
  platform: string
  total_fans: number
  revenue: number
  messages_received: number
  messages_sent: number
  new_fans: number
  churned_fans: number
  avg_response_time_minutes: number
  top_content_id: string | null
  created_at: string
}

// Dashboard Stats
export interface DashboardStats {
  totalRevenue: number
  revenueChange: number | null
  totalFans: number
  fansChange: number | null
  activeConversations: number
  conversationsChange: number | null
  scheduledContent: number
  contentChange: number | null
  leakAlerts: number
  mentionsToReview: number
  hasConnectedPlatforms: boolean
}

// Chart Data Types
export interface RevenueChartData {
  date: string
  onlyfans: number
  mym: number
  fansly: number
}

export interface FanGrowthData {
  date: string
  newFans: number
  churned: number
  net: number
}
