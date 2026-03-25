-- Aggregate AI reputation briefing (Pro) + multi-tone reply JSON on mentions

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reputation_briefing JSONB;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reputation_briefing_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.reputation_briefing IS 'Last Grok aggregate briefing for Watchful Gaze (JSON)';
COMMENT ON COLUMN public.profiles.reputation_briefing_at IS 'When reputation_briefing was generated';

ALTER TABLE public.reputation_mentions
  ADD COLUMN IF NOT EXISTS ai_reply_variants JSONB;

COMMENT ON COLUMN public.reputation_mentions.ai_reply_variants IS 'Grok: { warm, professional, witty } optional copy-paste replies';
