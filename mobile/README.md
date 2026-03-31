# Mobile shells (Capacitor / native)

This folder is the **home for mobile-specific docs and scripts** that are not part of the Next.js app (`app/`).

## Relationship to the main repo

- **Website + API** live in the Next.js app at the repository root (`app/`, `app/api/`).
- **Installable PWA** is configured via [`app/manifest.ts`](../app/manifest.ts) and ships with the same deploy as the website.
- **Capacitor** ([`capacitor.config.ts`](../capacitor.config.ts)) loads the **deployed HTTPS URL** in a WebView; it does not duplicate React pages in this folder.

## After `npx cap add ios` / `npx cap add android`

Capacitor typically creates **`ios/`** and **`android/`** at the **repository root** (next to `capacitor.config.ts`), not inside `mobile/`. Those directories are **gitignored by default** (see [`.gitignore`](../.gitignore)) until the team decides to commit Xcode/Android Studio projects.

## Do not

- Put Next.js routes or `app/` code here — keep UI in `app/` and `components/`.
- Treat RSC HTML as a stable API for native apps — use [`app/api/`](../app/api/) and Supabase clients instead.

See [docs/mobile-app.md](../docs/mobile-app.md) and [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).
