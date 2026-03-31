# Creatix Mobile (`apps/mobile`)

Expo (React Native) app in the **same repo** as the Next.js backend. Uses the **same Supabase project** and **`/api/*` routes** with **`Authorization: Bearer`** (see `lib/supabase/route-handler.ts` at the repo root).

## Setup

```bash
cd apps/mobile
cp .env.example .env
# Fill EXPO_PUBLIC_* — mirror NEXT_PUBLIC_* from the web app’s .env.local
npm install
npm start
```

From the **repository root**, after installing `apps/mobile` deps: `npm run mobile`.

## Branching

Ship Expo work on a dedicated branch (e.g. `feat/expo-native`) until the MVP is stable; merge when ready.

## MVP slice (Phase 2b scope)

Per [`docs/mobile-app.md`](../../docs/mobile-app.md): **only** one or two flows at first — not full dashboard parity.

- Email/password auth (PKCE + SecureStore session storage)
- Home shell + **Community tips** (`GET /api/community/tips`) as the first API-backed screen
- Shared contract: [`docs/API_SURFACE.md`](../../docs/API_SURFACE.md); add types in `packages/shared` later if needed

## Expo Go vs EAS

**Expo Go** is fine for standard Expo modules. Use **EAS Dev Client** when you need custom native code.
