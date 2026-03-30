# Creatix mobile app (Expo) — separate repository

The **native Expo app** is **not** part of this Next.js repository. It lives in its **own Git repo** so mobile can ship on its own cadence (EAS, store listings) without cloning the full web codebase.

## Where it lives

- **This repo (web + API):** [github.com/Djoek47/CirceEtVenus](https://github.com/Djoek47/CirceEtVenus)
- **Local (mobile):** a sibling folder next to this clone, e.g. `../creatix-mobile`, or clone your separate Expo repo elsewhere.
- **GitHub (mobile):** create a second repository (e.g. `creatix-mobile`) and push the Expo project; see that repo’s `README.md`.

## Contract with this repo

- Same **Supabase** project (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
- Same **HTTPS API** (`EXPO_PUBLIC_API_URL` → this deployment’s origin).
- Route handlers that the app calls must support **`Authorization: Bearer`** via [`lib/supabase/route-handler.ts`](../lib/supabase/route-handler.ts).

## Setup (mobile repo)

See the mobile repository’s `README.md` (copy `.env.example` → `.env`, `npm install`, `npm start`).
