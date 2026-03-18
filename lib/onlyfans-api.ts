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

interface OnlyFansNotificationCounts {
  total: number
  unread: number
  [key: string]: number
}

interface OnlyFansNotification {
  id: string
  type: string
  title?: string
  text?: string
  createdAt?: string
  fromUser?: {
    id?: string
    username?: string
    name?: string
    avatar?: string
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
   * displayName: optional label for the account (e.g. Supabase full_name or email), so the account shows our service identity instead of the OnlyFans login email
   */
  async startAuthentication(
    email: string,
    password: string,
    proxyCountry: string = 'us',
    displayName?: string
  ): Promise<{
    success: boolean
    attempt_id?: string
    polling_url?: string
    message?: string
  }> {
    try {
      const body: Record<string, string> = { email, password, proxyCountry }
      if (displayName != null && displayName !== '') {
        body.display_name = displayName
      }
      const response = await fetch(`${ONLYFANS_API_BASE}/authenticate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
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
   * Map API progress to a short user-facing message.
   * API returns state: "authenticating", progress: "filling_out_login" etc.
   */
  private authProgressMessage(progress: string | undefined, state: string | undefined): string {
    if (state && state !== 'authenticating') return 'Almost there...'
    const map: Record<string, string> = {
      filling_out_login: 'Filling out login...',
      submitting: 'Submitting...',
      waiting_for_otp: 'Waiting for verification...',
      checking: 'Checking authentication...',
    }
    return progress ? (map[progress] || progress.replace(/_/g, ' ')) : 'Processing authentication...'
  }

  /**
   * Poll authentication status - GET /api/authenticate/{attempt_id}
   * API may return: state ("authenticating" | "authenticated"), progress, lastAttempt.success, account.onlyfans_data
   */
  async pollAuthenticationStatus(attemptId: string): Promise<{
    status: 'pending' | 'success' | 'failed' | '2fa_required' | 'face_verification_required'
    accountId?: string
    username?: string
    twoFactorPending?: boolean
    message?: string
    progress?: string
    faceVerificationUrl?: string
  }> {
    try {
      const response = await fetch(`${ONLYFANS_API_BASE}/authenticate/${attemptId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      const data = await response.json()
      const state: string | undefined = data.state
      const progress: string | undefined = data.progress
      const lastAttempt = data.lastAttempt

      // Face verification: API may send needs_face_otp + face_otp_verification_url
      const faceUrl =
        data.face_otp_verification_url ??
        lastAttempt?.face_otp_verification_url ??
        (typeof data.face_otp === 'string' ? data.face_otp : null)
      if (data.needs_face_otp === true || lastAttempt?.needs_face_otp === true || (faceUrl && (state === 'needs_face_otp' || data.face_otp))) {
        return {
          status: 'face_verification_required',
          message: 'OnlyFans requires a quick face verification to continue.',
          faceVerificationUrl: faceUrl || undefined,
          progress,
        }
      }

      // 2FA required: API may send twoFactorPending, lastAttempt.needs_otp, progress "waiting_for_otp",
      // or state variants like "needs-otp" / "needs-app-otp"
      const needsOtpState = state === 'needs-otp' || state === 'needs-app-otp'
      if (data.twoFactorPending || lastAttempt?.needs_otp === true || progress === 'waiting_for_otp' || needsOtpState) {
        return { status: '2fa_required', message: 'Please enter your 2FA code from your email or authenticator app', progress }
      }

      // Success only when authentication is actually done (not still "authenticating")
      const isDone = state && state !== 'authenticating'
      const attemptSuccess = lastAttempt && (lastAttempt.success === true || lastAttempt.completed_at != null)
      const account = data.account
      const accountId = account?.id || data.accountId || data.account_id || data.id
      const onlyfansData = account?.onlyfans_data || {}
      const hasOnlyFansUser = onlyfansData?.username != null || onlyfansData?.id != null
      const username =
        onlyfansData?.username ||
        account?.onlyfans_username ||
        account?.display_name ||
        data.username ||
        data.onlyfans_username

      if (accountId && (isDone || attemptSuccess || hasOnlyFansUser)) {
        return {
          status: 'success',
          accountId: String(accountId),
          username: username || undefined,
          progress,
        }
      }

      // Terminal failure: explicit error, failed flag, or completed attempt with an error_code/message
      if (data.error || data.failed || (lastAttempt && lastAttempt.completed_at && lastAttempt.success === false)) {
        const errorMessage =
          lastAttempt?.error_message ||
          data.message ||
          data.error ||
          lastAttempt?.error_code ||
          'Authentication failed'
        return { status: 'failed', message: errorMessage, progress }
      }

      const message = data.message || this.authProgressMessage(progress, state)
      return { status: 'pending', message, progress }
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
   * Pending (authenticating) accounts have no onlyfans_username / onlyfans_user_data.
   */
  async listAccounts(): Promise<{
    success: boolean
    accounts?: Array<{
      id: string
      client_reference_id?: string
      display_name?: string
      onlyfans_id?: string
      onlyfans_username?: string
      onlyfans_email?: string
      onlyfans_user_data?: { name?: string; username?: string; id?: string }
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

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.accounts)
            ? data.accounts
            : null
      if (list?.length !== undefined) {
        return { success: true, accounts: list }
      }

      return { success: false, message: (data as any)?.message || 'No accounts found' }
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

  /**
   * Disconnect an account (alias of deleteAccount) - DELETE /api/accounts/{account_id}
   */
  async disconnectAccount(accountId: string): Promise<{
    success: boolean
    message?: string
  }> {
    return this.deleteAccount(accountId)
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

    const json = await response.json().catch(() => null)

    // OnlyFans API sometimes returns 200 with an error payload. Normalize both cases here.
    if (!response.ok || (json && typeof json === 'object' && (json as any).error)) {
      const errorCode = (json as any)?.error as string | undefined
      const message = (json as any)?.message || (json as any)?.description || errorCode

      // Special case: session expired -> needs re-authentication
      if (errorCode === 'SESSION_EXPIRED:NEEDS_REAUTHENTICATION') {
        throw new Error('ONLYFANS_SESSION_EXPIRED:NEEDS_REAUTHENTICATION')
      }

      throw new Error(message || `API error: ${response.status}`)
    }

    return json as T
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

  /**
   * List active fans - GET /api/{account}/fans/active
   * Paginated; newest first.
   */
  async getFansActive(params?: { limit?: number; offset?: number }): Promise<{ data: Fan[] }> {
    const q = new URLSearchParams()
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return this.request(`/fans/active${suffix}`)
  }

  /**
   * List all fans - GET /api/{account}/fans/all
   */
  async getFansAll(params?: { limit?: number; offset?: number }): Promise<{ data: Fan[] }> {
    const q = new URLSearchParams()
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return this.request(`/fans/all${suffix}`)
  }

  /**
   * List expired fans - GET /api/{account}/fans/expired
   */
  async getFansExpired(params?: { limit?: number; offset?: number }): Promise<{ data: Fan[] }> {
    const q = new URLSearchParams()
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return this.request(`/fans/expired${suffix}`)
  }

  /**
   * List latest fans - GET /api/{account}/fans/latest
   * Filter: total | only_new | only_renewals.
   */
  async getFansLatest(params?: {
    limit?: number
    offset?: number
    filter?: 'total' | 'only_new' | 'only_renewals'
  }): Promise<{ data: Fan[] }> {
    const q = new URLSearchParams()
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    if (params?.filter) q.set('filter', params.filter)
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return this.request(`/fans/latest${suffix}`)
  }

  /**
   * List top fans by spending - GET /api/{account}/fans/top
   * Sort: total | subscriptions | tips | messages | posts | streams.
   */
  async getFansTop(params?: {
    limit?: number
    offset?: number
    sort?: 'total' | 'subscriptions' | 'tips' | 'messages' | 'posts' | 'streams'
  }): Promise<{ data: Fan[] }> {
    const q = new URLSearchParams()
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    if (params?.sort) q.set('sort', params.sort)
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return this.request(`/fans/top${suffix}`)
  }

  /**
   * Get subscription history for a fan - GET /api/{account}/fans/{user_id}/subscriptions-history
   */
  async getSubscriptionHistory(userId: string, params?: { limit?: number; offset?: number }): Promise<{ data: unknown[] }> {
    const q = new URLSearchParams()
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return this.request(`/fans/${encodeURIComponent(userId)}/subscriptions-history${suffix}`)
  }

  // ============ FOLLOWING ============

  /**
   * List active followings - GET /api/{account}/following/active
   */
  async getFollowingActive(params?: { limit?: number; offset?: number }): Promise<{ data: unknown[] }> {
    const q = new URLSearchParams()
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return this.request(`/following/active${suffix}`)
  }

  /**
   * List all followings - GET /api/{account}/following/all
   */
  async getFollowingAll(params?: { limit?: number; offset?: number }): Promise<{ data: unknown[] }> {
    const q = new URLSearchParams()
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return this.request(`/following/all${suffix}`)
  }

  /**
   * List expired followings - GET /api/{account}/following/expired
   */
  async getFollowingExpired(params?: { limit?: number; offset?: number }): Promise<{ data: unknown[] }> {
    const q = new URLSearchParams()
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return this.request(`/following/expired${suffix}`)
  }

  // ============ QUEUE ============

  /**
   * Publish a queue/saved item - PUT /api/{account}/queue/{queue_id}/publish
   * Sends the item immediately (saved post or mass message).
   */
  async publishQueueItem(queueId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.request<unknown>(`/queue/${encodeURIComponent(queueId)}/publish`, { method: 'PUT' })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish queue item',
      }
    }
  }

  // ============ ENGAGEMENT MESSAGES ============

  /**
   * List direct messages with engagement - GET /api/{account}/engagement/messages/direct-messages
   */
  async getDirectMessagesEngagement(params?: {
    limit?: number
    offset?: number
    startDate?: string
    endDate?: string
  }): Promise<{ data: unknown[] }> {
    const q = new URLSearchParams()
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    if (params?.startDate) q.set('startDate', params.startDate)
    if (params?.endDate) q.set('endDate', params.endDate)
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return this.request(`/engagement/messages/direct-messages${suffix}`)
  }

  /**
   * Direct messages chart - GET /api/{account}/engagement/messages/direct-messages/chart
   */
  async getDirectMessagesChart(params?: { startDate?: string; endDate?: string; period?: string }): Promise<{ data: unknown[] }> {
    const q = new URLSearchParams()
    if (params?.startDate) q.set('startDate', params.startDate)
    if (params?.endDate) q.set('endDate', params.endDate)
    if (params?.period) q.set('period', params.period)
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return this.request(`/engagement/messages/direct-messages/chart${suffix}`)
  }

  /**
   * List mass messages with engagement - GET /api/{account}/engagement/messages/mass-messages
   */
  async getMassMessagesEngagement(params?: {
    limit?: number
    offset?: number
    startDate?: string
    endDate?: string
  }): Promise<{ data: unknown[] }> {
    const q = new URLSearchParams()
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    if (params?.startDate) q.set('startDate', params.startDate)
    if (params?.endDate) q.set('endDate', params.endDate)
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return this.request(`/engagement/messages/mass-messages${suffix}`)
  }

  /**
   * Mass messages chart - GET /api/{account}/engagement/messages/mass-messages/chart
   */
  async getMassMessagesChart(params?: { startDate?: string; endDate?: string; period?: string }): Promise<{ data: unknown[] }> {
    const q = new URLSearchParams()
    if (params?.startDate) q.set('startDate', params.startDate)
    if (params?.endDate) q.set('endDate', params.endDate)
    if (params?.period) q.set('period', params.period)
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return this.request(`/engagement/messages/mass-messages/chart${suffix}`)
  }

  /**
   * Top performing message by purchases - GET /api/{account}/engagement/messages/top-message
   */
  async getTopMessage(params?: { startDate?: string; endDate?: string; period?: string }): Promise<{ data: unknown }> {
    const q = new URLSearchParams()
    if (params?.startDate) q.set('startDate', params.startDate)
    if (params?.endDate) q.set('endDate', params.endDate)
    if (params?.period) q.set('period', params.period)
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return this.request(`/engagement/messages/top-message${suffix}`)
  }

  /**
   * List buyers for a specific message - GET /api/{account}/engagement/messages/{message_id}/buyers
   */
  async getMessageBuyers(messageId: string, params?: { limit?: number; offset?: number }): Promise<{ data: unknown[] }> {
    const q = new URLSearchParams()
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return this.request(`/engagement/messages/${encodeURIComponent(messageId)}/buyers${suffix}`)
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
   * Get media gallery for a specific chat
   * Endpoint: GET /api/{account}/chats/{chat_id}/media
   */
  async getChatMedia(chatId: string, params?: {
    limit?: number
    offset?: number
  }): Promise<{ data: any[] }> {
    const queryParams = new URLSearchParams()
    if (params?.limit != null) queryParams.set('limit', String(params.limit))
    if (params?.offset != null) queryParams.set('offset', String(params.offset))
    const suffix = queryParams.toString() ? `?${queryParams.toString()}` : ''
    return this.request(`/chats/${encodeURIComponent(chatId)}/media${suffix}`)
  }

  /**
   * Send a message to a specific chat
   * Endpoint: POST /api/{account}/chats/{chat_id}/messages
   */
  async sendMessage(chatId: string, data: {
    text: string
    lockedText?: boolean
    price?: number
    mediaFiles?: (string | number)[]
    previews?: (string | number)[]
    rfTag?: (string | number)[]
  }): Promise<Message> {
    const payload: Record<string, unknown> = {
      text: data.text,
    }
    if (typeof data.lockedText === 'boolean') payload.lockedText = data.lockedText
    if (typeof data.price === 'number') payload.price = data.price
    if (Array.isArray(data.mediaFiles)) payload.mediaFiles = data.mediaFiles
    if (Array.isArray(data.previews)) payload.previews = data.previews
    if (Array.isArray(data.rfTag)) payload.rfTag = data.rfTag

    const response = await this.request<{ data: Message }>(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
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
    mediaFiles?: (string | number)[]
    previews?: (string | number)[]
    rfTag?: (string | number)[]
  }): Promise<{ sent: number; failed: number; id?: number }> {
    const payload: Record<string, unknown> = {
      text: data.text,
    }
    if (Array.isArray(data.userLists)) payload.userLists = data.userLists
    if (Array.isArray(data.userIds)) payload.userIds = data.userIds
    if (typeof data.price === 'number') payload.price = data.price
    if (Array.isArray(data.mediaFiles)) payload.mediaFiles = data.mediaFiles
    if (Array.isArray(data.previews)) payload.previews = data.previews
    if (Array.isArray(data.rfTag)) payload.rfTag = data.rfTag

    const response = await this.request<{ data: any }>('/mass-messaging', {
      method: 'POST',
      body: JSON.stringify(payload),
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
    mediaIds?: (string | number)[]
    mediaFiles?: (string | number)[]
    schedule?: string
    labelIds?: (string | number)[]
    expireDays?: 1 | 3 | 7 | 30
    saveForLater?: boolean
    fundRaisingTargetAmount?: number
    fundRaisingTipsPresets?: number[]
    votingType?: 'poll' | 'quiz'
    votingOptions?: string[]
    votingDue?: 1 | 3 | 7 | 30
    votingCorrectIndex?: number
  }): Promise<{ success: boolean; postId?: string; error?: string }> {
    try {
      const payload: Record<string, unknown> = {
        text: data.text,
      }
      // OnlyFans API accepts mediaFiles; allow callers to pass either mediaIds or mediaFiles.
      const media = data.mediaFiles ?? data.mediaIds
      if (Array.isArray(media)) payload.mediaFiles = media
      if (data.schedule) payload.scheduledDate = data.schedule
      if (Array.isArray(data.labelIds)) payload.labelIds = data.labelIds
      if (typeof data.expireDays === 'number') payload.expireDays = data.expireDays
      if (typeof data.saveForLater === 'boolean') payload.saveForLater = data.saveForLater
      if (typeof data.fundRaisingTargetAmount === 'number') {
        payload.fundRaisingTargetAmount = data.fundRaisingTargetAmount
      }
      if (Array.isArray(data.fundRaisingTipsPresets)) {
        payload.fundRaisingTipsPresets = data.fundRaisingTipsPresets
      }
      if (data.votingType) {
        payload.votingType = data.votingType
      }
      if (Array.isArray(data.votingOptions)) {
        payload.votingOptions = data.votingOptions
      }
      if (typeof data.votingDue === 'number') {
        payload.votingDue = data.votingDue
      }
      if (typeof data.votingCorrectIndex === 'number') {
        payload.votingCorrectIndex = data.votingCorrectIndex
      }

      const result = await this.request<{ id: string }>('/posts', {
        method: 'POST',
        body: JSON.stringify(payload),
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

  async uploadMedia(file: File): Promise<{ id: string; url?: string; type?: string }> {
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

    const json = await response.json().catch(() => null)

    // Align with OnlyFans API docs: upload-media-to-the-only-fans-cdn returns
    // { data: { id: 'ofapi_media_*', url, type, ... }, ... }. The rest of the app
    // expects a flat { id } (and optionally url/type) object.
    if (json && typeof json === 'object') {
      const data = (json as any).data ?? json
      if (data && typeof data.id === 'string') {
        return {
          id: data.id,
          url: typeof data.url === 'string' ? data.url : undefined,
          type: typeof data.type === 'string' ? data.type : undefined,
        }
      }
    }

    throw new Error('Unexpected upload response from OnlyFans API')
  }

  // ============ NOTIFICATIONS ============

  /**
   * Get unread notification counts - GET /api/{account}/notifications/counts
   */
  async getNotificationCounts(): Promise<OnlyFansNotificationCounts> {
    const res = await this.request<any>('/notifications/counts')
    const counts = (res?.data ?? res) as Record<string, unknown>
    const out: OnlyFansNotificationCounts = {
      total: Number(counts.total ?? counts.all ?? 0),
      unread: Number(counts.unread ?? 0),
    }
    for (const [key, value] of Object.entries(counts)) {
      if (typeof value === 'number' && !(key in out)) {
        out[key] = value
      }
    }
    return out
  }

  /**
   * List notifications - GET /api/{account}/notifications
   */
  async listNotifications(params?: {
    limit?: number
    offset?: number
    tab?: string
  }): Promise<{ notifications: OnlyFansNotification[] }> {
    const q = new URLSearchParams()
    if (params?.limit != null) q.set('limit', String(params.limit))
    if (params?.offset != null) q.set('offset', String(params.offset))
    if (params?.tab) q.set('tab', params.tab)
    const suffix = q.toString() ? `?${q.toString()}` : ''
    const res = await this.request<any>(`/notifications${suffix}`)
    const list = Array.isArray(res?.data?.list) ? res.data.list : Array.isArray(res?.data) ? res.data : []
    const notifications: OnlyFansNotification[] = list.map((n: any) => ({
      id: String(n.id ?? n.notificationId ?? ''),
      type: String(n.type ?? n.category ?? 'unknown'),
      title: typeof n.title === 'string' ? n.title : undefined,
      text: typeof n.text === 'string'
        ? n.text
        : typeof n.body === 'string'
          ? n.body
          : typeof n.message === 'string'
            ? n.message
            : undefined,
      createdAt: typeof n.createdAt === 'string'
        ? n.createdAt
        : typeof n.date === 'string'
          ? n.date
          : typeof n.time === 'string'
            ? n.time
            : undefined,
      fromUser: n.user
        ? {
            id: n.user.id != null ? String(n.user.id) : undefined,
            username: n.user.username,
            name: n.user.name ?? n.user.displayName,
            avatar: n.user.avatar,
          }
        : undefined,
    }))
    return { notifications }
  }

  /**
   * Mark all notifications as read - POST /api/{account}/notifications/mark-all-as-read
   */
  async markAllNotificationsAsRead(): Promise<{ success: boolean }> {
    await this.request('/notifications/mark-all-as-read', { method: 'POST' })
    return { success: true }
  }

  /**
   * Get notification tabs order - GET /api/{account}/notifications/tabs-order
   */
  async getNotificationTabsOrder(): Promise<any> {
    return this.request('/notifications/tabs-order')
  }

  /**
   * Update notification tabs order - PUT /api/{account}/notifications/tabs-order
   */
  async updateNotificationTabsOrder(order: unknown): Promise<any> {
    return this.request('/notifications/tabs-order', {
      method: 'PUT',
      body: JSON.stringify({ order }),
    })
  }

  // ============ CLIENT SESSIONS (SDK flow) ============

  /**
   * Create a client session for the OnlyFansAPI SDK.
   * Pass clientReferenceId (e.g. Supabase user id) so the linked account can be attributed to the user.
   */
  async createClientSession(
    displayName: string,
    proxyCountry?: string,
    clientReferenceId?: string
  ): Promise<{ token: string; display_name: string }> {
    const body: Record<string, string> = {
      display_name: displayName,
      proxyCountry: proxyCountry || 'us',
    }
    if (clientReferenceId) body.client_reference_id = clientReferenceId

    const response = await fetch(`${ONLYFANS_API_BASE}/client-sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error((err as any)?.message || 'Failed to create client session')
    }

    const data = await response.json()
    return {
      token: data.data?.token ?? data.token,
      display_name: data.display_name ?? displayName,
    }
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
