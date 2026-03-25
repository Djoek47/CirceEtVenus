-- Creator workflow + distribution intent for leak / DMCA triage

ALTER TABLE public.leak_alerts
  ADD COLUMN IF NOT EXISTS user_case_status TEXT NOT NULL DEFAULT 'open';

ALTER TABLE public.leak_alerts
  ADD COLUMN IF NOT EXISTS snooze_until TIMESTAMPTZ;

ALTER TABLE public.leak_alerts
  ADD COLUMN IF NOT EXISTS creator_distribution_intent TEXT;

ALTER TABLE public.leak_alerts
  ADD COLUMN IF NOT EXISTS ai_nuance_summary TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leak_alerts_user_case_status_check'
  ) THEN
    ALTER TABLE public.leak_alerts
      ADD CONSTRAINT leak_alerts_user_case_status_check
      CHECK (user_case_status IN (
        'open', 'resolved', 'contacted', 'unresolved', 'needs_help', 'snoozed', 'waived'
      ));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leak_alerts_creator_distribution_intent_check'
  ) THEN
    ALTER TABLE public.leak_alerts
      ADD CONSTRAINT leak_alerts_creator_distribution_intent_check
      CHECK (
        creator_distribution_intent IS NULL OR
        creator_distribution_intent IN (
          'unspecified', 'paid_only_elsewhere', 'ok_if_free', 'cross_post_consented'
        )
      );
  END IF;
END $$;

COMMENT ON COLUMN public.leak_alerts.user_case_status IS 'Creator workflow: open, resolved, contacted, etc.';
COMMENT ON COLUMN public.leak_alerts.snooze_until IS 'When user_case_status is snoozed, hide until this time';
COMMENT ON COLUMN public.leak_alerts.creator_distribution_intent IS 'User policy: free vs paid / cross-post nuance';
COMMENT ON COLUMN public.leak_alerts.ai_nuance_summary IS 'Denormalized one-line from Grok distributionNuance';
