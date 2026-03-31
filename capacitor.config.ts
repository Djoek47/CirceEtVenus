/**
 * Optional native shell: Capacitor loads the **deployed** Creatix site in a WebView (`server.url`).
 *
 * **Consumers:** Same as the website — not a separate React app; native projects are generated beside this file.
 *
 * **Setup:**
 * 1. `pnpm add -D @capacitor/cli @capacitor/core @capacitor/ios @capacitor/android`
 * 2. Set `CAPACITOR_SERVER_URL` (or `NEXT_PUBLIC_APP_URL`) to your **production** HTTPS origin (no trailing slash).
 * 3. `npx cap add ios` / `npx cap add android` — creates `ios/` and `android/` at repo root (gitignored until you commit them).
 * 4. `npx cap sync` — copy web assets and sync native config after changes.
 *
 * **Do not** point `server.url` at localhost in production builds; use a tunnel or staging URL for device testing.
 */
const serverUrl =
  process.env.CAPACITOR_SERVER_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'https://www.circeetvenus.com'

/**
 * Push (Phase 2a, when you need store + notifications):
 * - `npm install @capacitor/push-notifications` then `npx cap sync`
 * - Configure FCM (Android) + APNs (iOS); register device tokens with your backend.
 * - Server: trigger from webhooks (e.g. new message) → FCM/APNs. Not wired in this repo.
 *
 * Deep links: host `apple-app-site-association` + `assetlinks.json` on this origin; configure
 * Xcode / Android intent filters after `cap add`. See docs/mobile-app.md § Capacitor.
 */
const config = {
  appId: 'com.circeetvenus.creatix',
  appName: 'Creatix',
  webDir: 'www',
  server: {
    url: serverUrl.replace(/\/$/, ''),
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: false,
  },
} as const

export default config
