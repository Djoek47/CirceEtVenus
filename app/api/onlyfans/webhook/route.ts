import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { getPrefsForWebhook } from '@/lib/notification-preferences'
import { maybeCreateWhaleTipUrgentTask } from '@/lib/divine/urgent-alerts'
import { refreshFanThreadInsight } from '@/lib/divine/fan-thread-insight'

// Configure OnlyFans API webhook URL to: https://<your-domain>/api/onlyfans/webhook (POST only; do not use site root).

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Verify webhook signature
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-onlyfans-signature')
    const rawBody = await request.text()
    
    // Verify signature if secret is set
    const webhookSecret = process.env.ONLYFANS_WEBHOOK_SECRET
    if (webhookSecret && signature) {
      if (!verifySignature(rawBody, signature, webhookSecret)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const event = JSON.parse(rawBody)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const eventType = event.type ?? event.event

    // OnlyFansAPI webhook events based on their settings
    switch (eventType) {
      // Chat events
      case 'chat.message':
        await handleNewMessage(supabase, event.data)
        break
      
      case 'chat.tip':
      case 'post.tip':
      case 'story.tip':
      case 'stream.tip':
      case 'subscription.tip':
        await handleTip(supabase, event.data)
        break
      
      case 'chat.purchase':
      case 'post.purchase':
        await handlePurchase(supabase, event.data)
        break
      
      // Post/Story/Stream engagement events
      case 'post.comment':
      case 'story.comment':
      case 'stream.comment':
        await handleComment(supabase, event.data)
        break
      
      case 'post.like':
      case 'story.like':
      case 'stream.like':
        await handleLike(supabase, event.data)
        break
      
      // Subscription events
      case 'subscription.new':
        await handleNewSubscription(supabase, event.data)
        break
      
      case 'subscription.renewed':
        await handleRenewal(supabase, event.data)
        break
      
      case 'subscription.expired':
        await handleExpiration(supabase, event.data)
        break
      
      // User spending event
      case 'user.spent':
        await handleUserSpent(supabase, event.data)
        break

      case 'fan_summary.completed':
        await handleFanSummaryCompleted(supabase, event.data)
        break

      case 'tips.received':
        try {
          await handleTip(supabase, normalizeTipPayload(event.data))
        } catch (e) {
          console.warn('tips.received handler:', e)
        }
        break

      case 'transactions.new':
        await handleTransactionNew(supabase, event.data)
        break

      case 'chat_queue.updated':
      case 'chat_queue.finished':
        await handleChatQueueEvent(supabase, event.data, eventType)
        break

      case 'messages.deleted':
        await handleMessageDeleted(supabase, event.data)
        break
      
      default:
        console.log('Unknown event type:', eventType)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// Handle new subscription
async function handleNewSubscription(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, data: {
  accountId: string
  fan: {
    id: string
    username: string
    name: string
    avatar: string
    subscriptionPrice: number
  }
}) {
  // Find the user by their OnlyFans account ID
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'onlyfans')
    .eq('access_token', data.accountId)
    .single()

  if (!connection) return

  // Add the new fan
  await supabase.from('fans').upsert({
    user_id: connection.user_id,
    platform: 'onlyfans',
    platform_fan_id: data.fan.id,
    username: data.fan.username,
    display_name: data.fan.name,
    avatar_url: data.fan.avatar,
    subscribed_at: new Date().toISOString(),
    subscription_price: data.fan.subscriptionPrice,
    total_spent: data.fan.subscriptionPrice,
    tier: 'regular',
    is_renewing: true,
    last_activity_at: new Date().toISOString(),
  }, {
    onConflict: 'user_id,platform,platform_fan_id'
  })

  const prefs = await getPrefsForWebhook(supabase, connection.user_id)
  if (prefs.notify_new_subscriber) {
    await supabase.from('notifications').insert({
      user_id: connection.user_id,
      type: 'fan',
      title: 'New Subscriber',
      description: `${data.fan.name} just subscribed for $${data.fan.subscriptionPrice}`,
      link: '/dashboard/fans',
      read: false,
      platform: 'onlyfans',
      avatar_url: data.fan.avatar || undefined,
    })
  }
}

// Handle subscription renewal
async function handleRenewal(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, data: {
  accountId: string
  fan: { id: string; totalSpent: number }
}) {
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'onlyfans')
    .eq('access_token', data.accountId)
    .single()

  if (!connection) return

  // Update fan's total spent and tier
  const tier = data.fan.totalSpent >= 500 ? 'vip' : data.fan.totalSpent >= 100 ? 'whale' : 'regular'
  
  await supabase.from('fans')
    .update({
      total_spent: data.fan.totalSpent,
      tier,
      is_renewing: true,
      last_activity_at: new Date().toISOString(),
    })
    .eq('user_id', connection.user_id)
    .eq('platform_fan_id', data.fan.id)
}

// Handle subscription expiration
async function handleExpiration(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, data: {
  accountId: string
  fan: { id: string; username: string; name: string }
}) {
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'onlyfans')
    .eq('access_token', data.accountId)
    .single()

  if (!connection) return

  await supabase.from('fans')
    .update({
      is_renewing: false,
      expires_at: new Date().toISOString(),
    })
    .eq('user_id', connection.user_id)
    .eq('platform_fan_id', data.fan.id)

  const prefs = await getPrefsForWebhook(supabase, connection.user_id)
  if (prefs.notify_subscription_expired) {
    await supabase.from('notifications').insert({
      user_id: connection.user_id,
      type: 'protection',
      title: 'Subscriber Lost',
      description: `${data.fan.name} (@${data.fan.username}) subscription expired`,
      link: '/dashboard/fans',
      read: false,
    })
  }
}

