-- Reputation Grok enrichment schema updates
-- Safely extend reputation_mentions for Venus Watchful Gaze.

ALTER TABLE public.reputation_mentions
ADD COLUMN IF NOT EXISTS platform TEXT;

ALTER TABLE public.reputation_mentions
ADD COLUMN IF NOT EXISTS author TEXT;

ALTER TABLE public.reputation_mentions
ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.reputation_mentions
ADD COLUMN IF NOT EXISTS ai_category TEXT;

ALTER TABLE public.reputation_mentions
ADD COLUMN IF NOT EXISTS ai_rationale TEXT;

ALTER TABLE public.reputation_mentions
ADD COLUMN IF NOT EXISTS ai_suggested_reply TEXT;

