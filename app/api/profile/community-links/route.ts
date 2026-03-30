import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_LINKS = 12
const MAX_LABEL = 80
const MAX_URL = 2000

export type CommunityLink = { id: string; label: string; url: string }

function isAllowedUrl(href: string): boolean {
  try {
    const u = new URL(href)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

function parseLinks(raw: unknown): CommunityLink[] {
  if (!Array.isArray(raw)) return []
  const out: CommunityLink[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const id = typeof o.id === 'string' && o.id.trim() ? o.id.trim().slice(0, 64) : crypto.randomUUID()
    const label = typeof o.label === 'string' ? o.label.trim().slice(0, MAX_LABEL) : ''
    const url = typeof o.url === 'string' ? o.url.trim().slice(0, MAX_URL) : ''
    if (!label || !url || !isAllowedUrl(url)) continue
    out.push({ id, label, url })
    if (out.length >= MAX_LINKS) break
  }
  return out
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase.from('profiles').select('community_links').eq('id', user.id).maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const links = parseLinks((data as { community_links?: unknown } | null)?.community_links)
  return NextResponse.json({ links })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { links?: unknown }
  const links = parseLinks(body.links)

  const { error } = await supabase
    .from('profiles')
    .update({ community_links: links, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ links })
}