// Handle new message
async function handleNewMessage(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, data: {
  accountId: string
  message: {
    id: string
    fromUser: { id: string; username: string; name: string; avatar?: string }
    text: string
    createdAt: string
  }
}) {
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'onlyfans')
    .eq('access_token', data.accountId)
    .single()

  if (!connection) return

  // Store the message (optional - for message history)
  await supabase.from('messages').insert({
    user_id: connection.user_id,
    platform: 'onlyfans',
    platform_message_id: data.message.id,
    from_fan_id: data.message.fromUser.id,
    from_username: data.message.fromUser.username,
    content: data.message.text,
    received_at: data.message.createdAt,
    is_read: false,
  })

  // Get fan for avatar and whale tier (total_spent)
  const { data: fan } = await supabase
    .from('fans')
    .select('avatar_url, total_spent')
    .eq('user_id', connection.user_id)
    .eq('platform', 'onlyfans')
    .eq('platform_fan_id', data.message.fromUser.id)
    .maybeSingle()

  await supabase.from('fans')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('user_id', connection.user_id)
    .eq('platform_fan_id', data.message.fromUser.id)

  const displayName =
    data.message.fromUser.name ||
    (data.message.fromUser.username ? `@${data.message.fromUser.username}` : 'a fan')
  const rawText = data.message.text || ''
  const trimmedText = rawText.trim()
  const maxLength = 140
  const preview =
    trimmedText.length === 0
      ? 'Sent you a new message'
      : trimmedText.length > maxLength
        ? trimmedText.slice(0, maxLength - 1) + '…'
        : trimmedText

  const totalSpent = fan?.total_spent != null ? Number(fan.total_spent) : 0
  const isWhale = totalSpent >= 100
  const title = isWhale ? `Whale wrote back` : `New message from ${displayName}`
  const avatarUrl =
    data.message.fromUser.avatar || (fan?.avatar_url ?? null)

  const prefs = await getPrefsForWebhook(supabase, connection.user_id)
  if (prefs.notify_new_message) {
    await supabase.from('notifications').insert({
      user_id: connection.user_id,
      type: 'message',
      title,
      description: preview,
      link: `/dashboard/messages?fanId=${encodeURIComponent(data.message.fromUser.id)}`,
      read: false,
      platform: 'onlyfans',
      avatar_url: avatarUrl || undefined,
    })
  }

  const uid = connection.user_id
  const fanId = String(data.message.fromUser.id)
  after(async () => {
    try {
      await refreshFanThreadInsight(supabase, uid, fanId)
    } catch (e) {
      console.warn('[fan_thread_insights webhook]', e)
    }
  })
}

