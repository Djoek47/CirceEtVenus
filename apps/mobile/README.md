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

### Push notifications (optional)

If you add `expo-notifications`, guard `getExpoPushTokenAsync` with `hasEasProjectIdForPush()` from [`lib/push-helpers.ts`](./lib/push-helpers.ts) so dev builds without a project id do not crash.

## Dual-repo workflow

If you also maintain a **standalone** clone (e.g. `../creatix-mobile`), push both from the web repo with [`../../scripts/push-all.sh`](../../scripts/push-all.sh). See [`docs/MOBILE_APP_REPO.md`](../../docs/MOBILE_APP_REPO.md).

## Features (high level)

- **Responsive UI:** [`hooks/use-responsive.ts`](./hooks/use-responsive.ts) scales type/spacing from window width; **Reanimated** entry animations on dashboard, community, divine shell.
- **Motion tokens:** [`constants/motion.ts`](./constants/motion.ts).
- **Media:** [`expo-image-picker`](./hooks/use-image-pick.ts) — demo in **Settings → Media**; permissions declared in `app.config.ts` + plugin.

## Contract

[`docs/API_SURFACE.md`](../../docs/API_SURFACE.md)
