'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Fan Actions
export async function addFan(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('fans').insert({
    user_id: user.id,
    platform: formData.get('platform') as string,
    username: formData.get('username') as string,
    display_name: formData.get('display_name') as string || null,
    subscription_tier: formData.get('tier') as string || 'new',
    notes: formData.get('notes') as string || null,
  })

  if (error) throw error
  revalidatePath('/dashboard/fans', 'max')
}

export async function updateFan(fanId: string, data: Record<string, unknown>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('fans')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', fanId)
    .eq('user_id', user.id)

  if (error) throw error
  revalidatePath('/dashboard/fans', 'max')
}

export async function deleteFan(fanId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('fans')
    .delete()
    .eq('id', fanId)
    .eq('user_id', user.id)

  if (error) throw error
  revalidatePath('/dashboard/fans', 'max')
}

// Content Actions
export async function createContent(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const platforms = formData.getAll('platforms') as string[]
  const tags = (formData.get('tags') as string)?.split(',').map(t => t.trim()).filter(Boolean) || []

  const { error } = await supabase.from('content').insert({
    user_id: user.id,
    title: formData.get('title') as string,
    description: formData.get('description') as string || null,
    content_type: formData.get('content_type') as string || 'image',
    platforms,
    tags,
    status: formData.get('status') as string || 'draft',
    scheduled_at: formData.get('scheduled_at') ? new Date(formData.get('scheduled_at') as string).toISOString() : null,
  })

  if (error) throw error
  revalidatePath('/dashboard/content', 'max')
}

export async function updateContent(contentId: string, data: Record<string, unknown>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('content')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', contentId)
    .eq('user_id', user.id)

  if (error) throw error
  revalidatePath('/dashboard/content', 'max')
}

export async function deleteContent(contentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('content')
    .delete()
    .eq('id', contentId)
    .eq('user_id', user.id)

  if (error) throw error
  revalidatePath('/dashboard/content', 'max')
}

// Message Actions
export async function sendMessage(conversationId: string, content: string, isPPV = false, ppvPrice?: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_type: 'creator',
    content,
    is_ppv: isPPV,
    ppv_price: ppvPrice || null,
    sent_at: new Date().toISOString(),
  })

  if (error) throw error

  // Update conversation last message
  await supabase
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      last_message_preview: content.substring(0, 100),
    })
    .eq('id', conversationId)

  revalidatePath('/dashboard/messages', 'max')
}

// Profile Actions
export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: formData.get('fullName') as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) throw error
  revalidatePath('/dashboard/settings', 'max')
}

// Leak Alert Actions
export async function updateLeakAlertStatus(alertId: string, status: string, notes?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('leak_alerts')
    .update({
      status,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', alertId)
    .eq('user_id', user.id)

  if (error) throw error
  revalidatePath('/dashboard/protection', 'max')
}

// Reputation Mention Actions
export async function markMentionAsRead(mentionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('reputation_mentions')
    .update({ is_read: true })
    .eq('id', mentionId)
    .eq('user_id', user.id)

  if (error) throw error
  revalidatePath('/dashboard/mentions', 'max')
}
