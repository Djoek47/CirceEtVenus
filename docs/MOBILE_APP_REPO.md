# Creatix mobile app (Expo) — separate repository

The **native Expo app** can ship from **two places**:

1. **In-monorepo:** [`apps/mobile/`](../apps/mobile/) (same Git repo as Next.js).
2. **Standalone clone (optional):** e.g. `../creatix-mobile` — own Git history and store listings.

## Web + API contract

- **This repo (web + API):** [github.com/Djoek47/CirceEtVenus](https://github.com/Djoek47/CirceEtVenus) (also referenced as CirceEtVenus).
- Same **Supabase** (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
- Same **HTTPS API** (`EXPO_PUBLIC_API_URL` → deployed Next origin). See [`docs/API_SURFACE.md`](./API_SURFACE.md).
- Route handlers must support **`Authorization: Bearer`** via [`lib/supabase/route-handler.ts`](../lib/supabase/route-handler.ts).

## Push both repos from one machine

From the **web/API** repo root:

```bash
./scripts/push-all.sh
```

- Pushes the **current branch** to the default remote for this repo.
- If `../creatix-mobile` exists and is a Git repo, runs `git push` there too.
- Override path: `MOBILE_DIR=/path/to/expo ./scripts/push-all.sh`
- Preview only: `./scripts/push-all.sh --dry-run`
- **Release tags** (optional): `./scripts/push-all.sh --tag v1.0.0` — creates annotated tags (if missing) and `git push origin <tag>` on **each** repo that was pushed.

Commit in each repo separately; this script does not create commits.

## In-repo mobile (`apps/mobile`)

Use [`apps/mobile/README.md`](../apps/mobile/README.md) for EAS (`eas.json`), env, responsive/motion, and `expo-image-picker`.

If you maintain **only** a sibling clone, copy the same `app.config.ts` / `eas.json` / `.env.example` patterns from `apps/mobile/` when you sync.

## Setup (standalone mobile repo)

Copy `.env.example` → `.env`, `npm install`, `npm start`. Match `EXPO_PUBLIC_*` to the web app’s `NEXT_PUBLIC_*` / deployment URL.
