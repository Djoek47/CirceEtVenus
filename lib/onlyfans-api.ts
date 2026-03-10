/**
 * OnlyFans API Client
 * Integrates with OnlyFansAPI.com for secure access to OnlyFans data
 * Documentation: https://docs.onlyfansapi.com
 * Base URL: https://app.onlyfansapi.com/api
 */

const ONLYFANS_API_BASE = 'https://app.onlyfansapi.com/api'

interface OnlyFansAPIOptions {
  accountId?: string
}

interface Fan {
  id: string
  username: string
  name: string
  avatar: string
  subscribedAt: string
  expiresAt: string
  renewsOn: string | null
  totalSpent: number
  subscriptionPrice: number
  isRenewOn: boolean
  hasMessages: boolean
  lists: string[]
}

interface Message {
  id: string
  fromUser: {
    id: string
    username: string
    name: string
    avatar: string
  }
  text: string
  createdAt: string
  isRead: boolean
  media: {
    id: string
    type: 'photo' | 'video'
    url: string
    preview: string
  }[]
  price: number | null
  isPaid: boolean
}

interface Earnings {
  total: number
  subscriptions: number
  tips: number
  messages: number
  posts: number
  streams: number
  referrals: number
  period: {
    start: string
    end: string
  }
}

interface Stats {
  fans: {
    total: number
    active: number
    expired: number
    new: number
  }
  earnings: {
    today: number
    thisWeek: number
    thisMonth: number
    total: number
  }
  content: {
    posts: number
    photos: number
    videos: number
  }
}

class OnlyFansAPI {
  private apiKey: string
  private accountId: string | null = null

