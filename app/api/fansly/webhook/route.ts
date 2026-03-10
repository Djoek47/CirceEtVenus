import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Fansly Webhook endpoint
// Register this URL in your Fansly API Console: https://app.apifansly.com
// URL: https://your-domain.com/api/fansly/webhook

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    // TODO: Verify webhook signature for security
    // const signature = request.headers.get('x-fansly-signature')
    // Verify signature using your webhook secret
    
    const payload = await request.json()
    
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
  
  // Find the user who owns this Fansly account
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'fansly')
    .eq('platform_user_id', account_id)
    .single()
  
  if (!connection) return
  
  await supabase
    .from('fans')
    .upsert({
      user_id: connection.user_id,
      platform: 'fansly',
      platform_fan_id: subscriber.id,
      username: subscriber.username,
      display_name: subscriber.display_name || subscriber.username,
      avatar_url: subscriber.avatar,
      subscription_tier: subscriber.tier || 'subscriber',
      total_spent: subscriber.amount || 0,
      is_active: true,
      subscribed_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,platform,platform_fan_id'
    })

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

async function handleSubscriptionRenewed(supabase: ReturnType<typeof createClient>, payload: any) {
  const { account_id, subscriber } = payload.data
  
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'fansly')
    .eq('platform_user_id', account_id)
    .single()
  
  if (!connection) return
  
  // Update fan record
  await supabase
    .from('fans')
    .update({
      is_active: true,
      total_spent: subscriber.total_spent || 0,
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
    .eq('platform_user_id', account_id)
    .single()
  
  if (!connection) return
  
  // Mark fan as inactive
  await supabase
    .from('fans')
    .update({ is_active: false })
    .eq('user_id', connection.user_id)
    .eq('platform', 'fansly')
    .eq('platform_fan_id', subscriber.id)
}

async function handleNewMessage(supabase: ReturnType<typeof createClient>, payload: any) {
  const { account_id, message, sender } = payload.data
  
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('user_id')
    .eq('platform', 'fansly')
    .eq('platform_user_id', account_id)
    .single()
  
  if (!connection) return
  
  // Find or create conversation
  const { data: existingConvo } = await supabase
    .from('conversations')
    .select('id')
    .eq('user_id', connection.user_id)
    .eq('platform', 'fansly')
    .eq('fan_platform_id', sender.id)
    .single()
  
  let conversationId = existingConvo?.id
  
  if (!conversationId) {
    const { data: newConvo } = await supabase
      .from('conversations')
      .insert({
        user_id: connection.user_id,
        platform: 'fansly',
        fan_platform_id: sender.id,
        fan_username: sender.username,
        fan_avatar: sender.avatar,
      })
      .select('id')
      .single()
    
    conversationId = newConvo?.id
  }
  
  if (conversationId) {
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: message.text,
        is_from_fan: true,
        platform_message_id: message.id,
      })

    await supabase
      .from('conversations')
      .update({
        last_message: message.text,
        last_message_at: new Date().toISOString(),
        unread_count: supabase.rpc('increment_unread', { conv_id: conversationId })
      })
      .eq('id', conversationId)

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
    .eq('platform_user_id', account_id)
    .single()
  
  if (!connection) return
  
  await supabase.rpc('increment_fan_spent', {
    p_user_id: connection.user_id,
    p_platform: 'fansly',
    p_fan_id: sender.id,
    p_amount: tip.amount
  })

  if (tip.amount >= 50) {
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
    .eq('platform_user_id', account_id)
    .single()
  
  if (!connection) return
  
  // Add follower as potential fan (not subscribed yet)
  await supabase
    .from('fans')
    .upsert({
      user_id: connection.user_id,
      platform: 'fansly',
      platform_fan_id: follower.id,
      username: follower.username,
      display_name: follower.display_name || follower.username,
      avatar_url: follower.avatar,
      subscription_tier: 'follower',
      total_spent: 0,
      is_active: false,
    }, {
      onConflict: 'user_id,platform,platform_fan_id',
      ignoreDuplicates: true
    })
}
