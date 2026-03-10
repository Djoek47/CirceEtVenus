import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

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
    const supabase = await createClient()

    // OnlyFansAPI webhook events based on their settings
    switch (event.type) {
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
      
      default:
        console.log('Unknown event type:', event.type)
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

  // Create notification
  await supabase.from('notifications').insert({
    user_id: connection.user_id,
    type: 'fan',
    title: 'New Subscriber',
    description: `${data.fan.name} just subscribed for $${data.fan.subscriptionPrice}`,
    link: '/dashboard/fans',
    read: false,
  })
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

  // Create Circe alert for churn
  await supabase.from('notifications').insert({
    user_id: connection.user_id,
    type: 'protection',
    title: 'Subscriber Lost',
    description: `${data.fan.name} (@${data.fan.username}) subscription expired`,
    link: '/dashboard/fans',
    read: false,
  })
}

// Handle new message
async function handleNewMessage(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : never, data: {
  accountId: string
  message: {
    id: string
    fromUser: { id: string; username: string; name: string }
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

  // Update fan's last activity
  await supabase.from('fans')
    .update({ last_activity_at: new Date().toISOString() })
    .eq('user_id', connection.user_id)
    .eq('platform_fan_id', data.message.fromUser.id)

  // Create an in-app notification for the new message
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

  await supabase.from('notifications').insert({
    user_id: connection.user_id,
    type: 'message',
    title: `New message from ${displayName}`,
    description: preview,
    link: `/dashboard/messages?fanId=${encodeURIComponent(data.message.fromUser.id)}`,
    read: false,
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

  // Create notification for large tips
  if (data.tip.amount >= 50) {
    await supabase.from('notifications').insert({
      user_id: connection.user_id,
      type: 'fan',
      title: data.tip.amount >= 100 ? 'Whale Alert!' : 'Big Tip Received',
      description: `${data.tip.fromUser.name} tipped $${data.tip.amount}`,
      link: '/dashboard/fans',
      read: false,
    })
  }
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
