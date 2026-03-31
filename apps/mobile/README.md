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
- Link a project: `npx eas-cli login` then `eas init` (adds `extra.eas.projectId` — optional until you ship).

```bash
npx eas-cli build --profile production --platform all
```

## Dual-repo workflow

If you also maintain a **standalone** clone (e.g. `../creatix-mobile`), push both from the web repo with [`../../scripts/push-all.sh`](../../scripts/push-all.sh). See [`docs/MOBILE_APP_REPO.md`](../../docs/MOBILE_APP_REPO.md).

## Features (high level)

- **Responsive UI:** [`hooks/use-responsive.ts`](./hooks/use-responsive.ts) scales type/spacing from window width; **Reanimated** entry animations on dashboard, community, divine shell.
- **Motion tokens:** [`constants/motion.ts`](./constants/motion.ts).
- **Media:** [`expo-image-picker`](./hooks/use-image-pick.ts) — demo in **Settings → Media**; permissions declared in `app.config.ts` + plugin.

## Contract

[`docs/API_SURFACE.md`](../../docs/API_SURFACE.md)
