import type { NextRequest } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from './server'

/**
 * Supabase client for Next.js Route Handlers (app/api/.../route.ts).
 *
 * Web and PWA use the existing cookie session via createClient from server.ts.
 * Native (Expo): send Authorization Bearer access_token from the Supabase session.
 *
 * Migrate handlers incrementally; until migrated, routes only support cookie auth.
 */
export async function createRouteHandlerClient(
  request: NextRequest,
): Promise<SupabaseClient> {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null

  if (token) {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      },
    )
  }

  return createClient()
}
