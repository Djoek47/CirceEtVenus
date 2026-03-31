# Circe et Venus — Expo (`apps/mobile`)

Native app in the **same repo** as the Next.js API. Uses the same **Supabase** project and **`/api/*`** with **`Authorization: Bearer`** (see root `lib/supabase/route-handler.ts`).

## Setup

```bash
cd apps/mobile
cp .env.example .env
# Set EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_API_URL (HTTPS origin of the web app)
npm install
npm start
```

From the **monorepo root**: `npm run mobile` (if defined in root `package.json`).

### CI / lockfile

- Prefer **`pnpm install --frozen-lockfile`** at the **repository root** when the root `pnpm-lock.yaml` is the source of truth for the monorepo.
- After changing `apps/mobile/package.json` dependencies (for example `react-native-webrtc`), refresh the root lockfile with `pnpm install` at the root (or the package manager your CI uses) so CI stays reproducible.

## Production build (EAS)

- Config: [`app.config.ts`](./app.config.ts) — display name, `slug`, `version`, iOS `bundleIdentifier` / `buildNumber`, Android `package` / `versionCode`, dark splash (`#0a0a0a`).
- Profiles: [`eas.json`](./eas.json) — `development` (dev client), `preview` (internal), `production` (`autoIncrement` for store builds).
- Link a project: `npx eas-cli login` then `eas init`. Set `EAS_PROJECT_ID` or `EXPO_PUBLIC_EAS_PROJECT_ID` (see [`.env.example`](./.env.example)) so `extra.eas.projectId` is populated — required for **Expo push tokens** / `getExpoPushTokenAsync` if you add `expo-notifications`. Helper: [`lib/push-helpers.ts`](./lib/push-helpers.ts).

```bash
npx eas-cli build --profile production --platform all
```

### Build checklist (auth + UI updates)

1. **EAS / local env:** `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and `EXPO_PUBLIC_API_URL` must match your deployed Next app and Supabase project (Vercel env does **not** apply to the native app — set secrets in EAS or `.env` before `eas build` / `expo start`).
2. **Rebuild** the dev client or reinstall after changing `EXPO_PUBLIC_*` (values are inlined at bundle time).
3. Reload the app so drawer header (`MainHeaderNav`) and `apiFetch` Bearer refresh changes are picked up.

### Divine voice (OpenAI Realtime / WebRTC)

- **Expo Go** does not ship the native WebRTC stack used by `react-native-webrtc`. Use an **EAS development build** (`eas build --profile development`) to test microphone + Divine Realtime voice against `/api/ai/divine-manager-realtime`.
- The Next.js deployment must have a valid **`OPENAI_API_KEY`** (`sk-…`) for that route (same requirement as the web app).
- Microphone permission copy is declared in [`app.config.ts`](./app.config.ts) (`NSMicrophoneUsageDescription`, Android `RECORD_AUDIO`).

### Push notifications (optional)

If you add `expo-notifications`, guard `getExpoPushTokenAsync` with `hasEasProjectIdForPush()` from [`lib/push-helpers.ts`](./lib/push-helpers.ts) so dev builds without a project id do not crash.

## Dual-repo workflow

If you also maintain a **standalone** clone (e.g. `../creatix-mobile`), push both from the web repo with [`../../scripts/push-all.sh`](../../scripts/push-all.sh). See [`docs/MOBILE_APP_REPO.md`](../../docs/MOBILE_APP_REPO.md).

## Features (high level)

- **Responsive UI:** [`hooks/use-responsive.ts`](./hooks/use-responsive.ts) scales type/spacing from window width; **Reanimated** entry animations on dashboard, community, divine shell.
- **Motion tokens:** [`constants/motion.ts`](./constants/motion.ts).
- **Media:** [`expo-image-picker`](./hooks/use-image-pick.ts) — demo in **Settings → Media**; permissions declared in `app.config.ts` + plugin.
- **Messages:** OnlyFans thread at [`app/(main)/messages/`](./app/(main)/messages/) (list + `[fanId]`).
- **Divine Manager:** [`app/(main)/divine-manager.tsx`](./app/(main)/divine-manager.tsx) — text chat (`/api/ai/divine-manager-chat`), intent confirmation (`/api/divine/intent`), settings (`/api/divine/manager-settings`), voice hook [`hooks/use-divine-voice-session.ts`](./hooks/use-divine-voice-session.ts) (native WebRTC + `/api/divine/voice-tool`).

## Contract

[`docs/API_SURFACE.md`](../../docs/API_SURFACE.md)
