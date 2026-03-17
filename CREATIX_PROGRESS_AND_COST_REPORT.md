# Creatix – Full Progress & Cost Report

**Product:** Circe et Venus – Divine Creator Management (OnlyFans/Fansly-focused SaaS)  
**Stack:** Next.js 16, React 19, Supabase, Vercel, Stripe, AI (OpenAI, Anthropic, optional XAI/Grok)  
**Report date:** March 2025 (approximate)

**External pricing references:**
- [OnlyFans API – Pricing](https://onlyfansapi.com/pricing)  
- [Fansly API – Pricing](https://apifansly.com/pricing)

---

## 1. Executive summary

Creatix is a creator-management platform that combines **retention and protection** (Circe) with **growth and attraction** (Venus), plus a **meta-orchestrator** (Divine Manager) that suggests and can semi-automate tasks (posts, DMs, pricing). The app includes AI chat assistants, 20+ AI tools, platform integrations (OnlyFans, Fansly), billing (Stripe), and a full dashboard. This document lists **features**, **technical scope**, and **estimated costs** for AI, APIs, database, and hosting.

---

## 2. Feature inventory (full list)

### 2.1 Authentication & onboarding

| Feature | Description | Status |
|--------|-------------|--------|
| Login / Sign up | Email auth via Supabase Auth | Implemented |
| Sign-up success | Post-registration landing | Implemented |
| Onboarding | Tour / first-time flow | Implemented |
| Birthday (optional) | Encrypted birthday storage | Implemented |

### 2.2 Dashboard & navigation

| Feature | Description | Status |
|--------|-------------|--------|
| Main dashboard | Stats, revenue chart, recent fans, alerts, quick actions, platform widget, message activity | Implemented |
| Analytics | Analytics views and charts | Implemented |
| Content | Content library; create/schedule posts | Implemented |
| Fans | Fan list/CRM; tags, tiers | Implemented |
| Messages | Inbox; conversations; reply composer with Circe/Venus/Flirt suggestions and voice input | Implemented |
| Social | Social connections; reputation widgets | Implemented |
| Mentions | Reputation mentions feed | Implemented |
| Protection | Leak scanner, DMCA, Circe protection tools | Implemented |
| Settings | Profile, notifications, security, billing, integrations, data | Implemented |
| Guide | In-app guide | Implemented |

### 2.3 Divine Manager (“Big Pimping”)

| Feature | Description | Status |
|--------|-------------|--------|
| Entry & nav | Top-level “Divine Manager” in sidebar; dedicated page | Implemented |
| First-run wizard | 4 steps: Persona & boundaries → Archetype & notifications → Automation rules → Review & activate (mode, BETA acknowledgement) | Implemented |
| Manager console | Mode badge (Off / Suggest-only / Semi-automatic), Today’s Plan, Run manager, Approve/Edit/Dismiss on suggestions | Implemented |
| Voice companion | Play Intro Briefing, What next?, Ongoing coach toggle; browser TTS for script from `/api/ai/divine-manager-voice` | Implemented |
| Talk to your Manager | Chat UI calling `/api/ai/divine-manager-chat`; context-aware, advisory-only replies | Implemented |
| Reset | Button to clear settings and tasks and reopen wizard | Implemented |
| Backend | `divine_manager_settings`, `divine_manager_tasks`; brain + cron that create/schedule tasks; preference learning; semi-auto execution (placeholder) | Implemented |

### 2.4 AI Studio

| Feature | Description | Status |
|--------|-------------|--------|
| Overview | Cards for Circe, Venus, Tools, Cosmic, Chatter | Implemented |
| Circe tab | Retention-focused chat (streaming) | Implemented |
| Venus tab | Growth-focused chat (streaming) | Implemented |
| Tools tab | Grid of 20+ AI tools with categories (content, engagement, analytics, protection, premium) | Implemented |
| Tool runner | Per-tool forms and `/api/ai/tool-run` or dedicated routes | Implemented |
| Cosmic Calendar | Astrology-themed scheduling | Implemented |
| AI Chatter | Workspace for automated-style responses | Implemented |
| Flirt | Removed from AI Studio; available only in Messages as “Flirt Reply” (draft suggestions) | Implemented |

### 2.5 AI tools (library + APIs)

| Tool | Model / API | Credits (in-app) | Notes |
|------|-------------|------------------|--------|
| Caption Generator | OpenAI GPT-4o-mini | 1 | generateText |
| Fantasy Writer | OpenAI GPT-4o-mini | 2 | generateText |
| Content Ideas | OpenAI GPT-4o-mini | 1 | generateText |
| Aesthetic Matcher | OpenAI GPT-4o-mini | 1 | generateText |
| Mood Detector | OpenAI GPT-4o-mini | 1 | generateText |
| Gift Suggester | OpenAI GPT-4o-mini | 1 | generateText |
| Viral Predictor | OpenAI GPT-4o-mini | 2 | generateText |
| Churn Predictor | Anthropic Claude Sonnet 4 | 2 | streamText; Pro |
| Price Optimizer | Anthropic Claude Sonnet 4 | 2 | streamText; Pro |
| Revenue Optimizer | OpenAI GPT-4o-mini | – | generateText |
| Fan Prediction | OpenAI GPT-4o-mini | – | generateText |
| Photo Spots | OpenAI GPT-4o-mini | – | generateText |
| Voice Cloning | Anthropic Claude Sonnet 4 | 5 | Pro |
| Mass DM Composer | Anthropic Claude Sonnet 4 | – | Pro |
| Circe’s Oracle | XAI Grok (optional) | 4 | Pro; fallback if no XAI |
| Circe’s Transformation | XAI Grok (optional) | 4 | Pro |
| Venus’s Allure | XAI Grok (optional) | 4 | Pro |
| Venus Cupid | XAI Grok (optional) | 5 | Pro |
| Venus’s Garden | XAI Grok (optional) | 4 | Pro |
| Standard of Attraction | XAI or OpenAI | 3 | Pro |
| Chat suggestions (scan/circe/venus/flirt) | OpenAI or XAI (Pro) | – | Message composer |
| Leak scanner | Optional Grok enrichment | 3 | Protection |
| Reputation scan/analyze | OpenAI or XAI | – | Social |
| Divine Manager brain | OpenAI GPT-4o-mini | – | Task suggestions |
| Divine Manager voice | OpenAI GPT-4o-mini | – | Intro / what next / ongoing |
| Divine Manager chat | OpenAI GPT-4o-mini | – | Conversational manager |

### 2.6 Platform integrations

| Integration | Usage | Status |
|-------------|--------|--------|
| OnlyFans | OAuth, callback, sync, webhook, conversations, messages (single + mass), disconnect, check-connection | Implemented |
| Fansly | Auth, sync, webhook, conversations | Implemented |
| Stripe | Checkout, webhook, subscriptions, plan limits (ai_credits_limit, storage) | Implemented |
| TikTok | Auth, callback, sync, disconnect | Implemented |
| Twitter/X | Auth, callback, sync, disconnect | Implemented |
| Instagram | Auth, callback, sync, disconnect | Implemented |

### 2.7 Other backend

| Area | Description | Status |
|------|-------------|--------|
| DMCA | Claims, proofs, download; upload-url for proof storage | Implemented |
| Notifications | Table + preferences; platform avatar | Implemented |
| User API keys | CRUD for user-held API keys | Implemented |
| Revenue API | Revenue aggregation | Implemented |
| Cron | Divine Manager cron (brain + execute) with CRON_SECRET / x-vercel-cron | Implemented |
| Proxy | Image proxy for OnlyFans CDN | Implemented |
| Contact | Contact form | Implemented |

### 2.8 Public & SEO

| Feature | Description | Status |
|--------|-------------|--------|
| Marketing pages | Features, How it works, Pricing | Implemented |
| Legal | About, Terms, Privacy, Contact, Cookies | Implemented |
| Metadata | Titles, descriptions, canonical, Open Graph, Twitter | Implemented |
| robots.txt / sitemap | Config and XML sitemap | Implemented |
| JSON-LD | Organization (and similar) structured data | Implemented |
| GSC | Google Search Console verification (env-driven) | Implemented |

### 2.9 Complete feature list (single checklist)

Every feature in one list for reference:

- Login / Sign up (email auth)
- Sign-up success page
- Onboarding / first-time tour
- Encrypted birthday (optional)
- Main dashboard (stats, revenue chart, recent fans, alerts, quick actions, platform widget, message activity)
- Analytics (views and charts)
- Content library (create/schedule posts)
- Fans CRM (list, tags, tiers)
- Messages (inbox, conversations, reply composer with Circe/Venus/Flirt suggestions, voice input)
- Social (connections, reputation widgets)
- Mentions (reputation mentions feed)
- Protection (leak scanner, DMCA, Circe protection tools)
- Settings (profile, notifications, security, billing, integrations, data)
- In-app Guide
- Divine Manager nav and page
- Divine Manager first-run wizard (persona, archetype, notifications, automation rules, review & activate)
- Divine Manager console (mode badge, Today’s Plan, Run manager, Approve/Edit/Dismiss)
- Divine Manager voice companion (Intro, What next?, Ongoing coach, TTS)
- Talk to your Manager (chat)
- Divine Manager reset (clear settings/tasks, reopen wizard)
- Divine Manager backend (settings, tasks, brain, cron, preference learning, semi-auto placeholder)
- AI Studio overview (Circe, Venus, Tools, Cosmic, Chatter cards)
- Circe tab (retention chat, streaming)
- Venus tab (growth chat, streaming)
- AI Tools tab (20+ tools grid, categories)
- Tool runner (per-tool forms + API)
- Cosmic Calendar
- AI Chatter workspace
- Flirt (Messages only: “Flirt Reply” suggestions)
- Caption Generator (AI)
- Fantasy Writer (AI)
- Content Ideas (AI)
- Aesthetic Matcher (AI)
- Mood Detector (AI)
- Gift Suggester (AI)
- Viral Predictor (AI)
- Churn Predictor (AI, Pro)
- Price Optimizer (AI, Pro)
- Revenue Optimizer (AI)
- Fan Prediction (AI)
- Photo Spots (AI)
- Voice Cloning (AI, Pro)
- Mass DM Composer (AI, Pro)
- Circe’s Oracle (AI, Pro)
- Circe’s Transformation (AI, Pro)
- Venus’s Allure (AI, Pro)
- Venus Cupid (AI, Pro)
- Venus’s Garden (AI, Pro)
- Standard of Attraction (AI, Pro)
- Message suggestions in composer (scan / Circe / Venus / Flirt)
- Leak scanner (optional Grok)
- Reputation scan/analyze
- Divine Manager brain / voice / chat (AI)
- OnlyFans (OAuth, sync, webhook, conversations, messages, disconnect)
- Fansly (auth, sync, webhook, conversations)
- Stripe (checkout, webhooks, subscriptions, plan limits)
- TikTok / Twitter / Instagram (auth, sync, disconnect)
- DMCA (claims, proofs, download, proof upload)
- Notifications (table, preferences, platform avatar)
- User API keys (CRUD)
- Revenue API
- Divine Manager cron
- Image proxy (OnlyFans CDN)
- Contact form
- Marketing pages (Features, How it works, Pricing)
- Legal pages (About, Terms, Privacy, Contact, Cookies)
- Metadata, robots.txt, sitemap, JSON-LD, GSC

---

## 3. Platform API pricing (OnlyFans & Fansly)

Creatix relies on third-party platform APIs so creators can sync data and send messages. Your cost scales with **how many creator accounts** (OnlyFans/Fansly profiles) you connect, not just how many Creatix users you have.

### 3.A OnlyFans API ([onlyfansapi.com/pricing](https://onlyfansapi.com/pricing))

| Plan | Price | Accounts | Credits (monthly) | RPM |
|------|--------|----------|-------------------|-----|
| Free | $0 | 1 | 10 | 1,000 |
| Basic | $69/mo | 1 | 20,000 | 1,000 |
| **Pro** | **$299/mo** | **5 included** | **100,000 + 10k/account** | **5,000** |
| Enterprise | Quote | Custom | Custom | Custom |

- **Additional OnlyFans account (over 5):** **$10/account/month** (scale discounts on site: e.g. +20 accounts ~$26.1/account, +100 ~$20.3/account; we use **$10** as requested for this report).
- Pro scale discounts: +20 accounts 10% off, +50 20% off, … +500 60% off. For 100+ accounts consider [OnlyFans API scale discounts](https://onlyfansapi.com/pricing).

**Example OnlyFans API cost (using $10 per extra account):**

- 10 OF accounts → Pro $299 + 5×$10 = **$349/mo**
- 100 OF accounts → $299 + 95×$10 = **$1,249/mo**
- 1,000 OF accounts → $299 + 995×$10 = **$10,249/mo**
- 10,000 OF accounts → Enterprise (custom quote); or ballpark **~$100k+/mo** if linearly extended.

### 3.B Fansly API ([apifansly.com/pricing](https://apifansly.com/pricing))

| Plan | Price | Accounts | Credits (monthly) | RPM |
|------|--------|----------|-------------------|-----|
| Free | $0 | 1 | 30 | 100 |
| Starter | $49/mo | 2 | 24,000 | 600 |
| **Pro** | **$129/mo** | **5** | **60,000** | **1,000** |
| Enterprise | Custom | Custom | Custom | Unlimited |

- **Additional Fansly “users” (creator accounts):** treated here as **$10 per 1,000 users** (as specified). So: 1,000 Fansly accounts ≈ **$10/mo** extra; 10,000 accounts ≈ **$100/mo** extra.

**Example Fansly API cost (using $10 per 1,000 users):**

- 10 creators on Fansly → **~$0.10/mo** (negligible)
- 100 creators → **~$1/mo**
- 1,000 creators → **~$10/mo**
- 10,000 creators → **~$100/mo** (on top of base Pro or Enterprise)

*(If your contract is “per account” at different rates, replace the formula above with your actual Fansly pricing.)*

---

## 4. Pricing packages vs. feature access & costs

### 4.1 Plans we offer

Plans are defined in `lib/products.ts`:

| Plan ID | Name | Price / month | Core features |
|---------|------|---------------|---------------|
| `divine-trial` | **Divine Trial** | **$0** (14‑day trial) | 100 AI credits/month, 5GB storage, basic analytics, email support |
| `venus-pro` | **Venus Pro** | **$49/mo** | Unlimited AI credits, 50GB storage, advanced analytics, Venus growth tools, priority support, custom AI training |
| `circe-elite` | **Circe Elite** | **$99/mo** | Everything in Venus Pro + unlimited storage, Circe protection suite, advanced leak detection, white‑glove onboarding, dedicated account manager, API access |
| `divine-duo` | **Divine Duo** | **$199/mo** | Everything in Circe Elite + multi‑account management, team collaboration, custom integrations, revenue analytics, legal support access, priority feature requests |

Storage and AI credit limits are enforced via `subscriptions` and Stripe webhooks / actions:

- `divine-trial`: **100 AI credits**, **5GB** storage.
- `venus-pro`: **“Unlimited” AI credits**, **50GB** storage.
- `circe-elite`: **“Unlimited” AI credits**, **unlimited** storage (very high cap).
- `divine-duo`: **“Unlimited” AI credits**, **unlimited** storage (very high cap).

### 4.2 Feature access by plan

At the code level, “Pro” is mainly tied to plan IDs `venus-pro`, `circe-elite`, and `divine-duo` (via `PRO_PLANS` in the Stripe webhook and several UI checks). Practically:

- **All plans (including trial)**:
  - Core dashboard, analytics overview, content library, fans CRM, messages, social/reputation widgets.
  - Divine Manager (wizard, console, voice, chat, reset).
  - AI Studio basics: Circe & Venus chat, many AI tools, cosmic calendar, message suggestions.
  - Platform connections (OnlyFans/Fansly/Twitter/Instagram/TikTok), DMCA basics, notifications, billing page.
- **Venus Pro (`venus-pro`)**:
  - All of the above, with **much higher AI and storage headroom**.
  - Full **Venus growth tools** (AI lead gen, attraction/optimization tools).
  - Priority support and custom AI training.
- **Circe Elite (`circe-elite`)**:
  - Everything in **Venus Pro**.
  - Full **Circe protection suite** (leak scanner, DMCA automation, advanced social reputation), tuned for heavier usage.
  - Advanced leak detection, white‑glove onboarding, dedicated account manager.
  - **API access** for programmatic control.
- **Divine Duo (`divine-duo`)**:
  - Everything in **Circe Elite**.
  - Multi‑account & team support (agencies, managers).
  - Custom integrations, deeper revenue analytics, legal support access.
  - Priority feature requests and higher-touch success.

In practice, **features are available everywhere**, but **how hard you can lean on them** (AI volume, storage, multi‑account use, automation intensity) is governed by the plan.

### 4.3 Cost comparison: what each plan actually costs you to run

Below is an **approximate “cost to run” vs. price** comparison, using the infrastructure and AI estimates from this report.

Assumptions:

- Supabase Pro: ~$25/mo (if you’re in production).
- Vercel Pro: ~$20/mo.
- AI low/medium/high usage per report (Section 4).
- Stripe fees: 2.9% + $0.30 per successful charge (ignored in “infrastructure” cost here).

#### Divine Trial (`divine-trial`, $0 for user)

- **Your infra cost**:
  - Database + hosting shared across all users (roughly fixed).
  - AI: capped by **100 AI credits**, so per‑user AI cost is a few cents to **<$1** during the trial.
- **You charge**: $0.
- **Net**: Customer acquisition cost; trial is intentionally a cost center to convert to Pro. Per‑trial infra cost is low because of strict caps.

#### Venus Pro (`venus-pro`, $49/mo)

- **Your typical infra cost per active Pro user** (medium usage):
  - AI: **$5–$15/mo** (mix of GPT‑4o‑mini + occasional Claude/Grok).
  - Marginal DB + hosting: **$1–$3/mo** incremental per user at moderate scale.
  - Total rough **per‑user variable cost**: **$6–$18/mo**.
- **You charge**: **$49/mo**.
- **Gross margin on infra**: roughly **$31–$43/mo per active Pro user**, before support and overhead.

#### Circe Elite (`circe-elite`, $99/mo)

- **Your typical infra cost per Elite user**:
  - AI: **$10–$30/mo** (more heavy usage of protection tools, Pro models, Divine Manager automation).
  - Incremental DB/hosting: **$2–$5/mo** (more analytics, leaks, DMCA, storage).
  - Total variable: roughly **$12–$35/mo**.
- **You charge**: **$99/mo**.
- **Gross margin on infra**: roughly **$64–$87/mo per Elite user**.

#### Divine Duo (`divine-duo`, $199/mo)

- **Your typical infra cost per Duo user (or account in a small team)**:
  - AI: **$20–$60+/mo** (multi‑account, more automation, more Pro tools).
  - Incremental DB/hosting: **$5–$10/mo** (more content, fans, analytics, DMs).
  - Total variable: roughly **$25–$70+/mo**.
- **You charge**: **$199/mo**.
- **Gross margin on infra**: roughly **$129–$174+/mo per Duo customer**, leaving room for human services (onboarding, support, legal access, custom work).

### 4.4 “How much does it cost me compared to running this myself?”

If you tried to reproduce Creatix yourself with similar quality:

- **AI** (per creator): you’d pay the same raw OpenAI/Anthropic/XAI prices, but without shared prompt engineering, batching, or credits system. Expect **$20–$100+/mo** if you used it at the same intensity.
- **Database + hosting**: Supabase Pro (~$25/mo) + Vercel Pro (~$20/mo) just to host a single‑tenant clone, plus your engineering time.
- **Stripe & integrations**: Same % fees; you’d also pay with developer time to keep webhooks and platform APIs stable.
- **Engineering & maintenance**: Ongoing development, ops, and compliance costs far exceed raw infra.

So, compared to your own raw infra bill for equivalent AI usage and hosting (**$60–$150+/mo** + engineering), each plan effectively **bundles and amortizes**:

- Shared infra (Supabase, Vercel, AI gateways).
- Prompt tuning and orchestration (Divine Manager, Circe/Venus).
- Integrations and updates.

Roughly:

- **Venus Pro ($49/mo)**: priced **around or below what it would cost you just to run equivalent AI usage + basic infra**, before any engineering.
- **Circe Elite ($99/mo)** and **Divine Duo ($199/mo)**: priced to cover heavier AI usage and protection/agency workflows while still being **meaningfully cheaper** than building and operating your own stack with similar functionality.

### 4.5 Cost and profit at scale (10 / 100 / 1,000 / 10,000 users)

This section estimates **your total cost** (platform APIs, AI, database, hosting, Stripe) and **revenue** at different user counts, so you can see **profit** for each scale. Assumptions:

- **OnlyFans API:** [Pro $299/mo for 5 accounts](https://onlyfansapi.com/pricing); **each additional OF account = $10/mo** (as specified).
- **Fansly API:** [Pro $129/mo or similar](https://apifansly.com/pricing); **$10 per 1,000 creator accounts** (as specified).
- **User mix (paying only):** 50% Venus Pro ($49), 30% Circe Elite ($99), 20% Divine Duo ($199). **ARPU ≈ $94/mo.**
- **Conversion:** At each scale we assume 70% of “users” are paying (30% trial/churn). So: 10 users → 7 paying, 100 → 70, 1,000 → 700, 10,000 → 7,000 paying.
- **OF/Fansly accounts:** We assume **1 OnlyFans account per paying user** on average, and **0.5 Fansly accounts per paying user** (half also use Fansly). So 7 paying → 7 OF + 3.5 Fansly; 70 → 70 OF + 35 Fansly; 700 → 700 OF + 350 Fansly; 7,000 → 7,000 OF + 3,500 Fansly.
- **AI:** Scales with paying users; low/medium/high bands from Section 6.
- **Stripe:** 2.9% + $0.30 per successful charge (on subscription revenue).
- **Supabase:** $25/mo up to 1k users; $50–$100 at 10k.
- **Vercel:** $20/mo up to 1k users; $100–$300 at 10k.

**Revenue (monthly, rounded):**

| Users (total) | Paying (70%) | Revenue (@ $94 ARPU) |
|---------------|---------------|------------------------|
| 10            | 7             | **~$660**              |
| 100           | 70            | **~$6,600**            |
| 1,000         | 700           | **~$66,000**           |
| 10,000        | 7,000         | **~$660,000**          |

**Your costs (monthly, rounded):**

| Cost line            | 10 users   | 100 users   | 1,000 users  | 10,000 users   |
|----------------------|------------|-------------|--------------|----------------|
| OnlyFans API         | $349       | $1,249      | $10,249      | Enterprise     |
| Fansly API           | ~$0        | ~$1         | ~$10         | ~$100          |
| AI (OpenAI/Claude/XAI) | $40      | $200        | $2,000       | $18,000        |
| Supabase             | $25        | $25         | $25          | $75            |
| Vercel               | $20        | $20         | $20          | $200           |
| Stripe (2.9% + $0.30) | ~$20       | ~$200       | ~$2,000      | ~$20,000       |
| **Total cost**       | **~$454**  | **~$1,695** | **~$14,304** | **~$38,375**   |

*OnlyFans at 10k: Enterprise quote; total cost uses a placeholder ~$38k; adjust with real quote.*

**Profit (revenue − total cost):**

| Users (total) | Revenue  | Total cost | **Profit (approx.)** |
|---------------|----------|------------|------------------------|
| 10            | ~$660    | ~$454      | **~$206/mo**          |
| 100           | ~$6,600  | ~$1,695    | **~$4,905/mo**        |
| 1,000         | ~$66,000 | ~$14,304   | **~$51,696/mo**       |
| 10,000        | ~$660,000| ~$38,375   | **~$621,625/mo**      |

Summary:

- **10 users:** OnlyFans API (Pro + 5 extra accounts) dominates cost; you still net **~$200/mo**.
- **100 users:** Profit **~$5k/mo**; OF API and AI are the main cost lines.
- **1,000 users:** Profit **~$52k/mo**; OF API at **~$10k** is the largest single cost; AI and Stripe scale with revenue.
- **10,000 users:** OnlyFans moves to Enterprise (custom pricing); profit is sensitive to that quote. If OF + infra stay in a similar proportion, **profit can exceed $600k/mo** at these assumptions.

To refine: (1) plug in your real OnlyFans API scale discounts or Enterprise quote, (2) adjust Fansly pricing if your contract differs from “$10 per 1,000 users”, (3) measure actual AI and Stripe usage per user.

---

## 5. Database (Supabase)

### 5.1 Tables (from migrations)

- **Auth:** `auth.users` (Supabase managed)
- **Core:** `profiles`, `platform_connections`, `fans`, `fan_tags`, `fan_tag_assignments`, `content`, `conversations`, `messages`, `message_templates`
- **Analytics & growth:** `analytics_snapshots`
- **Protection:** `leak_alerts`, `reputation_mentions`, `dmca_claims` (and related)
- **Product:** `subscriptions` (Stripe-linked; `plan_id`, `ai_credits_used`, `ai_credits_limit`, etc.), `notification_preferences`, `notifications`, `user_api_keys`
- **Divine Manager:** `divine_manager_settings`, `divine_manager_tasks`
- **Social:** `social_profiles`, `oauth_states`
- **Schema details:** Enums and RLS on manager tables; multiple migrations (001–018, plus one-off scripts)

### 5.2 Estimated database cost (Supabase)

- **Free tier:** 500 MB DB, 1 GB file storage, 2 GB bandwidth – suitable for early development and light usage.
- **Pro (~$25/month):** 8 GB DB, 100 GB storage, 250 GB bandwidth – recommended for production with multiple creators and sync.
- **Usage drivers:** Row growth in `fans`, `messages`, `content`, `analytics_snapshots`, `divine_manager_tasks`; auth and RLS are standard.

*Estimate: assume Pro for production; **~\$25/month** for database (Supabase Pro).*

---

## 6. AI cost estimates

### 6.1 Assumptions

- **OpenAI GPT-4o-mini:** ~$0.15/1M input, ~$0.60/1M output (approximate list pricing).
- **Anthropic Claude Sonnet 4:** order of ~$3/1M input, ~$15/1M output (check current pricing).
- **XAI Grok:** usage-based; typically in a similar range to other premium models.
- **Volume:** “per 1M tokens” and “per request” are ballpark; real cost depends on traffic and prompt sizes.

### 6.2 By usage type

| Usage type | Model | Est. tokens/request (in+out) | Est. cost/1k requests |
|------------|--------|------------------------------|------------------------|
| Circe/Venus/Flirt/Chat (streaming) | GPT-4o-mini | ~2–4k | ~\$0.50–\$1.50 |
| Message suggestions (scan/circe/venus/flirt) | GPT-4o-mini or Grok | ~1–2k | ~\$0.25–\$0.75 (OpenAI) |
| Divine Manager (brain, voice, chat) | GPT-4o-mini | ~1.5–3k | ~\$0.40–\$1.20 |
| Tool-run + content/caption/mood/etc. | GPT-4o-mini | ~1–3k | ~\$0.25–\$1.00 |
| Churn / Pricing / Mass DM / Voice clone | Claude Sonnet 4 | ~2–5k | ~\$5–\$15 |
| Pro tools (Oracle, Venus, etc.) with Grok | XAI Grok | ~2–4k | Depends on XAI pricing |

### 6.3 Monthly AI cost (ballpark)

- **Low traffic:** 10–20k AI requests/month, mostly GPT-4o-mini → **~\$15–\$40/month** (OpenAI dominant).
- **Medium traffic:** 50–100k requests, mix of OpenAI + some Claude + optional Grok → **~\$80–\$200/month**.
- **High traffic:** 200k+ requests, Pro users using Claude and Grok → **~\$300–\$800+/month**.

*Actuals depend on prompt lengths, streaming vs non-streaming, and which tools are used.*

---

## 7. External API costs

| Service | Role | Typical cost model |
|---------|------|--------------------|
| **OnlyFans** | OAuth, sync, messages, webhooks | Usually no per-call fee to you; partnership/ToS apply. |
| **Fansly** | Auth, sync, webhooks, conversations | Similar; check partnership/API terms. |
| **Stripe** | Subscriptions, one-time payments, webhooks | **~2.9% + \$0.30 per successful charge**; no monthly fee for standard usage. |
| **OpenAI** | See AI section | Per-token (above). |
| **Anthropic** | Claude | Per-token (above). |
| **XAI** | Grok (optional) | Per-token / per-request; check x.ai pricing. |
| **Vercel** | Hosting, serverless, cron | See Hosting. |

*OnlyFans/Fansly are not itemized as a direct “API cost” in dollars; Stripe is the main external API cost besides AI.*

---

## 8. Hosting (Vercel)

- **Framework:** Next.js 16 (App Router), serverless functions for API routes.
- **Analytics:** `@vercel/analytics` in use.
- **Cron:** Divine Manager cron uses Vercel Cron or external trigger (CRON_SECRET / `x-vercel-cron`).
- **Domain:** App URL referenced as `https://circe-venus.vercel.app`.

### 8.1 Estimated hosting cost (Vercel)

- **Hobby:** Free for personal; limited serverless execution and bandwidth.
- **Pro (~\$20/user/month):** Better limits, cron, team features – **~\$20/month** for a single Pro seat.
- **Usage:** Depends on serverless invocations (API routes, auth, webhooks) and bandwidth; Pro is typical for production.

*Estimate: **~\$20/month** (Vercel Pro) for production.*

---

## 9. Combined monthly cost summary (estimates)

| Category | Low (early stage) | Medium (growing) | High (scale) |
|----------|-------------------|-------------------|--------------|
| **Database (Supabase)** | \$0 (free) | \$25 (Pro) | \$25–\$50+ |
| **Hosting (Vercel)** | \$0 (Hobby) | \$20 (Pro) | \$20–\$100+ |
| **AI (OpenAI + Claude + optional XAI)** | \$15–\$40 | \$80–\$200 | \$300–\$800+ |
| **Stripe** | % of revenue | % of revenue | % of revenue |
| **APIs (OnlyFans/Fansly)** | \$0 direct | \$0 direct | \$0 direct |
| **Total (ex. Stripe)** | **~\$15–\$40** | **~\$125–\$245** | **~\$345–\$950+** |

*Stripe is not a fixed monthly cost; it scales with revenue (e.g. 2.9% + \$0.30 per charge).*

---

## 10. Progress summary

- **Divine Manager:** End-to-end: wizard, console, tasks, brain, voice companion, chat, reset, cron, preference learning, semi-auto placeholder.
- **AI Studio:** Flirt removed from tabs; Circe, Venus, tools, cosmic, chatter in place; Flirt only in Messages as reply helper.
- **AI surface:** 20+ tools, message suggestions, unified chat, Divine Manager brain/voice/chat; credits and Pro gating where applicable.
- **Platforms:** OnlyFans and Fansly integrated; TikTok, Twitter, Instagram for social/reputation.
- **Billing:** Stripe subscriptions and webhooks; plan limits (ai_credits, storage) and resets.
- **Database:** All listed tables and migrations (including Divine Manager and notifications).
- **Public/SEO:** Metadata, robots, sitemap, JSON-LD, GSC-ready.

This report reflects the codebase and migrations as of the report date. For exact pricing, use each provider’s calculator (OpenAI, Anthropic, XAI, Supabase, Vercel, Stripe) and your own usage metrics.
