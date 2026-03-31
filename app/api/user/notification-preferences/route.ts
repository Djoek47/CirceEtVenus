import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase/route-handler'
import { mergeWithDefaults, type NotificationPreferences } from '@/lib/notification-preferences'

export async function GET(request: NextRequest) {
  const supabase = await createRouteHandlerClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('notification_preferences')
    .select('notify_new_message, notify_new_subscriber, notify_new_tip, notify_subscription_expired, notify_subscription_renewed')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const prefs = mergeWithDefaults(data)
  return NextResponse.json(prefs)
}

export async function PATCH(req: NextRequest) {
  const supabase = await createRouteHandlerClient(req)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const updates: Partial<NotificationPreferences> = {}
  if (typeof body.notify_new_message === 'boolean') updates.notify_new_message = body.notify_new_message
  if (typeof body.notify_new_subscriber === 'boolean') updates.notify_new_subscriber = body.notify_new_subscriber
  if (typeof body.notify_new_tip === 'boolean') updates.notify_new_tip = body.notify_new_tip
  if (typeof body.notify_subscription_expired === 'boolean') updates.notify_subscription_expired = body.notify_subscription_expired
  if (typeof body.notify_subscription_renewed === 'boolean') updates.notify_subscription_renewed = body.notify_subscription_renewed

  if (Object.keys(updates).length === 0) {
    const { data } = await supabase
      .from('notification_preferences')
      .select('notify_new_message, notify_new_subscriber, notify_new_tip, notify_subscription_expired, notify_subscription_renewed')
      .eq('user_id', user.id)
      .maybeSingle()
    return NextResponse.json(mergeWithDefaults(data))
  }

  const { data: row, error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('notify_new_message, notify_new_subscriber, notify_new_tip, notify_subscription_expired, notify_subscription_renewed')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(mergeWithDefaults(row))
}
