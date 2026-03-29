-- Divine DM send attribution (Creatix UI); optional OF message id after sync
CREATE TABLE IF NOT EXISTS public.divine_dm_send_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fan_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('onlyfans', 'fansly')),
  body_preview TEXT,
  source TEXT NOT NULL CHECK (source IN ('user', 'divine', 'divine_scheduled')),
  onlyfans_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_divine_dm_send_events_user_fan
  ON public.divine_dm_send_events (user_id, fan_id, created_at DESC);

ALTER TABLE public.divine_dm_send_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own divine_dm_send_events" ON public.divine_dm_send_events;
CREATE POLICY "Users read own divine_dm_send_events"
  ON public.divine_dm_send_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own divine_dm_send_events" ON public.divine_dm_send_events;
CREATE POLICY "Users insert own divine_dm_send_events"
  ON public.divine_dm_send_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Optional sales metadata for content library (Phase D)
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS sales_notes TEXT,
  ADD COLUMN IF NOT EXISTS teaser_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS spoiler_level TEXT;

COMMENT ON COLUMN public.content.sales_notes IS 'Creator private sales/teaser notes for Divine recommendations (not shown to fans).';
COMMENT ON COLUMN public.content.teaser_tags IS 'Short tags for search/filter in Divine vault tools.';
COMMENT ON COLUMN public.content.spoiler_level IS 'e.g. none, mild, explicit — guides AI tone within persona boundaries.';