  constructor(apiKey: string, options?: OnlyFansAPIOptions) {
    this.apiKey = apiKey
    this.accountId = options?.accountId || null
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    if (this.accountId) {
      headers['X-Account-ID'] = this.accountId
    }

    const response = await fetch(`${ONLYFANS_API_BASE}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.message || `API error: ${response.status}`)
    }

    return response.json()
  }

  // Set the account ID for subsequent requests
  setAccountId(accountId: string) {
    this.accountId = accountId
  }

  // ============ AUTHENTICATION ============

  /**
   * Start authentication process for an OnlyFans account
   * Returns a polling URL to check authentication status
   */
  async startAuthentication(email: string, password: string, proxyCountry?: string): Promise<{ 
    message: string
    polling_url: string
    auth_id: string 
  }> {
    return this.request('/authenticate', {
      method: 'POST',
      body: JSON.stringify({ 
        email, 
        password,
        proxyCountry: proxyCountry || 'us'
      }),
    })
  }

  /**
   * Poll authentication status
   */
  async pollAuthStatus(authId: string): Promise<{
    status: 'pending' | 'requires_2fa' | 'requires_face_otp' | 'completed' | 'failed'
    account_id?: string
    message?: string
  }> {
    return this.request(`/authenticate/${authId}`)
  }

  /**
   * Submit 2FA code
   */
  async submit2FA(authId: string, code: string): Promise<{
    status: string
    account_id?: string
  }> {
    return this.request(`/authenticate/${authId}`, {
      method: 'PUT',
      body: JSON.stringify({ code }),
    })
  }

  /**
   * Create a client session for embedded auth (recommended approach)
   */
  async createClientSession(displayName: string, proxyCountry?: string): Promise<{
    token: string
    display_name: string
  }> {
    return this.request('/client-sessions', {
      method: 'POST',
      body: JSON.stringify({
        display_name: displayName,
        proxyCountry: proxyCountry || 'us'
      }),
    })
  }

  // ============ ACCOUNTS ============

  /**
   * Get connected account info
   */
  async getAccount(): Promise<{
    id: string
    username: string
    name: string
    avatar: string
    isVerified: boolean
    joinedAt: string
  }> {
    return this.request('/account')
  }

  /**
   * Get account statistics
   */
  async getStats(): Promise<Stats> {
    return this.request('/account/stats')
  }

  // ============ FANS ============

  /**
   * Get list of fans/subscribers
   */
  async getFans(params?: {
    status?: 'active' | 'expired' | 'all'
    limit?: number
    offset?: number
    sort?: 'recent' | 'spent' | 'name'
  }): Promise<{ fans: Fan[]; total: number }> {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.offset) query.set('offset', params.offset.toString())
    if (params?.sort) query.set('sort', params.sort)
    
    return this.request(`/fans?${query.toString()}`)
  }

  /**
   * Get single fan details
   */
  async getFan(fanId: string): Promise<Fan & { 
    messages: number
    totalTips: number
    purchasedContent: number
  }> {
    return this.request(`/fans/${fanId}`)
  }

  /**
   * Search fans
   */
  async searchFans(query: string): Promise<{ fans: Fan[] }> {
    return this.request(`/fans/search?q=${encodeURIComponent(query)}`)
  }

  // ============ MESSAGES ============

  /**
   * Get conversations
   */
  async getConversations(params?: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
  }): Promise<{ 
    conversations: {
      user: Fan
      lastMessage: Message
      unreadCount: number
    }[]
    total: number 
  }> {
    const query = new URLSearchParams()
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.offset) query.set('offset', params.offset.toString())
    if (params?.unreadOnly) query.set('unreadOnly', 'true')
    
    return this.request(`/messages?${query.toString()}`)
  }

  /**
   * Get messages with a specific user
   */
  async getMessages(userId: string, params?: {
    limit?: number
    before?: string
  }): Promise<{ messages: Message[] }> {
    const query = new URLSearchParams()
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.before) query.set('before', params.before)
    
    return this.request(`/messages/${userId}?${query.toString()}`)
  }

  /**
   * Send a message
   */
  async sendMessage(userId: string, data: {
    text?: string
    mediaIds?: string[]
    price?: number
  }): Promise<Message> {
    return this.request(`/messages/${userId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Send mass message
   */
  async sendMassMessage(data: {
    text: string
    mediaIds?: string[]
    price?: number
    targetLists?: string[]
    excludeLists?: string[]
  }): Promise<{ sent: number; failed: number }> {
    return this.request('/messages/mass', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ============ EARNINGS ============

  /**
   * Get earnings summary
   */
  async getEarnings(params?: {
    startDate?: string
    endDate?: string
  }): Promise<Earnings> {
    const query = new URLSearchParams()
    if (params?.startDate) query.set('startDate', params.startDate)
    if (params?.endDate) query.set('endDate', params.endDate)
    
    return this.request(`/earnings?${query.toString()}`)
  }

  /**
   * Get earnings chart data
   */
  async getEarningsChart(params?: {
    period?: 'day' | 'week' | 'month'
    days?: number
  }): Promise<{ data: { date: string; amount: number }[] }> {
    const query = new URLSearchParams()
    if (params?.period) query.set('period', params.period)
    if (params?.days) query.set('days', params.days.toString())
    
    return this.request(`/earnings/chart?${query.toString()}`)
  }

  /**
   * Get transactions
   */
  async getTransactions(params?: {
    type?: 'subscription' | 'tip' | 'message' | 'post'
    limit?: number
    offset?: number
  }): Promise<{ 
    transactions: {
      id: string
      type: string
      amount: number
      user: { id: string; username: string; name: string }
      createdAt: string
      description: string
    }[]
    total: number 
  }> {
    const query = new URLSearchParams()
    if (params?.type) query.set('type', params.type)
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.offset) query.set('offset', params.offset.toString())
    
    return this.request(`/transactions?${query.toString()}`)
  }

  // ============ POSTS ============

  /**
   * Get posts
   */
  async getPosts(params?: {
    limit?: number
    offset?: number
  }): Promise<{ 
    posts: {
      id: string
      text: string
      createdAt: string
      likes: number
      comments: number
      media: { id: string; type: string; url: string }[]
      price: number | null
      isArchived: boolean
    }[]
    total: number 
  }> {
    const query = new URLSearchParams()
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.offset) query.set('offset', params.offset.toString())
    
    return this.request(`/posts?${query.toString()}`)
  }

  /**
   * Create a post
   */
  async createPost(data: {
    text: string
    mediaIds?: string[]
    price?: number
    scheduleAt?: string
  }): Promise<{ id: string }> {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // ============ MEDIA ============

  /**
   * Upload media to vault
   */
  async uploadMedia(file: File): Promise<{ id: string; url: string; type: string }> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`${ONLYFANS_API_BASE}/media/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        ...(this.accountId ? { 'X-Account-ID': this.accountId } : {}),
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Failed to upload media')
    }

    return response.json()
  }

  // ============ WEBHOOKS ============

  /**
   * Register a webhook
   */
  async registerWebhook(data: {
    url: string
    events: ('message' | 'subscription' | 'tip' | 'post')[]
    secret?: string
  }): Promise<{ id: string; secret: string }> {
    return this.request('/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * List webhooks
   */
  async listWebhooks(): Promise<{ webhooks: { id: string; url: string; events: string[] }[] }> {
    return this.request('/webhooks')
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request(`/webhooks/${webhookId}`, { method: 'DELETE' })
  }
}

// Factory function to create API instance
export function createOnlyFansAPI(accountId?: string): OnlyFansAPI {
  const apiKey = process.env.ONLYFANS_API_KEY
  if (!apiKey) {
    throw new Error('ONLYFANS_API_KEY environment variable is not set')
  }
  return new OnlyFansAPI(apiKey, { accountId })
}

export type { Fan, Message, Earnings, Stats }
export { OnlyFansAPI }
