# Mobile app strategy (Creatix)

## Goal decision (recorded)

Pick one **primary** goal; the repo is structured so you can add the next phase without rewriting the web app.

| Primary goal | Lean toward | Creatix stance |
|--------------|---------------|------------------|
| **Fastest ship, one codebase, installable “app” from the browser** | **PWA** | **Default path** — [`app/manifest.ts`](../app/manifest.ts), standalone display, same Vercel deploy. |
| **App Store / Play + native APIs (camera, reliable push, badges)** | **Capacitor** (WebView to production URL) | **When PWA is not enough** — [`capacitor.config.ts`](../capacitor.config.ts) + [`mobile/README.md`](../mobile/README.md). |
| **Native navigation / focused mobile-only UX** | **Expo** (React Native) | **Narrow scope only** — [`apps/mobile/`](../apps/mobile/) or a separate clone; reuse `/api/*` + Bearer auth. |

**Confirmed default for this codebase:** optimize for **installable web (PWA)** first. Add **Capacitor** if you need **store listing** or **reliable push** beyond what mobile Safari allows for PWAs. Reserve **Expo** for **one or two** critical flows (see [Expo native](#expo-native-phase-2b)), not a full dashboard rewrite.

## Decision (Phase 1 shipped)

| Phase | Status | Notes |
|--------|--------|--------|
| **PWA** (installable web, one codebase) | **Implemented** | [`app/manifest.ts`](../app/manifest.ts) (`display: standalone`, icons), [`app/layout.tsx`](../app/layout.tsx) (`manifest`, `icons`, `appleWebApp`, `viewport`), [`public/android-chrome-*.png`](../public/android-chrome-192x192.png) |
| **Capacitor** (App Store / Play + WebView) | **Optional next** | [`capacitor.config.ts`](../capacitor.config.ts) + section below |
| **Expo / React Native** | **In-repo `apps/mobile` or separate repo** | See [Expo native](#expo-native-phase-2b) and [`MOBILE_APP_REPO.md`](./MOBILE_APP_REPO.md) |

**Chosen default:** ship **installable PWA first** (fastest, same deployment). Add **Capacitor** when you need store listings or **reliable push** (iOS PWA push is limited). **Expo** only if you build a separate native UX for a small set of flows.

### Repo layout (web vs mobile)

| Path | Role |
|------|------|
| [`app/`](app/) | Next.js UI (pages, layouts) — **website**; not duplicated for native shells. |
| [`app/api/`](app/api/) | HTTP API for **all** clients (browser, PWA, WebView, future Expo). |
| [`app/manifest.ts`](app/manifest.ts) | Web App Manifest (PWA install). |
| [`public/android-chrome-*.png`](../public/android-chrome-192x192.png), [`public/icon.png`](../public/icon.png) | PWA manifest icons (192/512) + general branding / JSON-LD. |
| [`capacitor.config.ts`](capacitor.config.ts) | Optional Capacitor: remote `server.url` loads production site. |
| [`www/`](www/) | Minimal `webDir` for Capacitor (placeholder); real content is served from `server.url`. |
| [`mobile/README.md`](mobile/README.md) | Notes for Capacitor shell output; **`ios/` / `android/`** at repo root after `cap add` are gitignored by default. |
| [`apps/mobile/`](../apps/mobile/) | **Expo app in this monorepo** (pnpm workspace + `pnpm-workspace.yaml`). Same Supabase + `/api/*` with Bearer tokens. Prefer a branch such as `feat/expo-native` until stable. |
| Standalone **Expo** repo | **Optional separate Git repository** — same contract; see [`docs/MOBILE_APP_REPO.md`](./MOBILE_APP_REPO.md). |
| Future `packages/shared` | Shared types/fetch helpers if you split further — see [ARCHITECTURE.md](./ARCHITECTURE.md). |

---

## Auth audit checklist (manual QA)

Run these on **iOS Safari**, **Android Chrome**, and (if using Capacitor) **in-app WebView**.

### Supabase email / magic link

- [ ] Sign-in and sign-up complete without losing session on refresh.
- [ ] Session persists after closing the tab; **dashboard** loads when returning within session lifetime.
- [ ] Sign out clears session and redirects as expected.

### OAuth / third-party (e.g. Google, if enabled)

- [ ] Popup or redirect completes; return URL lands on app with session.
- [ ] On **iOS**, if popups are blocked, fallback redirect still works.

### Integrations (OnlyFans / Fansly)

- [ ] Connect flows that open external or embedded browsers complete and return to Creatix with valid connection state.
- [ ] After reconnect, **Messages** and **sync** work without stale cookies.

### Cookies / storage (Safari ITP)

- [ ] No infinite redirect loops on `/dashboard` when authenticated.
- [ ] **Cookie consent** (if shown) does not block required auth cookies.

### PWA installed to Home Screen

- [ ] Installed app opens to correct origin (same as production URL).
- [ ] **Standalone** display: no unexpected browser chrome; `theme-color` / status bar look acceptable.

### Capacitor WebView (additional, when Phase 2a is enabled)

Run the **same** checks as Safari/Chrome inside the **in-app WKWebView / WebView** after `npx cap add ios|android` and loading `server.url`:

- [ ] **Supabase session** persists across cold start; refresh token rotation works (no silent logouts).
- [ ] **OAuth / Google** (if used): completes without blank window; if popups fail, **redirect** flow still lands on dashboard with session.
- [ ] **OnlyFans / Fansly** connect flows: external browser or SFSafariView returns to the app with cookies/state intact; reconnect works.
- [ ] **ITP / third-party cookies:** if an embed relies on 3P cookies, verify behavior in WebView (may differ from Safari).
- [ ] **Deep links:** universal links / intent filters open the expected `/dashboard/...` route inside the shell.

**Automation:** these are **manual** checks on real devices; record pass/fail and build in CI does not replace them.

---

## Capacitor (Phase 2a)

[`capacitor.config.ts`](../capacitor.config.ts) is ready for a **remote URL** load (no static export required).

### Setup (when you choose to add native shells)

```bash
pnpm add -D @capacitor/cli @capacitor/core @capacitor/ios @capacitor/android
npx cap init  # if not using existing config — or: npx cap sync
npx cap add ios
npx cap add android
```

Set `CAPACITOR_SERVER_URL` to your production origin (e.g. `https://www.circeetvenus.com`) before `cap sync`.

### Deep links (universal / app links)

Host on your **HTTPS** origin:

- **iOS:** `/.well-known/apple-app-site-association` (JSON, no extension)
- **Android:** `/.well-known/assetlinks.json`

Point `applinks:` / intent filters to paths you want to open inside the app (e.g. `/dashboard/messages`). Exact JSON depends on your Apple Team ID and Android signing cert — generate when you create store listings.

### Push notifications

- Use **Firebase Cloud Messaging** (Android) + **APNs** (iOS) with **`@capacitor/push-notifications`**, or a hosted provider (OneSignal, etc.).
- **Install:** `npm install @capacitor/push-notifications` → `npx cap sync` → configure native projects (Google Services plist/json, APNs keys).
- **Server-side:** trigger pushes from webhooks (e.g. new message) → your API → store device tokens → FCM/APNs. **Not wired in this repo** — comments in [`capacitor.config.ts`](../capacitor.config.ts) point here.

---

## Expo native (Phase 2b+)

The **Expo** app can live **`apps/mobile/`** in this repo (see [`apps/mobile/README.md`](../apps/mobile/README.md)) **or** a **separate repository** (same HTTP contract). It uses the **same Supabase project** and calls **`/api/*`** with **`Authorization: Bearer <access_token>`**. The Next app exposes this via **`createRouteHandlerClient`** in [`lib/supabase/route-handler.ts`](../lib/supabase/route-handler.ts); handlers must be migrated incrementally from cookie-only `createClient()`.

| Topic | Location / notes |
|--------|------------------|
| In-monorepo app | [`apps/mobile/`](../apps/mobile/) — `expo-router`, `lib/supabase.ts`, `lib/api.ts`, `contexts/auth.tsx` |
| Separate clone | [`docs/MOBILE_APP_REPO.md`](./MOBILE_APP_REPO.md) — e.g. `creatix-mobile` alongside this project |
| Env | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL` — see [`apps/mobile/.env.example`](../apps/mobile/.env.example) |
| URL scheme | `creatix` (see [`apps/mobile/app.config.ts`](../apps/mobile/app.config.ts)) — register in Supabase Auth redirect URLs if you add OAuth / magic links |
| Branching | Prefer **`feat/expo-native`** (or similar) for in-repo Expo work until the MVP is stable; same idea for a separate mobile repo |
| Expo Go vs EAS | **Expo Go** is fine for development with supported modules; use **EAS Dev Client** when you need custom native code |

**From the repo root:** `npm run mobile` runs `expo start` in `apps/mobile` (after `npm install` in `apps/mobile` or hoisted workspace install).

**Scope (1–2 flows only, Phase 2b):** Do **not** mirror every dashboard route. Ship **email/password auth** + **one API-backed screen** first (in-repo: **Community tips** via `GET /api/community/tips`). Then add **messages**, **settings**, or **Divine** only as separate vertical slices. Share **types** via hand-maintained duplicates or a future `packages/shared` — see [`API_SURFACE.md`](./API_SURFACE.md). **Do not** duplicate business rules in the native app.

**Auth:** **PKCE** + **expo-secure-store** for session storage; email/password matches the web app. OAuth requires extra redirect URL setup in the Supabase Dashboard.

---

## Service worker / offline

Not enabled by default. Adding **Workbox** or a custom SW can cache **static assets** only; **do not** cache authenticated `/api/*` responses without a deliberate strategy. Revisit if you need offline read-only views.
