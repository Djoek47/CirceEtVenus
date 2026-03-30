/** Any Supabase client with `.from().insert()` (browser, service role, untyped DB). */
export type NotificationInsertClient = {
  from: (table: string) => {
    insert: (values: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }>
  }
}

export type DivineAppNotificationType =
  | 'message'
  | 'fan'
  | 'protection'
  | 'mention'
  | 'cosmic'
  | 'system'

/**
 * In-app Creatix notifications (Divine tab): DMCA/leaks, reputation, whale watch, billing, intents.
 */
export async function insertDivineAppNotification(
  supabase: NotificationInsertClient,
  userId: string,
  params: {
    type: DivineAppNotificationType
    title: string
    description: string
    link?: string
    platform?: 'onlyfans' | 'fansly' | null
    platform_fan_id?: string | null
    avatar_url?: string | null
    metadata?: Record<string, unknown>
  },
): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: userId,
    type: params.type,
    title: params.title.slice(0, 500),
    description: params.description.slice(0, 2000),
    link: params.link ?? '/dashboard/divine-manager',
    read: false,
    origin: 'divine_app',
    platform: params.platform ?? null,
    platform_fan_id: params.platform_fan_id ?? null,
    avatar_url: params.avatar_url ?? undefined,
    metadata: { ...(params.metadata ?? {}) },
  })
  if (error) {
    console.warn('[insertDivineAppNotification]', error.message)
  }
}
