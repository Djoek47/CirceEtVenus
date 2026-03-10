/**
 * Default preferences when no row exists (e.g. before user has saved settings).
 * All platform activity notifications on by default so it feels "like using OnlyFans".
 */
export const DEFAULT_NOTIFICATION_PREFS = {
  notify_new_message: true,
  notify_new_subscriber: true,
  notify_new_tip: true,
  notify_subscription_expired: true,
  notify_subscription_renewed: false,
} as const

export type NotificationPreferences = typeof DEFAULT_NOTIFICATION_PREFS

export function mergeWithDefaults(prefs: Partial<NotificationPreferences> | null): NotificationPreferences {
  if (!prefs) return { ...DEFAULT_NOTIFICATION_PREFS }
  return {
    notify_new_message: prefs.notify_new_message ?? DEFAULT_NOTIFICATION_PREFS.notify_new_message,
    notify_new_subscriber: prefs.notify_new_subscriber ?? DEFAULT_NOTIFICATION_PREFS.notify_new_subscriber,
    notify_new_tip: prefs.notify_new_tip ?? DEFAULT_NOTIFICATION_PREFS.notify_new_tip,
    notify_subscription_expired: prefs.notify_subscription_expired ?? DEFAULT_NOTIFICATION_PREFS.notify_subscription_expired,
    notify_subscription_renewed: prefs.notify_subscription_renewed ?? DEFAULT_NOTIFICATION_PREFS.notify_subscription_renewed,
  }
}

/** Use from webhooks with service-role supabase to decide if we should create a notification. */
export async function getPrefsForWebhook(supabase: import('@supabase/supabase-js').SupabaseClient, userId: string): Promise<NotificationPreferences> {
  const { data } = await supabase
    .from('notification_preferences')
    .select('notify_new_message, notify_new_subscriber, notify_new_tip, notify_subscription_expired, notify_subscription_renewed')
    .eq('user_id', userId)
    .maybeSingle()
  return mergeWithDefaults(data as Partial<NotificationPreferences> | null)
}
