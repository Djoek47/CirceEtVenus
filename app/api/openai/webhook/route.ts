import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * OpenAI Webhook (Standard Webhooks).
 *
 * Set OPENAI_WEBHOOK_SECRET in env (from OpenAI project webhook settings).
 * Register this URL in the OpenAI dashboard: https://www.circeetvenus.com/api/openai/webhook
 * During phased cutover, keep https://www.cetv.app/api/openai/webhook active temporarily.
 *
 * Verifies: webhook-id, webhook-timestamp, webhook-signature (HMAC-SHA256 over "id.timestamp.body").
 * Responds with 2xx quickly; handle heavy work async if needed.
 */

const TOLERANCE_SEC = 300 // reject if timestamp older than 5 minutes

function verifyStandardWebhook(
  rawBody: string,
  headers: { id?: string; timestamp?: string; signature?: string },
  secret: string
): boolean {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature) return false
  const now = Math.floor(Date.now() / 1000)
  const t = parseInt(timestamp, 10)
  if (Number.isNaN(t) || Math.abs(now - t) > TOLERANCE_SEC) return false
  const signedPayload = `${id}.${timestamp}.${rawBody}`
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('base64')
  const parts = signature.split(',').map((s) => s.trim())
  for (const part of parts) {
    if (part.startsWith('v1,')) {
      const sig = part.slice(3)
      try {
        if (
          Buffer.byteLength(sig) === Buffer.byteLength(expected) &&
          crypto.timingSafeEqual(Buffer.from(sig, 'base64'), Buffer.from(expected, 'base64'))
        ) {
          return true
        }
      } catch {
        // continue
      }
    }
  }
  return false
}

export async function POST(req: NextRequest) {
  const secret = process.env.OPENAI_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'OPENAI_WEBHOOK_SECRET not configured' },
      { status: 500 }
    )
  }

  const rawBody = await req.text()
  const webhookId = req.headers.get('webhook-id') ?? undefined
  const webhookTimestamp = req.headers.get('webhook-timestamp') ?? undefined
  const webhookSignature = req.headers.get('webhook-signature') ?? undefined

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return NextResponse.json(
      { error: 'Missing Standard Webhooks headers' },
      { status: 400 }
    )
  }

  const isValid = verifyStandardWebhook(
    rawBody,
    {
      id: webhookId,
      timestamp: webhookTimestamp,
      signature: webhookSignature,
    },
    secret
  )
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: { type?: string; [key: string]: unknown }
  try {
    payload = JSON.parse(rawBody) as { type?: string; [key: string]: unknown }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const eventType = payload.type ?? (payload as { event?: string }).event
  // Acknowledge immediately; use webhook-id for idempotency if you persist events
  switch (eventType) {
    case 'response.completed':
      // Async responses / batch completion notifications
      break
    case 'batch.completed':
      break
    case 'response.output_item.completed':
      break
    default:
      // Log unknown for debugging; still return 200
      if (eventType) {
        console.log('[openai/webhook] Unhandled event type:', eventType)
      }
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
