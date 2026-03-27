import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { getPrefsForWebhook } from '@/lib/notification-preferences'

// Fansly Webhook – register URL in Fansly API Console: https://www.circeetvenus.com/api/fansly/webhook
// During phased cutover, keep https://www.cetv.app/api/fansly/webhook active temporarily.
// Set FANSLY_WEBHOOK_SECRET to verify signatures (header: x-fansly-signature, HMAC-SHA256 hex).
// Set FANSLY_WEBHOOK_ENABLED=true to accept webhooks.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const webhookEnabled = process.env.FANSLY_WEBHOOK_ENABLED === 'true'

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected))
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!webhookEnabled) {
      return NextResponse.json(
        { received: false, error: 'Fansly webhook disabled on this environment.' },
        { status: 403 },
      )
    }

    const rawBody = await request.text()
    const signature = request.headers.get('x-fansly-signature')
    const secret = process.env.FANSLY_WEBHOOK_SECRET
    if (secret && signature && !verifySignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    
    console.log('[v0] Fansly webhook received:', payload.event_type)
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Handle different event types
    switch (payload.event_type) {
      case 'new_subscription':
        await handleNewSubscription(supabase, payload)
        break
        
      case 'subscription_renewed':
        await handleSubscriptionRenewed(supabase, payload)
        break
        
      case 'subscription_expired':
        await handleSubscriptionExpired(supabase, payload)
        break
        
      case 'new_message':
        await handleNewMessage(supabase, payload)
        break
        
      case 'new_tip':
        await handleNewTip(supabase, payload)
        break
        
      case 'new_follower':
        await handleNewFollower(supabase, payload)
        break
        
      default:
        console.log('[v0] Unknown Fansly event type:', payload.event_type)
    }
    
    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 })
    
  } catch (error) {
    console.error('[v0] Fansly webhook error:', error)
    // Return 200 anyway to prevent retries for parsing errors
    return NextResponse.json({ received: true, error: 'Processing error' }, { status: 200 })
  }
}

// Handler functions for different event types

async function handleNewSubscription(supabase: ReturnType<typeof createClient>, payload: any) {
  const { account_id, subscriber } = payload.data
  
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'fansly')
    .eq('access_token', account_id)
    .single()
  if (!connection) return

  await supabase.from('fans').upsert(
    {
      user_id: connection.user_id,
      platform: 'fansly',
      platform_fan_id: subscriber.id,
      username: subscriber.username,
      display_name: subscriber.display_name || subscriber.username,
      avatar_url: subscriber.avatar || null,
      subscription_status: 'active',
      subscription_tier: subscriber.tier || 'subscriber',
      total_spent: subscriber.amount || 0,
      first_subscribed_at: new Date().toISOString(),
      last_interaction_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,platform,platform_fan_id' }
  )

  const prefs = await getPrefsForWebhook(supabase, connection.user_id)
  if (prefs.notify_new_subscriber) {
    await supabase.from('notifications').insert({
      user_id: connection.user_id,
      type: 'fan',
      title: 'New Subscriber',
      description: `${subscriber.display_name || subscriber.username} subscribed on Fansly`,
      link: '/dashboard/fans',
      read: false,
      platform: 'fansly',
      avatar_url: subscriber.avatar || undefined,
    })
  }
}

async function handleSubscriptionRenewed(supabase: ReturnType<typeof createClient>, payload: any) {
  const { account_id, subscriber } = payload.data
  
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'fansly')
    .eq('access_token', account_id)
    .single()
  if (!connection) return

  await supabase
    .from('fans')
    .update({
      subscription_status: 'active',
      total_spent: subscriber.total_spent || 0,
      last_interaction_at: new Date().toISOString(),
    })
    .eq('user_id', connection.user_id)
    .eq('platform', 'fansly')
    .eq('platform_fan_id', subscriber.id)
}

async function handleSubscriptionExpired(supabase: ReturnType<typeof createClient>, payload: any) {
  const { account_id, subscriber } = payload.data
  
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'fansly')
    .eq('access_token', account_id)
    .single()
  if (!connection) return

  const prefs = await getPrefsForWebhook(supabase, connection.user_id)
  await supabase
    .from('fans')
    .update({ subscription_status: 'expired' })
    .eq('user_id', connection.user_id)
    .eq('platform', 'fansly')
    .eq('platform_fan_id', subscriber.id)

  if (prefs.notify_subscription_expired) {
    const name = subscriber.display_name || subscriber.username || 'A fan'
    await supabase.from('notifications').insert({
      user_id: connection.user_id,
      type: 'protection',
      title: 'Subscriber Lost',
      description: `${name} subscription expired on Fansly`,
      link: '/dashboard/fans',
      read: false,
    })
  }
}

