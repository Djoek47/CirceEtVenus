/**
 * DB-backed reputation / leak identity edits for Divine tools (no HTTP loopback).
 * Normalization matches app/api/social/reputation-identity/route.ts where applicable.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeScanHandle } from '@/lib/scan-identity'

function normalizeManualHandlesList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const x of raw) {
    if (typeof x !== 'string') continue
    const n = normalizeScanHandle(x)
    if (!n || seen.has(n.toLowerCase())) continue
    seen.add(n.toLowerCase())
    out.push(n)
  }
  return out
}

function toHandleArray(input: unknown): string[] {
  if (typeof input === 'string' && input.trim()) return [normalizeScanHandle(input)].filter(Boolean)
  if (!Array.isArray(input)) return []
  return input
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((s) => normalizeScanHandle(s))
    .filter(Boolean)
}

function normalizeStringArrayUnique(raw: string[], maxLen = 80): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of raw) {
    const t = s.trim().slice(0, 500)
    if (!t) continue
    const k = t.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
    if (out.length >= maxLen) break
  }
  return out
}

export async function addReputationManualHandles(
  supabase: SupabaseClient,
  userId: string,
  handles: string[],
): Promise<{ ok: true; handles: string[] } | { ok: false; error: string }> {
  const add = normalizeStringArrayUnique(handles)
  if (!add.length) return { ok: false, error: 'No valid handles to add.' }

  const { data: row, error: fetchErr } = await supabase
    .from('profiles')
    .select('reputation_manual_handles')
    .eq('id', userId)
    .maybeSingle()
  if (fetchErr) return { ok: false, error: fetchErr.message }

  const current = normalizeManualHandlesList((row as { reputation_manual_handles?: unknown })?.reputation_manual_handles)
  const merged = normalizeStringArrayUnique([...current, ...add])

  const { error } = await supabase.from('profiles').update({ reputation_manual_handles: merged }).eq('id', userId)
  if (error) return { ok: false, error: error.message }
  return { ok: true, handles: merged }
}

export async function removeReputationManualHandles(
  supabase: SupabaseClient,
  userId: string,
  handles: string[],
): Promise<{ ok: true; handles: string[] } | { ok: false; error: string }> {
  const removeSet = new Set(toHandleArray(handles).map((h) => h.toLowerCase()))
  if (!removeSet.size) return { ok: false, error: 'No valid handles to remove.' }

  const { data: row, error: fetchErr } = await supabase
    .from('profiles')
    .select('reputation_manual_handles')
    .eq('id', userId)
    .maybeSingle()
  if (fetchErr) return { ok: false, error: fetchErr.message }

  const current = normalizeManualHandlesList((row as { reputation_manual_handles?: unknown })?.reputation_manual_handles)
  const next = current.filter((h) => !removeSet.has(h.toLowerCase()))

  const { error } = await supabase.from('profiles').update({ reputation_manual_handles: next }).eq('id', userId)
  if (error) return { ok: false, error: error.message }
  return { ok: true, handles: next }
}

export async function addLeakSearchIdentities(
  supabase: SupabaseClient,
  userId: string,
  former_usernames?: string[],
  leak_search_title_hints?: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: row, error: fetchErr } = await supabase
    .from('profiles')
    .select('former_usernames, leak_search_title_hints')
    .eq('id', userId)
    .maybeSingle()
  if (fetchErr) return { ok: false, error: fetchErr.message }

  const former = Array.isArray((row as { former_usernames?: string[] | null })?.former_usernames)
    ? [...((row as { former_usernames: string[] }).former_usernames)]
    : []
  const hints = Array.isArray((row as { leak_search_title_hints?: string[] | null })?.leak_search_title_hints)
    ? [...((row as { leak_search_title_hints: string[] }).leak_search_title_hints)]
    : []

  if (former_usernames?.length) {
    former.push(...former_usernames.map((s) => normalizeScanHandle(s)).filter(Boolean))
  }
  if (leak_search_title_hints?.length) {
    hints.push(...leak_search_title_hints.map((s) => s.trim()).filter(Boolean))
  }

  const patch: Record<string, unknown> = {}
  if (former_usernames?.length) patch.former_usernames = normalizeStringArrayUnique(former)
  if (leak_search_title_hints?.length) patch.leak_search_title_hints = normalizeStringArrayUnique(hints)

  if (Object.keys(patch).length === 0) return { ok: false, error: 'Provide former_usernames and/or leak_search_title_hints.' }

  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function removeLeakSearchIdentities(
  supabase: SupabaseClient,
  userId: string,
  former_usernames?: string[],
  leak_search_title_hints?: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: row, error: fetchErr } = await supabase
    .from('profiles')
    .select('former_usernames, leak_search_title_hints')
    .eq('id', userId)
    .maybeSingle()
  if (fetchErr) return { ok: false, error: fetchErr.message }

  const former = Array.isArray((row as { former_usernames?: string[] | null })?.former_usernames)
    ? [...((row as { former_usernames: string[] }).former_usernames)]
    : []
  const hints = Array.isArray((row as { leak_search_title_hints?: string[] | null })?.leak_search_title_hints)
    ? [...((row as { leak_search_title_hints: string[] }).leak_search_title_hints)]
    : []

  const patch: Record<string, unknown> = {}
  if (former_usernames?.length) {
    const rm = new Set(former_usernames.map((s) => normalizeScanHandle(s).toLowerCase()).filter(Boolean))
    patch.former_usernames = former.filter((h) => !rm.has(normalizeScanHandle(h).toLowerCase()))
  }
  if (leak_search_title_hints?.length) {
    const rm = new Set(leak_search_title_hints.map((s) => s.trim().toLowerCase()).filter(Boolean))
    patch.leak_search_title_hints = hints.filter((h) => !rm.has(h.trim().toLowerCase()))
  }

  if (Object.keys(patch).length === 0) return { ok: false, error: 'Provide former_usernames and/or leak_search_title_hints to remove.' }

  const { error } = await supabase.from('profiles').update(patch).eq('id', userId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
