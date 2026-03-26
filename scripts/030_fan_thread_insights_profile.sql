-- Rich fan profile + refresh bookkeeping for Divine live thread scans
ALTER TABLE public.fan_thread_insights
  ADD COLUMN IF NOT EXISTS profile_json JSONB;

ALTER TABLE public.fan_thread_insights
  ADD COLUMN IF NOT EXISTS iteration INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.fan_thread_insights
  ADD COLUMN IF NOT EXISTS last_thread_refresh_at TIMESTAMPTZ;

COMMENT ON COLUMN public.fan_thread_insights.profile_json IS 'Merged structured fan personality (preferences, interests, etc.) from thread + prior state';
COMMENT ON COLUMN public.fan_thread_insights.iteration IS 'Increments on each successful thread snapshot refresh';
COMMENT ON COLUMN public.fan_thread_insights.last_thread_refresh_at IS 'Last time thread text was refreshed (debounce for webhooks)';

-- Last few profile snapshots for audit (capped in app, max ~5 entries)
ALTER TABLE public.fan_thread_insights
  ADD COLUMN IF NOT EXISTS profile_history JSONB DEFAULT '[]'::jsonb;
