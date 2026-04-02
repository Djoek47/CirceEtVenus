# HTTP API surface (incremental)

**Purpose:** Give humans and **non-browser clients** (PWA, Capacitor WebView, future Expo) a map of **Route Handlers** under `app/api/`. This file is **not** exhaustive on day one—extend it when you add or materially change routes.

**Rules for mobile / native clients**

- Do **not** depend on **RSC HTML** or layout as a stable contract. Use **`/api/*`** and Supabase client libraries with the same auth model as the web app.
- **Web / PWA:** session is usually **cookie**-based (`createClient()` from `lib/supabase/server.ts`).
- **Native (Expo):** send **`Authorization: Bearer <access_token>`** (Supabase session JWT). Route Handlers that call **`createRouteHandlerClient(request)`** from [`lib/supabase/route-handler.ts`](../lib/supabase/route-handler.ts) accept Bearer **or** cookies. Migrate new routes to that helper when native needs them; until then, cookie-only routes won’t work from the Expo app. The in-repo client lives at [`apps/mobile/lib/api.ts`](../apps/mobile/lib/api.ts); a standalone Expo clone uses the same pattern.

## Groups (starter index)

| Prefix | Purpose |
|--------|---------|
| `app/api/ai/*` | AI tools: captions, churn, divine manager chat/realtime, media edit, message suggestions, mass DM helpers, etc. |
| `app/api/community/*` | Community tips (creator submissions). |
| `app/api/content/*` | Content vault, import, publish. |
| `app/api/cron/*` | Scheduled jobs (housekeeping, divine manager). |
| `app/api/divine/*` | Divine Manager: mimic, intents, DM thread, voice, fan profile, notifications briefing, etc. |
| `app/api/dmca/*` | DMCA claims and proof uploads. |
| `app/api/fansly/*` | Fansly: auth, sync, conversations, webhooks, notifications stub. |
| `app/api/leaks/*` | Leak scan and alerts. |
| `app/api/messages/*` | Mass messages and **mass segment** AI (`messages/mass/segments`). |
| `app/api/onlyfans/*` | OnlyFans: auth, sync, chats, messages, fans, media, analytics, webhooks, mass send, etc. |
| `app/api/platforms/*` | Platform niches and related updates. |
| `app/api/profile/*` | Profile / community links. |
| `app/api/proxy/*` | Image proxy for CDN media. |
| `app/api/revenue/*` | Revenue aggregation. |
| `app/api/social/*` | Social connect, reputation, mentions, scans. |
| `app/api/stripe/*` | Stripe webhooks and billing-related server paths. |
| `app/api/user/*` | User API keys, notification preferences, identity scan. |
| `app/api/contact` | Contact form (if enabled). |
| `app/api/chat` | Generic chat route (if used). |

**`apps/mobile` (Expo)** uses Bearer `apiFetch` for routes above where implemented, plus direct Supabase reads for dashboard lists (`content`, `fans`, `leak_alerts`, `reputation_mentions`, `analytics_snapshots`, etc.). Deep links: `creatix://` — see [`apps/mobile/lib/linking.ts`](../apps/mobile/lib/linking.ts).

## Aliases / deprecation

- **`app/api/ai/mass-dm-segments`** re-exports the canonical **`POST app/api/messages/mass/segments`** — keep one implementation; see route file comments.

## Maintenance

When you add a **new public API** or change **auth requirements**, add one line under the right group (or add a group) and reference the PR.

## Recent additions

- `POST app/api/ai/mimic-test-realtime` — WebRTC SDP handshake for Realtime Mimic interrogatory voice sessions (intro + adaptive Q/A flow).
- `POST app/api/divine/voice-tool` — now also supports Mimic voice tools: `mimic_record_answer` (live transcript persistence) and `mimic_finalize_interview` (profile refinement + persist to `divine_manager_settings.mimic_profile`).