// Handle tip
async function handleTip(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, data: {
  accountId: string
  tip: {
    amount: number
    fromUser: { id: string; username: string; name: string }
  }
}) {
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'onlyfans')
    .eq('access_token', data.accountId)
    .single()

  if (!connection) return

  // Update fan's total spent
  await supabase.rpc('increment_fan_spending', {
    p_user_id: connection.user_id,
    p_fan_id: data.tip.fromUser.id,
    p_amount: data.tip.amount,
  })

  const prefs = await getPrefsForWebhook(supabase, connection.user_id)
  if (prefs.notify_new_tip && data.tip.amount >= 50) {
    const fromUser = data.tip.fromUser as { id: string; username: string; name: string; avatar?: string }
    await supabase.from('notifications').insert({
      user_id: connection.user_id,
      type: 'fan',
      title: data.tip.amount >= 100 ? 'Whale Alert!' : 'Big Tip Received',
      description: `${fromUser.name} tipped $${data.tip.amount}`,
      link: '/dashboard/messages?fanId=' + encodeURIComponent(fromUser.id),
      read: false,
      platform: 'onlyfans',
      avatar_url: fromUser.avatar || undefined,
    })
  }

  await maybeCreateWhaleTipUrgentTask(supabase, connection.user_id, data.tip.amount, data.tip.fromUser).catch(() => undefined)
}

// Handle purchase (PPV, etc.)
async function handlePurchase(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, data: {
  accountId: string
  purchase: {
    amount: number
    contentId: string
    fromUser: { id: string; username: string; name: string }
  }
}) {
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'onlyfans')
    .eq('access_token', data.accountId)
    .single()

  if (!connection) return

  // Update fan's total spent
  await supabase.rpc('increment_fan_spending', {
    p_user_id: connection.user_id,
    p_fan_id: data.purchase.fromUser.id,
    p_amount: data.purchase.amount,
  })
}

// Handle comment events
async function handleComment(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, data: {
  accountId: string
  comment: {
    fromUser: { id: string; username: string; name: string }
    text: string
    contentId: string
  }
}) {
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'onlyfans')
    .eq('access_token', data.accountId)
    .single()

  if (!connection) return

  // Update fan's last activity
  await supabase.from('fans')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('user_id', connection.user_id)
    .eq('platform_fan_id', data.comment.fromUser.id)
}

// Handle like events
async function handleLike(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, data: {
  accountId: string
  like: {
    fromUser: { id: string; username: string; name: string }
    contentId: string
  }
}) {
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'onlyfans')
    .eq('access_token', data.accountId)
    .single()

  if (!connection) return

  // Update fan's last activity
  await supabase.from('fans')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('user_id', connection.user_id)
    .eq('platform_fan_id', data.like.fromUser.id)
}

// Handle user spending event
async function handleUserSpent(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, data: {
  accountId: string
  user: { id: string; username: string; name: string }
  amount: number
  type: string
}) {
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'onlyfans')
    .eq('access_token', data.accountId)
    .single()

  if (!connection) return

  // Update fan's total spent and tier
  await supabase.rpc('increment_fan_spending', {
    p_user_id: connection.user_id,
    p_fan_id: data.user.id,
    p_amount: data.amount,
  })

  // Update analytics
  await supabase.from('analytics_snapshots')
    .update({ 
      revenue: supabase.rpc('get_daily_revenue', { p_user_id: connection.user_id })
    })
    .eq('user_id', connection.user_id)
    .eq('date', new Date().toISOString().split('T')[0])
}

