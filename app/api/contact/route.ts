import { NextRequest, NextResponse } from 'next/server'

// Simple contact endpoint.
// For production, set RESEND_API_KEY and SUPPORT_CONTACT_EMAIL in your env.
// If RESEND_API_KEY is missing, the route will return a 500 so you don't get silent failures.

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 },
      )
    }

    const apiKey = process.env.RESEND_API_KEY
    const toAddress =
      process.env.SUPPORT_CONTACT_EMAIL || 'support@circe-venus.com'

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Contact backend is not configured (missing RESEND_API_KEY). Please contact support directly by email.',
        },
        { status: 500 },
      )
    }

    const emailSubject =
      subject && subject !== 'other'
        ? `[Contact] ${subject} — ${name}`
        : `[Contact] Message from ${name}`

    const text = [
      `From: ${name} <${email}>`,
      subject ? `Topic: ${subject}` : '',
      '',
      message,
    ]
      .filter(Boolean)
      .join('\n')

    const resendRes = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:
          process.env.SUPPORT_FROM_EMAIL ||
          'Circe et Venus <support@circe-venus.com>',
        to: [toAddress],
        subject: emailSubject,
        reply_to: email,
        text,
      }),
    })

    if (!resendRes.ok) {
      const err = await resendRes.json().catch(() => ({}))
      return NextResponse.json(
        {
          error:
            err?.message ||
            `Failed to send message (status ${resendRes.status}). Please try again or email us directly.`,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error while sending message.',
      },
      { status: 500 },
    )
  }
}

