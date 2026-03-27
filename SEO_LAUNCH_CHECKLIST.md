# SEO Launch Checklist

## Technical SEO

- [ ] `robots.txt` is served and `Host` points to `https://www.circeetvenus.com`
- [ ] `robots.txt` references `https://www.circeetvenus.com/sitemap.xml`
- [ ] `sitemap.xml` only emits canonical host URLs
- [ ] Legal and marketing routes in sitemap are real public paths (`/about`, `/contact`, `/privacy`, `/cookies`, `/terms`)
- [ ] Root metadata uses canonical `metadataBase`
- [ ] Organization JSON-LD uses canonical `url` and logo URL

## Search Console

- [ ] Add/verify Google Search Console property for `circeetvenus.com`
- [ ] Submit `https://www.circeetvenus.com/sitemap.xml`
- [ ] Keep secondary property for `cetv.app` during migration for monitoring

## Domain Migration Validation

- [ ] OAuth connect succeeds for Instagram/Twitter/TikTok on canonical host
- [ ] Stripe webhook deliveries are green on canonical host
- [ ] OnlyFans webhook deliveries are green on canonical host
- [ ] Fansly webhook deliveries are green on canonical host
- [ ] OpenAI webhook deliveries are green on canonical host
- [ ] No provider retry storms from old host after overlap period

## Finalization

- [ ] Remove legacy callback/webhook URLs from provider dashboards
- [ ] Enable full 301 redirect from `www.cetv.app` to `www.circeetvenus.com`
- [ ] Re-crawl canonical pages and validate indexing
