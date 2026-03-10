/**
 * Fansly API Client
 * Integrates with ApiFansly.com for secure access to Fansly data
 * Documentation: https://docs.apifansly.com
 * Base URL: https://v1.apifansly.com
 */

const FANSLY_API_BASE = 'https://v1.apifansly.com'

interface FanslyAPIOptions {
  accountId?: string
}

interface FanslyFan {
  id: string
  username: string
  displayName: string
  avatar: string
  subscribedAt: string
  expiresAt: string
  totalSpent: number
  subscriptionTier: string
}

interface FanslyEarnings {
  total: number
  subscriptions: number
  tips: number
  messages: number
  period: {
    start: string
    end: string
  }
}

class FanslyAPI {
  private apiKey: string
  private accountId: string | null = null

  constructor(apiKey: string, options?: FanslyAPIOptions) {
    this.apiKey = apiKey
    this.accountId = options?.accountId || null
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }

    const response = await fetch(`${FANSLY_API_BASE}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }))
      throw new Error(error.message || error.error || `API error: ${response.status}`)
    }

    return response.json()
  }

  setAccountId(accountId: string) {
    this.accountId = accountId
  }

  // ============ ACCOUNTS ============

  /**
   * List all connected Fansly accounts for your API key
   * GET /api/fansly/accounts
   */
  async listAccounts(): Promise<{
    success: boolean
    count: number
    accounts: {
      accountId: string
      email: string
      name: string
      country: string
      createdAt: string
    }[]
  }> {
    const response = await this.request<{
      statusCode: number
      message: string
      data: {
        success: boolean
        count: number
        accounts: {
          accountId: string
          email: string
          name: string
          country: string
          createdAt: string
        }[]
      }
    }>('/api/fansly/accounts')

    return response.data
  }

  /**
   * Get profile data for a specific account
   * GET /api/fansly/{accountId}/profile
   */
  async getProfile(accountId: string): Promise<{
    accountId: string
    username: string
    displayName: string
    avatar: string
    banner: string
    bio: string
    followersCount: number
    subscribersCount: number
    postsCount: number
    likesCount: number
  }> {
    const response = await this.request<{
      statusCode: number
      message: string
      data: {
        accountId: string
        username: string
        displayName: string
        avatar: string
        banner: string
        bio: string
        followersCount: number
        subscribersCount: number
        postsCount: number
        likesCount: number
      }
    }>(`/api/fansly/${accountId}/profile`)

    return response.data
  }

  // ============ AUTHENTICATION ============

  /**
   * Connect a Fansly account with username/password
   * May return 2FA requirement
   * API Response format: { statusCode, message, data: { status_code, account_id, requires_2fa, twofa_token, ... } }
   */
  async connectAccount(username: string, password: string, countryCode: string = 'US'): Promise<{
    success?: boolean
    account_id?: string
    requires_2fa?: boolean
    twoFactorToken?: string
    masked_email?: string
    message?: string
  }> {
    const response = await this.request<{
      statusCode: number
      message: string
      data: {
        status_code: number
        account_id?: string
        requires_2fa?: boolean
        twofa_token?: string
        masked_email?: string
        message?: string
        data?: {
          success?: boolean
          response?: {
            accountId: string
            token: string
          }
        }
      }
    }>('/api/fansly/connect', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
        countryCode,
      }),
    })

    // Parse the nested response
    const data = response.data
    
    if (data.requires_2fa) {
      return {
        requires_2fa: true,
        twoFactorToken: data.twofa_token,
        masked_email: data.masked_email,
        message: data.message || 'Two-factor authentication required'
      }
    }

    if (data.account_id) {
      return {
        success: true,
        account_id: data.account_id,
        message: 'Connected successfully'
      }
    }

    return {
      success: false,
      message: data.message || response.message || 'Connection failed'
    }
  }

  /**
   * Submit 2FA code to complete authentication
   * API endpoint: POST /api/fansly/verify-2fa
   */
  async submit2FA(
    username: string,
    password: string,
    twoFactorToken: string,
    twoFactorCode: string,
    name: string,
    countryCode: string = 'US'
  ): Promise<{
    success: boolean
    account_id?: string
    message?: string
  }> {
    const response = await this.request<{
      statusCode: number
      message: string
      data: {
        status_code: number
        account_id?: string
        message?: string
        data?: {
          success?: boolean
          response?: {
            accountId: string
            token: string
          }
        }
      }
    }>('/api/fansly/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
        twoFactorToken,
        twoFactorCode,
        name,
        countryCode,
      }),
    })

    const data = response.data

    if (data.account_id) {
      return {
        success: true,
        account_id: data.account_id,
        message: 'Connected successfully'
      }
    }

    return {
      success: false,
      message: data.message || response.message || '2FA verification failed'
    }
  }

  // ============ ACCOUNT ============

  /**
   * Get account information
   */
  async getAccount(): Promise<{
    id: string
    username: string
    displayName: string
    avatar: string
    followersCount: number
    subscribersCount: number
  }> {
    if (!this.accountId) throw new Error('Account ID not set')
    return this.request(`/api/fansly/${this.accountId}/account`)
  }

  /**
   * Get account balance/earnings
   */
  async getBalance(): Promise<{
    balance: number
    pendingBalance: number
    currency: string
  }> {
    if (!this.accountId) throw new Error('Account ID not set')
    return this.request(`/api/fansly/${this.accountId}/balance`)
  }

  // ============ FANS & SUBSCRIBERS ============

  /**
   * Get list of fans/subscribers
   * Based on API docs: GET /api/fansly/{accountId}/subscribers
   */
  async getFans(accountId: string, params?: {
    status?: 'active' | 'expired' | 'all'
    limit?: number
    offset?: number
  }): Promise<{ 
    data: FanslyFan[]
    count: number 
  }> {
    const query = new URLSearchParams()
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.offset) query.set('offset', params.offset.toString())
    
    // Map status to the correct endpoint
    let endpoint = `/api/fansly/${accountId}/subscribers`
    if (params?.status === 'active') {
      endpoint = `/api/fansly/${accountId}/subscribers/active`
    } else if (params?.status === 'expired') {
      endpoint = `/api/fansly/${accountId}/subscribers/expired`
    }
    
    try {
      const response = await this.request<{
        statusCode: number
        message: string
        data: {
          count?: number
          subscribers?: FanslyFan[]
          data?: FanslyFan[]
        }
      }>(`${endpoint}?${query.toString()}`)
      
      return {
        data: response.data.subscribers || response.data.data || [],
        count: response.data.count || 0
      }
    } catch {
      // Return empty if endpoint not available
      return { data: [], count: 0 }
    }
  }

  /**
   * Get followers count
   * Based on profile data
   */
  async getFollowers(accountId: string, params?: {
    limit?: number
    offset?: number
  }): Promise<{ 
    data: { id: string; username: string; displayName: string; avatar: string }[]
    count: number 
  }> {
    // Use profile endpoint to get followers count
    try {
      const profile = await this.getProfile(accountId)
      return { 
        data: [], 
        count: profile.followersCount || 0 
      }
    } catch {
      return { data: [], count: 0 }
    }
  }

  // ============ EARNINGS ============

  /**
   * Get earnings summary
   * Based on API docs: GET /api/fansly/{accountId}/earnings/statistics
   */
  async getEarnings(accountId: string, params?: {
    startDate?: string
    endDate?: string
  }): Promise<FanslyEarnings> {
    const query = new URLSearchParams()
    if (params?.startDate) query.set('startDate', params.startDate)
    if (params?.endDate) query.set('endDate', params.endDate)
    
    try {
      const response = await this.request<{
        statusCode: number
        message: string
        data: {
          total?: number
          subscriptions?: number
          tips?: number
          messages?: number
          period?: { start: string; end: string }
        }
      }>(`/api/fansly/${accountId}/earnings/statistics?${query.toString()}`)
      
      return {
        total: response.data.total || 0,
        subscriptions: response.data.subscriptions || 0,
        tips: response.data.tips || 0,
        messages: response.data.messages || 0,
        period: response.data.period || { start: '', end: '' }
      }
    } catch {
      return {
        total: 0,
        subscriptions: 0,
        tips: 0,
        messages: 0,
        period: { start: '', end: '' }
      }
    }
  }

  // ============ POSTS ============

  /**
   * Create a new post
   * POST /api/fansly/{accountId}/posts
   */
  async createPost(accountId: string, data: {
    content: string
    wallIds?: string[]
    attachments?: any[]
    scheduledFor?: number
    expiresAt?: number
    fypFlags?: number
  }): Promise<{
    success: boolean
    postId?: string
    message?: string
  }> {
    try {
      const response = await this.request<{
        statusCode: number
        message: string
        data: {
          data: {
            success: boolean
            response: {
              id: string
              content: string
              createdAt: number
            }
          }
        }
      }>(`/api/fansly/${accountId}/posts`, {
        method: 'POST',
        body: JSON.stringify({
          content: data.content,
          wallIds: data.wallIds || [],
          fypFlags: data.fypFlags || 0,
          attachments: data.attachments || [],
          scheduledFor: data.scheduledFor || 0,
          expiresAt: data.expiresAt || 0,
          pinned: 0,
          pinWallIds: [],
        }),
      })

      return {
        success: response.data?.data?.success || false,
        postId: response.data?.data?.response?.id,
        message: response.message
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create post'
      }
    }
  }

  /**
   * Get wall IDs for posting (needed for createPost)
   * GET /api/fansly/{accountId}/walls
   */
  async getWalls(accountId: string): Promise<{
    walls: { id: string; name: string }[]
  }> {
    try {
      const response = await this.request<{
        statusCode: number
        message: string
        data: {
          walls?: { id: string; name: string }[]
        }
      }>(`/api/fansly/${accountId}/walls`)

      return { walls: response.data.walls || [] }
    } catch {
      return { walls: [] }
    }
  }

  // ============ MESSAGES ============

  /**
   * Get chat conversations
   */
  async getChats(params?: {
    limit?: number
    offset?: number
  }): Promise<{
    data: {
      id: string
      user: { id: string; username: string; displayName: string; avatar: string }
      lastMessage: string
      unreadCount: number
      updatedAt: string
    }[]
    total: number
  }> {
    if (!this.accountId) throw new Error('Account ID not set')
    
    const query = new URLSearchParams()
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.offset) query.set('offset', params.offset.toString())
    
    return this.request(`/api/fansly/${this.accountId}/chats?${query.toString()}`)
  }

  /**
   * Get messages in a chat
   */
  async getMessages(chatId: string, params?: {
    limit?: number
    before?: string
  }): Promise<{
    data: {
      id: string
      text: string
      fromUser: boolean
      createdAt: string
      media?: { id: string; type: string; url: string }[]
    }[]
  }> {
    if (!this.accountId) throw new Error('Account ID not set')
    
    const query = new URLSearchParams()
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.before) query.set('before', params.before)
    
    return this.request(`/api/fansly/${this.accountId}/chats/${chatId}/messages?${query.toString()}`)
  }

  /**
   * Send a message
   */
  async sendMessage(accountId: string, chatId: string, data: {
    text: string
    mediaIds?: string[]
  }): Promise<{ success: boolean; messageId: string }> {
    return this.request(`/api/fansly/${accountId}/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Send mass message to all subscribers
   * POST /api/fansly/{accountId}/messages/mass
   */
  async sendMassMessage(accountId: string, data: {
    content: string
    mediaIds?: string[]
    price?: number
    subscriberFilter?: 'all' | 'active' | 'expired' | 'renewing'
  }): Promise<{ 
    success: boolean
    sent?: number
    failed?: number
    message?: string 
  }> {
    try {
      const response = await this.request<{
        statusCode: number
        message: string
        data: {
          success: boolean
          sent?: number
          failed?: number
        }
      }>(`/api/fansly/${accountId}/messages/mass`, {
        method: 'POST',
        body: JSON.stringify({
          content: data.content,
          mediaIds: data.mediaIds || [],
          price: data.price || 0,
          filter: data.subscriberFilter || 'all',
        }),
      })

      return {
        success: response.data.success,
        sent: response.data.sent,
        failed: response.data.failed,
        message: response.message
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send mass message'
      }
    }
  }
}

// Factory function to create API instance
export function createFanslyAPI(accountId?: string): FanslyAPI {
  const apiKey = process.env.FANSLY_API_KEY
  if (!apiKey) {
    throw new Error('FANSLY_API_KEY environment variable is not set')
  }
  return new FanslyAPI(apiKey, { accountId })
}

export type { FanslyFan, FanslyEarnings }
export { FanslyAPI }
