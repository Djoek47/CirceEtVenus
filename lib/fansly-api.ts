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
   */
  async getFans(params?: {
    status?: 'active' | 'expired' | 'all'
    limit?: number
    offset?: number
  }): Promise<{ 
    data: FanslyFan[]
    total: number 
  }> {
    if (!this.accountId) throw new Error('Account ID not set')
    
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.offset) query.set('offset', params.offset.toString())
    
    return this.request(`/api/fansly/${this.accountId}/fans?${query.toString()}`)
  }

  /**
   * Get followers
   */
  async getFollowers(params?: {
    limit?: number
    offset?: number
  }): Promise<{ 
    data: { id: string; username: string; displayName: string; avatar: string }[]
    total: number 
  }> {
    if (!this.accountId) throw new Error('Account ID not set')
    
    const query = new URLSearchParams()
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.offset) query.set('offset', params.offset.toString())
    
    return this.request(`/api/fansly/${this.accountId}/followers?${query.toString()}`)
  }

  // ============ EARNINGS ============

  /**
   * Get earnings summary
   */
  async getEarnings(params?: {
    startDate?: string
    endDate?: string
  }): Promise<FanslyEarnings> {
    if (!this.accountId) throw new Error('Account ID not set')
    
    const query = new URLSearchParams()
    if (params?.startDate) query.set('startDate', params.startDate)
    if (params?.endDate) query.set('endDate', params.endDate)
    
    return this.request(`/api/fansly/${this.accountId}/earnings?${query.toString()}`)
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
  async sendMessage(chatId: string, data: {
    text: string
    mediaIds?: string[]
  }): Promise<{ success: boolean; messageId: string }> {
    if (!this.accountId) throw new Error('Account ID not set')
    
    return this.request(`/api/fansly/${this.accountId}/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
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
