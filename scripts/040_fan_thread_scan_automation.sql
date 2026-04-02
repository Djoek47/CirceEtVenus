-- Thread scan automation metadata for manual scan + periodic thread updates

ALTER TABLE public.fan_thread_insights
  ADD COLUMN IF NOT EXISTS last_scan_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_update_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen_fan_message_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_scan_kind text,
  ADD COLUMN IF NOT EXISTS insufficient_data boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS insufficient_data_reason text,
  ADD COLUMN IF NOT EXISTS notification_context_json jsonb;

UPDATE public.fan_thread_insights
SET
  last_scan_at = COALESCE(last_scan_at, last_thread_refresh_at, updated_at),
  last_update_at = COALESCE(last_update_at, updated_at),
  last_scan_kind = COALESCE(last_scan_kind, 'manual_scan')
WHERE last_scan_at IS NULL OR last_update_at IS NULL OR last_scan_kind IS NULL;

ALTER TABLE public.fan_thread_insights
  DROP CONSTRAINT IF EXISTS fan_thread_insights_last_scan_kind_check;

ALTER TABLE public.fan_thread_insights
  ADD CONSTRAINT fan_thread_insights_last_scan_kind_check
  CHECK (last_scan_kind IN ('manual_scan', 'thread_update'));

CREATE INDEX IF NOT EXISTS idx_fan_thread_insights_last_update
  ON public.fan_thread_insights (user_id, platform, last_update_at DESC);

CREATE INDEX IF NOT EXISTS idx_fan_thread_insights_last_seen_fan_message
  ON public.fan_thread_insights (user_id, platform, last_seen_fan_message_at DESC);
