# ADR 001: PWA first, Capacitor second, Expo last

## Status

Accepted — aligns with [mobile-app.md](../mobile-app.md).

## Context

Creatix is a Next.js + Supabase product with a large dashboard. The team may want “a mobile app” without maintaining two full UIs.

## Decision

1. **PWA** — Installable web via the Web App Manifest; same deploy and codebase as the website; Supabase cookie auth unchanged.
2. **Capacitor** — Optional native shell loading the **same HTTPS origin** in a WebView when App Store / Play presence or push is required.
3. **Expo / React Native** — Only for a **narrow** scope later (e.g. messages + notifications) if WebView limits are hit; implies shared API contracts and heavier auth work (PKCE, SecureStore).

## Consequences

- **Positive:** One primary UI; API routes remain the integration surface for any client.
- **Negative:** Native UI polish and offline-first require a later investment if product demands it.
