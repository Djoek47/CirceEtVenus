import type { SupabaseClient } from '@supabase/supabase-js'
import { createOnlyFansAPI } from '@/lib/onlyfans-api'
import type { HousekeepingListsConfig, HousekeepingSegmentKey } from '@/lib/divine-manager'

export async function syncHousekeepingListsForUser(
  supabase: SupabaseClient,
  userId: string,
  accessToken: string,
  config: HousekeepingListsConfig,
): Promise<{ ok: boolean; error?: string; details: string[] }> {
  const details: string[] = []
  if (!config.enabled || !config.segments?.length) {
    details.push('skipped: housekeeping disabled or no segments')
    return { ok: true, details }
  }

  const api = createOnlyFansAPI()
  api.setAccountId(accessToken)
  const autoCreate = config.auto_create_lists === true

  function unwrapListPayload(raw: unknown): { id: string; name?: string }[] {
    if (!raw || typeof raw !== 'object') return []
    const o = raw as Record<string, unknown>
    const arr = o.data ?? o.lists ?? o.items ?? raw
    if (!Array.isArray(arr)) return []
    return arr
      .map((row) => {
        if (!row || typeof row !== 'object') return null
        const r = row as Record<string, unknown>
        const id = r.id ?? r.userListId
        return id != null ? { id: String(id), name: r.name != null ? String(r.name) : undefined } : null
      })
      .filter((x): x is { id: string; name?: string } => x != null)
  }

  function unwrapUserIds(raw: unknown): string[] {
    if (!raw || typeof raw !== 'object') return []
    const o = raw as Record<string, unknown>
    const arr = o.data ?? o.users ?? o.items ?? raw
    if (!Array.isArray(arr)) return []
    const out: string[] = []
    for (const row of arr) {
      if (row == null) continue
      if (typeof row === 'string' || typeof row === 'number') {
        out.push(String(row))
        continue
      }
      if (typeof row === 'object') {
        const r = row as Record<string, unknown>
        const id = r.id ?? r.userId ?? r.user_id
        if (id != null) out.push(String(id))
      }
    }
    return out
  }

  const listsPayload = await api.listUserLists({ limit: 100, offset: 0 })
  let existingLists = unwrapListPayload(listsPayload)

  const defaultNames: Record<HousekeepingSegmentKey, string> = {
    whale_spend: 'Creatix — Whales',
    active_chatter: 'Creatix — Active chatters',
    cold: 'Creatix — Cold / low engagement',
  }

  async function resolveListId(rule: NonNullable<HousekeepingListsConfig['segments']>[number]): Promise<string | null> {
    if (rule.listId) return rule.listId
    const wantName = rule.listName || defaultNames[rule.segment]
    const found = existingLists.find((l) => l.name === wantName)
    if (found?.id) return found.id
    if (!autoCreate) return null
    const created = await api.createUserList(wantName)
    let id: unknown
    if (created && typeof created === 'object') {
      const o = created as Record<string, unknown>
      const d = o.data
      id = typeof d === 'object' && d !== null ? (d as Record<string, unknown>).id : o.id
    }
    if (id != null) {
      const sid = String(id)
      existingLists = [...existingLists, { id: sid, name: wantName }]
      details.push(`created list “${wantName}” (${sid})`)
      return sid
    }
    return null
  }

  async function fetchAllListUserIds(listId: string): Promise<Set<string>> {
    const ids = new Set<string>()
    let offset = 0
    const page = 100
    for (;;) {
      const res = await api.listUserListUsers(listId, { limit: page, offset })
      const chunk = unwrapUserIds(res)
      if (chunk.length === 0) break
      chunk.forEach((id) => ids.add(id))
      if (chunk.length < page) break
      offset += page
    }
    return ids
  }

  for (const rule of config.segments) {
    const listId = await resolveListId(rule)
    if (!listId) {
      details.push(`skip ${rule.segment}: no list (enable auto-create or set list ID)`)
      continue
    }

    const desired = new Set<string>()

    if (rule.segment === 'whale_spend') {
      const min = rule.spendMin ?? 500
      const top = await api.getFansTop({ limit: 200, offset: 0, sort: 'total' })
      const raw = top.data || []
      for (const row of raw) {
        const r = row as unknown as Record<string, unknown>
        const sp = Number(r.totalSpent ?? 0)
        const id = r.id != null ? String(r.id) : ''
        if (id && sp >= min) desired.add(id)
      }
    } else if (rule.segment === 'active_chatter') {
      const days = rule.chatDays ?? 7
      const cutoff = Date.now() - days * 86400000
      let offset = 0
      const page = 50
      for (let pageIdx = 0; pageIdx < 25; pageIdx++) {
        const conv = await api.getConversations({ limit: page, offset, order: 'recent' })
        const chats = conv.conversations || []
        if (chats.length === 0) break
        for (const c of chats) {
          const lm = c.lastMessage?.createdAt
          if (!lm) continue
          if (new Date(lm).getTime() >= cutoff) {
            const uid = c.user?.id
            if (uid) desired.add(String(uid))
          }
        }
        offset += page
        if (chats.length < page) break
      }
    } else if (rule.segment === 'cold') {
      const coldMax = rule.coldSpendMax ?? 50
      const activeDays = rule.chatDays ?? 14
      const activeCutoff = Date.now() - activeDays * 86400000
      const activeIds = new Set<string>()
      let offset = 0
      const page = 50
      for (let pageIdx = 0; pageIdx < 25; pageIdx++) {
        const conv = await api.getConversations({ limit: page, offset, order: 'recent' })
        const chats = conv.conversations || []
        if (chats.length === 0) break
        for (const c of chats) {
          const lm = c.lastMessage?.createdAt
          if (lm && new Date(lm).getTime() >= activeCutoff) {
            const uid = c.user?.id
            if (uid) activeIds.add(String(uid))
          }
        }
        offset += page
        if (chats.length < page) break
      }
      let off2 = 0
      for (let pageIdx = 0; pageIdx < 40; pageIdx++) {
        const pack = await api.getFansActive({ limit: page, offset: off2 })
        const raw = pack.data || []
        if (raw.length === 0) break
        for (const row of raw) {
          const r = row as unknown as Record<string, unknown>
          const id = r.id != null ? String(r.id) : ''
          const sp = Number(r.totalSpent ?? 0)
          if (id && !activeIds.has(id) && sp <= coldMax) desired.add(id)
        }
        off2 += page
        if (raw.length < page) break
      }
    }

    const current = await fetchAllListUserIds(listId)
    const toAdd = [...desired].filter((id) => !current.has(id))
    const toRemove = [...current].filter((id) => !desired.has(id))

    const batch = 40
    for (let i = 0; i < toAdd.length; i += batch) {
      await api.addUsersToUserList(listId, toAdd.slice(i, i + batch))
    }
    for (let i = 0; i < toRemove.length; i += batch) {
      const slice = toRemove.slice(i, i + batch)
      await Promise.all(slice.map((uid) => api.removeUserFromUserList(listId, uid)))
    }

    details.push(`${rule.segment}: +${toAdd.length} −${toRemove.length} (target ${desired.size})`)
  }

  await supabase
    .from('divine_manager_settings')
    .update({
      housekeeping_lists: {
        ...config,
        last_sync_at: new Date().toISOString(),
      } as object,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  return { ok: true, details }
}
