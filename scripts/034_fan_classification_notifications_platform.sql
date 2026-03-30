-- Fan classification, notification channels (origin/metadata), fan_thread_insights.platform composite key

-- Notifications: origin channel + optional platform fan id + structured metadata (briefing, subtypes)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS origin text;

UPDATE public.notifications
SET origin = COALESCE(origin, 'platform_webhook')
WHERE origin IS NULL;

-- Heuristic backfill: in-app / billing rows created before this migration
UPDATE public.notifications
SET origin = 'divine_app'
WHERE origin = 'platform_webhook'
  AND (
    link = '/dashboard/ai-studio'
    OR link = '/dashboard/divine-manager'
  );

ALTER TABLE public.notifications
  ALTER COLUMN origin SET DEFAULT 'platform_webhook';

ALTER TABLE public.notifications
  ALTER COLUMN origin SET NOT NULL;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_origin_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_origin_check
  CHECK (origin IN ('platform_webhook', 'divine_app', 'platform_pull'));

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS platform_fan_id text;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE INDEX IF NOT EXISTS idx_notifications_user_origin ON public.notifications (user_id, origin);
CREATE INDEX IF NOT EXISTS idx_notifications_platform_fan ON public.notifications (user_id, platform_fan_id)
  WHERE platform_fan_id IS NOT NULL;

-- Creator-facing free-text label (nullable)
ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS creator_classification text;

COMMENT ON COLUMN public.fans.creator_classification IS 'Optional creator-defined fan label (not shown to fan).';

-- Disambiguate OF vs Fansly (and future) in stored thread snapshots
ALTER TABLE public.fan_thread_insights
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'onlyfans';

UPDATE public.fan_thread_insights
SET platform = 'onlyfans'
WHERE platform IS NULL OR platform = '';

ALTER TABLE public.fan_thread_insights
  DROP CONSTRAINT IF EXISTS fan_thread_insights_user_id_platform_fan_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS fan_thread_insights_user_platform_fan_uidx
  ON public.fan_thread_insights (user_id, platform, platform_fan_id);

CREATE INDEX IF NOT EXISTS idx_fan_thread_insights_user_platform ON public.fan_thread_insights (user_id, platform);
