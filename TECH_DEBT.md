# TypeScript / tooling debt (release baseline)

`npx tsc --noEmit` still reports errors outside the release-cleanup scope. Fix incrementally when touching these areas.

| Area | Examples |
|------|-----------|
| Stripe SDK / actions | `app/actions/stripe.ts`, `app/api/stripe/webhook/route.ts` — subscription field typings, `RequestOptions.ui_mode` |
| Supabase generated types | Webhook `insert` payloads typed as `never` where DB types are not generated |
| AI SDK tool schemas | `app/api/ai/divine-manager-chat/route.ts` — `items` on nested object schemas vs current `zod`/AI SDK types |
| Streaming helpers | `toDataStreamResponse` vs `toTextStreamResponse` in some AI routes |
| OnlyFans / Fansly API wrappers | Option objects (`unreadOnly`, `before`) not in declared types |
| Misc routes | `app/api/cron/divine-manager/route.ts`, `app/api/fansly/sync/route.ts`, preferences route readonly fields |

Release cleanup touched files (`notifications`, mass segments API, `divine-manager` voice entry, `ai-tools-library`) are aligned with the compiler where we changed them.
