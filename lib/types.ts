// Database Types for CREATRIX Platform

export type Platform = 'onlyfans' | 'fansly' | 'manyvids' | 'mym' | 'chaturbate' | 'stripchat' | 'loyalfans' | 'pornhub' | 'instagram' | 'tiktok' | 'twitter'
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

export interface ReputationMention {
  id: string
  user_id: string
  platform: string
  url: string
  content_snippet: string
  sentiment: MentionSentiment
  author: string | null
  detected_at: string
  is_reviewed: boolean
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
  revenueChange: number
  totalFans: number
  fansChange: number
  activeConversations: number
  conversationsChange: number
  scheduledContent: number
  contentChange: number
  leakAlerts: number
  mentionsToReview: number
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
