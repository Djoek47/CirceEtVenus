import { NextResponse } from 'next/server'

/**
 * Placeholder until Fansly exposes a notifications feed in our wrapper.
 * UI merges empty array with Live tab (OF pull + webhooks remain primary).
 */
export async function GET() {
  return NextResponse.json({
    notifications: [] as unknown[],
    source: 'fansly',
    note: 'Fansly notification API not wired; webhook alerts still create rows server-side.',
  })
}
