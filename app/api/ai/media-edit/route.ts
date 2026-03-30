import { NextResponse } from 'next/server'
import { z } from 'zod'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

const bodySchema = z.discriminatedUnion('operation', [
  z.object({
    operation: z.literal('blur'),
    imageBase64: z.string().min(20),
    sigma: z.number().min(0.3).max(40).optional(),
  }),
  z.object({
    operation: z.literal('lighting'),
    imageBase64: z.string().min(20),
    brightness: z.number().min(0.65).max(1.35).optional(),
  }),
  z.object({
    operation: z.literal('emoji'),
    imageBase64: z.string().min(20),
    emoji: z.string().min(1).max(8),
    xPercent: z.number().min(0).max(100),
    yPercent: z.number().min(0).max(100),
    sizePercent: z.number().min(3).max(40).optional(),
  }),
])

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | { error: string } {
  const m = /^data:(image\/(?:png|jpeg|jpg));base64,(.+)$/i.exec(dataUrl.trim())
  if (!m) {
    const raw = dataUrl.includes('base64,') ? dataUrl.split('base64,')[1] : dataUrl
    try {
      const buffer = Buffer.from(raw, 'base64')
      if (buffer.length < 32) return { error: 'Invalid image' }
      if (buffer.length > 14 * 1024 * 1024) return { error: 'Image too large' }
      return { buffer, mime: 'image/jpeg' }
    } catch {
      return { error: 'Invalid base64' }
    }
  }
  const mime = m[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : m[1].toLowerCase()
  try {
    const buffer = Buffer.from(m[2], 'base64')
    if (buffer.length < 32) return { error: 'Invalid image' }
    if (buffer.length > 14 * 1024 * 1024) return { error: 'Image too large' }
    return { buffer, mime }
  } catch {
    return { error: 'Invalid base64' }
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const json = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }
  const body = parsed.data

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('ai_credits_used, ai_credits_limit')
    .eq('user_id', user.id)
    .maybeSingle()

  const used = (subscription as { ai_credits_used?: number } | null)?.ai_credits_used ?? 0
  const limit = (subscription as { ai_credits_limit?: number } | null)?.ai_credits_limit ?? 100
  if (limit < 999999 && used >= limit) {
    return NextResponse.json({ error: 'AI credits exhausted' }, { status: 402 })
  }

  const parsedImg = parseDataUrl(body.imageBase64)
  if ('error' in parsedImg) {
    return NextResponse.json({ error: parsedImg.error }, { status: 400 })
  }

  const base = sharp(parsedImg.buffer).rotate()
  const meta = await base.metadata()
  if (!meta.width || !meta.height) {
    return NextResponse.json({ error: 'Could not read image dimensions' }, { status: 400 })
  }
  const w = meta.width
  const h = meta.height
  if (w > 6000 || h > 6000) {
    return NextResponse.json({ error: 'Image dimensions too large' }, { status: 400 })
  }

  try {
    let out: Buffer
    if (body.operation === 'blur') {
      const sigma = body.sigma ?? 10
      out = await base.clone().blur(sigma).jpeg({ quality: 88 }).toBuffer()
    } else if (body.operation === 'lighting') {
      const b = body.brightness ?? 1.08
      out = await base.clone().modulate({ brightness: b, saturation: 1 }).jpeg({ quality: 88 }).toBuffer()
    } else {
      const emoji = body.emoji
      const sizePct = body.sizePercent ?? 12
      const fontSize = Math.max(16, Math.round((Math.min(w, h) * sizePct) / 100))
      const cx = Math.round((w * body.xPercent) / 100)
      const cy = Math.round((h * body.yPercent) / 100)
      const svg = Buffer.from(
        `<svg width="${w}" height="${h}"><text x="${cx}" y="${cy}" font-size="${fontSize}" dominant-baseline="middle" text-anchor="middle">${escapeXml(emoji)}</text></svg>`,
      )
      const overlay = await sharp(svg).png().toBuffer()
      const raster = await base.clone().png().toBuffer()
      out = await sharp(raster).composite([{ input: overlay, left: 0, top: 0 }]).jpeg({ quality: 88 }).toBuffer()
    }
    const b64 = out.toString('base64')
    const outUrl = `data:image/jpeg;base64,${b64}`

    if (limit < 999999) {
      await supabase
        .from('subscriptions')
        .update({ ai_credits_used: used + 1 })
        .eq('user_id', user.id)
    }

    return NextResponse.json({
      imageBase64: outUrl,
      operation: body.operation,
      creditsUsed: limit < 999999 ? used + 1 : used,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Image processing failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
