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

  // ============ AUTHENTICATION ============

  /**
   * Start authentication - POST /api/authenticate
   */
  async startAuthentication(email: string, password: string, proxyCountry: string = 'us'): Promise<{
    success: boolean
    attempt_id?: string
    polling_url?: string
    message?: string
  }> {
    try {
      const response = await fetch(`${ONLYFANS_API_BASE}/authenticate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, proxyCountry }),
      })

      const data = await response.json()
      
      if (data.attempt_id || data.polling_url) {
        return {
          success: true,
          attempt_id: data.attempt_id,
          polling_url: data.polling_url,
          message: data.message
        }
      }
      
      if (!response.ok) {
        const rawMessage: string = data.message || data.error || ''
        const message = rawMessage.toLowerCase().includes('already connected')
          ? 'This account is already under someone\'s spell. If you need to manage multiple accounts through our platform, please contact us at support@circe-venus.com.'
          : rawMessage || 'Authentication failed'
        return { success: false, message }
      }

      return {
        success: true,
        attempt_id: data.attempt_id,
        polling_url: data.polling_url,
        message: data.message
      }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Connection failed' }
    }
  }

  /**
   * Poll authentication status - GET /api/authenticate/{attempt_id}
   */
  async pollAuthenticationStatus(attemptId: string): Promise<{
    status: 'pending' | 'success' | 'failed' | '2fa_required'
    accountId?: string
    username?: string
    twoFactorPending?: boolean
    message?: string
  }> {
    try {
      const response = await fetch(`${ONLYFANS_API_BASE}/authenticate/${attemptId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      const data = await response.json()

      if (data.twoFactorPending) {
        return { status: '2fa_required', message: 'Please enter your 2FA code' }
      }

      const accountId = data.account?.id || data.accountId || data.account_id || data.id
      const username = data.account?.onlyfans_username || data.username || data.onlyfans_username
      
      if (accountId) {
        return {
          status: 'success',
          accountId: accountId,
          username: username,
        }
      }

      if (data.error || data.failed) {
        return { status: 'failed', message: data.message || data.error }
      }

      return { status: 'pending', message: data.message || 'Processing...' }
    } catch (error) {
      return { status: 'failed', message: error instanceof Error ? error.message : 'Poll failed' }
    }
  }

  /**
   * Submit 2FA code - PUT /api/authenticate/{attempt_id}
   */
  async submit2FA(attemptId: string, code: string): Promise<{
    success: boolean
    accountId?: string
    username?: string
    message?: string
  }> {
    try {
      const response = await fetch(`${ONLYFANS_API_BASE}/authenticate/${attemptId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      })

      const data = await response.json()
      const accountId = data.account?.id || data.accountId || data.account_id || data.id
      const username = data.account?.onlyfans_username || data.username || data.onlyfans_username

      if (accountId) {
        return {
          success: true,
          accountId: accountId,
          username: username,
        }
      }

      return { success: false, message: data.message || data.error || '2FA verification failed' }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : '2FA submission failed' }
    }
  }

  /**
   * List all connected accounts - GET /api/accounts
   */
  async listAccounts(): Promise<{
    success: boolean
    accounts?: Array<{
      id: string
      onlyfans_id?: string
      onlyfans_username?: string
      onlyfans_email?: string
    }>
    message?: string
  }> {
    try {
      const response = await fetch(`${ONLYFANS_API_BASE}/accounts`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      const data = await response.json()

      if (Array.isArray(data)) {
        return { success: true, accounts: data }
      }
      
      if (data.accounts && Array.isArray(data.accounts)) {
        return { success: true, accounts: data.accounts }
      }

      return { success: false, message: data.message || 'No accounts found' }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Failed to list accounts' }
    }
  }

  /**
   * Delete/disconnect an account - DELETE /api/accounts/{account_id}
   */
  async deleteAccount(accountId: string): Promise<{
    success: boolean
    message?: string
  }> {
    try {
      const response = await fetch(`${ONLYFANS_API_BASE}/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (response.ok || response.status === 204) {
        return { success: true }
      }

      const data = await response.json().catch(() => ({}))
      return { success: false, message: data.message || `Failed to delete account: ${response.status}` }
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Failed to delete account' }
    }
  }

  // ============ API REQUESTS ============

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    // Use accountId in the URL path as per API docs: /api/{account}/endpoint
    let url = `${ONLYFANS_API_BASE}`
    if (this.accountId) {
      url += `/${this.accountId}`
    }
    url += endpoint

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.message || `API error: ${response.status}`)
    }

    return response.json()
  }

  setAccountId(accountId: string) {
    this.accountId = accountId
  }

  // ============ ACCOUNT ============

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

  async getStats(): Promise<Stats> {
    return this.request('/statistics')
  }

  // ============ FANS ============

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

  async getFan(fanId: string): Promise<Fan & { 
    messages: number
    totalTips: number
    purchasedContent: number
  }> {
    return this.request(`/fans/${fanId}`)
  }

  async searchFans(query: string): Promise<{ fans: Fan[] }> {
    return this.request(`/fans/search?q=${encodeURIComponent(query)}`)
  }

  // ============ CHATS/MESSAGES ============

  /**
   * Get list of chats (conversations)
   * Endpoint: GET /api/{account}/chats
   */
  async getConversations(params?: {
    limit?: number
    offset?: number
    order?: 'recent' | 'old'
    query?: string
  }): Promise<{ 
    conversations: {
      user: Fan
      lastMessage: Message
      unreadCount: number
    }[]
    total: number 
  }> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.set('limit', params.limit.toString())
    if (params?.offset) queryParams.set('offset', params.offset.toString())
    if (params?.order) queryParams.set('order', params.order)
    if (params?.query) queryParams.set('query', params.query)
    
    const response = await this.request<{ data: any[] }>(`/chats?${queryParams.toString()}`)
    
    const chats = response.data || []
    return {
      conversations: chats.map((chat: any) => ({
        user: chat.fan || chat.withUser,
        lastMessage: chat.lastMessage,
        unreadCount: chat.unreadMessagesCount || 0,
      })),
      total: chats.length,
    }
  }

  /**
   * Get messages from a specific chat
   * Endpoint: GET /api/{account}/chats/{chat_id}/messages
   */
  async getMessages(chatId: string, params?: {
    limit?: number
    id?: string
    order?: 'desc' | 'asc'
  }): Promise<{ messages: Message[] }> {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.set('limit', params.limit.toString())
    if (params?.id) queryParams.set('id', params.id)
    if (params?.order) queryParams.set('order', params.order)
    
    const response = await this.request<{ data: any[] }>(`/chats/${chatId}/messages?${queryParams.toString()}`)
    return { messages: response.data || [] }
  }

  /**
   * Send a message to a specific chat
   * Endpoint: POST /api/{account}/chats/{chat_id}/messages
   */
  async sendMessage(chatId: string, data: {
    text: string
    lockedText?: boolean
    price?: number
    mediaFiles?: string[]
  }): Promise<Message> {
    const response = await this.request<{ data: Message }>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response.data
  }

  /**
   * Send mass message
   * Endpoint: POST /api/{account}/mass-messaging
   */
  async sendMassMessage(data: {
    text: string
    userLists?: string[]
    userIds?: string[]
    price?: number
    mediaFiles?: string[]
  }): Promise<{ sent: number; failed: number; id?: number }> {
    const response = await this.request<{ data: any }>('/mass-messaging', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return { 
      sent: response.data?.total || 0, 
      failed: 0,
      id: response.data?.id 
    }
  }

  // ============ EARNINGS ============

  async getEarnings(params?: {
    startDate?: string
    endDate?: string
  }): Promise<Earnings> {
    const query = new URLSearchParams()
    if (params?.startDate) query.set('startDate', params.startDate)
    if (params?.endDate) query.set('endDate', params.endDate)
    
    return this.request(`/statistics/earnings?${query.toString()}`)
  }

  async getEarningsChart(params?: {
    period?: 'day' | 'week' | 'month'
    days?: number
  }): Promise<{ data: { date: string; amount: number }[] }> {
    const query = new URLSearchParams()
    if (params?.period) query.set('period', params.period)
    if (params?.days) query.set('days', params.days.toString())
    
    return this.request(`/statistics/earnings/chart?${query.toString()}`)
  }

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

  async createPost(data: {
    text: string
    mediaIds?: string[]
    mediaFiles?: string[]
    price?: number
    schedule?: string
  }): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const result = await this.request<{ id: string }>('/posts', {
        method: 'POST',
        body: JSON.stringify({
          text: data.text,
          mediaIds: data.mediaIds,
          price: data.price,
          scheduleAt: data.schedule,
        }),
      })
      return { success: true, postId: result.id }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create post' 
      }
    }
  }

  // ============ MEDIA ============

  async uploadMedia(file: File): Promise<{ id: string; url: string; type: string }> {
    const formData = new FormData()
    formData.append('file', file)
    
    let url = `${ONLYFANS_API_BASE}`
    if (this.accountId) {
      url += `/${this.accountId}`
    }
    url += '/media/upload'
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Failed to upload media')
    }

    return response.json()
  }

  // ============ CLIENT SESSIONS ============

  async createClientSession(displayName: string, proxyCountry?: string): Promise<{
    token: string
    display_name: string
  }> {
    const response = await fetch(`${ONLYFANS_API_BASE}/client-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: displayName,
        proxyCountry: proxyCountry || 'us'
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create client session')
    }

    return response.json()
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