async function handleNewMessage(supabase: ReturnType<typeof createClient>, payload: any) {
  const { account_id, message, sender } = payload.data

  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'fansly')
    .eq('access_token', account_id)
    .single()
  if (!connection) return

  const { data: fanRow } = await supabase
    .from('fans')
    .select('id')
    .eq('user_id', connection.user_id)
    .eq('platform', 'fansly')
    .eq('platform_fan_id', sender.id)
    .maybeSingle()

  let fanId = fanRow?.id
  if (!fanId) {
    const { data: newFan } = await supabase
      .from('fans')
      .insert({
        user_id: connection.user_id,
        platform: 'fansly',
        platform_fan_id: sender.id,
        username: sender.username,
        display_name: sender.display_name || sender.username,
        avatar_url: sender.avatar || null,
        subscription_status: 'active',
      })
      .select('id')
      .single()
    fanId = newFan?.id
  }
  if (!fanId) return

  const { data: existingConvo } = await supabase
    .from('conversations')
    .select('id, unread_count')
    .eq('user_id', connection.user_id)
    .eq('platform', 'fansly')
    .eq('fan_id', fanId)
    .maybeSingle()

  let conversationId = existingConvo?.id
  if (!conversationId) {
    const { data: newConvo } = await supabase
      .from('conversations')
      .insert({
        user_id: connection.user_id,
        platform: 'fansly',
        fan_id: fanId,
      })
      .select('id')
      .single()
    conversationId = newConvo?.id
  }
  if (!conversationId) return

  await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_type: 'fan',
    content: message?.text ?? '',
    is_read: false,
  })

  const newUnread = (existingConvo?.unread_count ?? 0) + 1
  await supabase
    .from('conversations')
    .update({
      last_message_preview: (message?.text ?? '').slice(0, 200),
      last_message_at: new Date().toISOString(),
      unread_count: newUnread,
    })
    .eq('id', conversationId);

  const prefs = await getPrefsForWebhook(supabase, connection.user_id)
  if (prefs.notify_new_message) {
    const displayName = sender.display_name || sender.username ? `@${sender.username}` : 'a fan'
    const preview = (message.text || '').trim().slice(0, 140)
    await supabase.from('notifications').insert({
      user_id: connection.user_id,
      type: 'message',
      title: `New message from ${displayName}`,
      description: preview || 'Sent you a new message',
      link: `/dashboard/messages?fanId=${encodeURIComponent(sender.id)}`,
      read: false,
      platform: 'fansly',
      avatar_url: sender.avatar || undefined,
    })
  }
}

async function handleNewTip(supabase: ReturnType<typeof createClient>, payload: any) {
  const { account_id, tip, sender } = payload.data
  
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'fansly')
    .eq('access_token', account_id)
    .single()
  if (!connection) return

  const { data: fan } = await supabase
    .from('fans')
    .select('total_spent')
    .eq('user_id', connection.user_id)
    .eq('platform', 'fansly')
    .eq('platform_fan_id', sender.id)
    .maybeSingle()
  const newTotal = (Number(fan?.total_spent ?? 0)) + Number(tip?.amount ?? 0)
  await supabase
    .from('fans')
    .update({ total_spent: newTotal, last_interaction_at: new Date().toISOString() })
    .eq('user_id', connection.user_id)
    .eq('platform', 'fansly')
    .eq('platform_fan_id', sender.id)

  const prefs = await getPrefsForWebhook(supabase, connection.user_id)
  if (prefs.notify_new_tip && tip.amount >= 50) {
    await supabase.from('notifications').insert({
      user_id: connection.user_id,
      type: 'fan',
      title: tip.amount >= 100 ? 'Whale Alert!' : 'Big Tip Received',
      description: `${sender.display_name || sender.username} tipped $${tip.amount} on Fansly`,
      link: '/dashboard/messages?fanId=' + encodeURIComponent(sender.id),
      read: false,
      platform: 'fansly',
      avatar_url: sender.avatar || undefined,
    })
  }
}

async function handleNewFollower(supabase: ReturnType<typeof createClient>, payload: any) {
  const { account_id, follower } = payload.data
  
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'fansly')
    .eq('access_token', account_id)
    .single()
  if (!connection) return

  await supabase.from('fans').upsert(
    {
      user_id: connection.user_id,
      platform: 'fansly',
      platform_fan_id: follower.id,
      username: follower.username,
      display_name: follower.display_name || follower.username,
      avatar_url: follower.avatar || null,
      subscription_status: 'pending',
      subscription_tier: 'follower',
      total_spent: 0,
    },
    { onConflict: 'user_id,platform,platform_fan_id' }
  )
}
