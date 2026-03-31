/**
 * User-facing copy for failed API responses from `apiFetch` / Next.js routes.
 */
export function formatApiScreenError(status: number, bodyError?: string | null): string {
  if (status === 401) {
    return 'Session expired or not signed in. Pull to refresh, or sign out and sign in again. Ensure EXPO_PUBLIC_API_URL matches your deployed site and uses the same Supabase project as this app.'
  }
  if (bodyError) return bodyError
  if (status === 0) return 'Network error — check connection and EXPO_PUBLIC_API_URL.'
  return `Request failed (${status})`
}
