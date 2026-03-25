-- Reputation dual-scan: channel tagging + AI triage fields (Grok)

ALTER TABLE public.reputation_mentions
  ADD COLUMN IF NOT EXISTS scan_channel TEXT NOT NULL DEFAULT 'social';

ALTER TABLE public.reputation_mentions
  DROP CONSTRAINT IF EXISTS reputation_mentions_scan_channel_check;

ALTER TABLE public.reputation_mentions
  ADD CONSTRAINT reputation_mentions_scan_channel_check
  CHECK (scan_channel IN ('web_wide', 'social'));

ALTER TABLE public.reputation_mentions
  ADD COLUMN IF NOT EXISTS ai_reputation_impact TEXT;

ALTER TABLE public.reputation_mentions
  ADD COLUMN IF NOT EXISTS ai_recommended_action TEXT;

COMMENT ON COLUMN public.reputation_mentions.scan_channel IS 'Whether the hit came from wide-web Serper pass or social-focused pass';
COMMENT ON COLUMN public.reputation_mentions.ai_reputation_impact IS 'Grok: harmful | helpful | neutral (reputation effect)';
COMMENT ON COLUMN public.reputation_mentions.ai_recommended_action IS 'Grok: reply | report | monitor | ignore';

CREATE INDEX IF NOT EXISTS idx_reputation_mentions_user_scan_channel
  ON public.reputation_mentions(user_id, scan_channel);