function normalizeTipPayload(data: unknown): {
  accountId: string
  tip: { amount: number; fromUser: { id: string; username: string; name: string } }
} {
  if (!data || typeof data !== 'object') throw new Error('invalid payload')
  const d = data as Record<string, unknown>
  const accountId = String(d.accountId ?? d.account_id ?? '')
  const tipObj = (typeof d.tip === 'object' && d.tip !== null ? d.tip : d) as Record<string, unknown>
  const amount = Number(tipObj.amount ?? d.amount ?? 0)
  const fromUser = (tipObj.fromUser ?? d.fromUser) as Record<string, unknown> | undefined
  if (!fromUser || typeof fromUser !== 'object') throw new Error('missing fromUser')
  return {
    accountId,
    tip: {
      amount,
      fromUser: {
        id: String(fromUser.id ?? ''),
        username: String(fromUser.username ?? ''),
        name: String(fromUser.name ?? ''),
      },
    },
  }
}

async function handleFanSummaryCompleted(
  supabase: ReturnType<typeof createClient>,
  data: unknown,
) {
  if (!data || typeof data !== 'object') return
  const d = data as Record<string, unknown>
  const accountId = String(d.accountId ?? d.account_id ?? '')
  const fanRaw = d.fanId ?? d.fan_id ?? d.userId
  const fanObj = typeof d.fan === 'object' && d.fan !== null ? (d.fan as Record<string, unknown>) : null
  const fanId = fanRaw ?? fanObj?.id
  if (!accountId || fanId == null) return

  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'onlyfans')
    .eq('access_token', accountId)
    .maybeSingle()

  if (!connection) return

  const summary = d.summary ?? d.data ?? d
  await supabase.from('fan_ai_summaries').upsert(
    {
      user_id: connection.user_id,
      platform_fan_id: String(fanId),
      status: 'completed',
      summary_json: typeof summary === 'object' && summary !== null ? summary : { value: summary },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,platform_fan_id' },
  )
}

async function handleTransactionNew(supabase: ReturnType<typeof createClient>, data: unknown) {
  if (!data || typeof data !== 'object') return
  const d = data as Record<string, unknown>
  const accountId = String(d.accountId ?? d.account_id ?? '')
  const amount = Number(d.amount ?? 0)
  const user = (d.user ?? d.fromUser) as Record<string, unknown> | undefined
  const uid = user && typeof user === 'object' ? String(user.id ?? '') : ''
  if (!accountId || !amount || !uid) return

  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'onlyfans')
    .eq('access_token', accountId)
    .maybeSingle()

  if (!connection) return

  await supabase
    .rpc('increment_fan_spending', {
      p_user_id: connection.user_id,
      p_fan_id: uid,
      p_amount: amount,
    })
    .catch(() => undefined)
}

async function handleChatQueueEvent(
  supabase: ReturnType<typeof createClient>,
  data: unknown,
  eventType: string,
) {
  if (!data || typeof data !== 'object') return
  const d = data as Record<string, unknown>
  const accountId = String(d.accountId ?? d.account_id ?? '')
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'onlyfans')
    .eq('access_token', accountId)
    .maybeSingle()

  if (!connection) return

  const title = eventType === 'chat_queue.finished' ? 'Mass message finished' : 'Mass message queue updated'
  const desc =
    typeof d.progress === 'string'
      ? d.progress
      : typeof d.message === 'string'
        ? d.message
        : 'Campaign queue update'

  await supabase.from('notifications').insert({
    user_id: connection.user_id,
    type: 'message',
    title,
    description: desc,
    link: '/dashboard/messages',
    read: false,
    platform: 'onlyfans',
  })
}

async function handleMessageDeleted(supabase: ReturnType<typeof createClient>, data: unknown) {
  if (!data || typeof data !== 'object') return
  const d = data as Record<string, unknown>
  const messageId = d.messageId ?? d.message_id ?? d.id
  if (messageId == null) return
  await supabase.from('messages').delete().eq('platform_message_id', String(messageId))
}
