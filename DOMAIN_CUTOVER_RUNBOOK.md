# Domain Cutover Runbook

Canonical domain: `https://www.circeetvenus.com`  
Legacy domain during migration: `https://www.cetv.app`

## 1) Environment variables

Set these in Vercel Production (and Preview as needed):

- `APP_URL=https://www.circeetvenus.com`
- `NEXT_PUBLIC_APP_URL=https://www.circeetvenus.com`

Keep both domains assigned to the same Vercel project during migration.

## 2) OAuth callback URLs (dual-registration window)

Register both callback hosts first, then remove `cetv.app` after stable verification.

- Instagram: `/api/instagram/callback`
- Twitter: `/api/twitter/callback`
- TikTok: `/api/tiktok/callback`

## 3) Webhook endpoints (dual-delivery window)

Configure providers to deliver to canonical host first. Keep legacy host active until no retries/failures.

- Stripe: `/api/stripe/webhook`
- OnlyFans: `/api/onlyfans/webhook`
- Fansly: `/api/fansly/webhook`
- OpenAI: `/api/openai/webhook`

## 4) Cutover sequence

1. Deploy canonical metadata + sitemap + robots.
2. Add canonical callback/webhook URLs in provider dashboards.
3. Validate OAuth and webhook traffic on canonical host.
4. Keep legacy host working for overlap period.
5. Remove legacy callback/webhook URLs.
6. Enable full-site redirect from `cetv.app` to `circeetvenus.com`.

## 5) Rollback

If failures occur:

1. Re-enable legacy provider callback/webhook URLs.
2. Disable full-site redirect.
3. Keep canonical metadata unchanged.
4. Re-test provider signatures and callback allowlists.
