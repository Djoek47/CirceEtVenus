-- Cached DM fan rows for fast Divine lookup (name → fanId) without hitting OnlyFans every time.

CREATE TABLE IF NOT EXISTS public.divine_fan_recents (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'onlyfans',
  fan_id TEXT NOT NULL,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, platform, fan_id)
);

CREATE INDEX IF NOT EXISTS idx_divine_fan_recents_user_seen
  ON public.divine_fan_recents (user_id, last_seen_at DESC);

ALTER TABLE public.divine_fan_recents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own divine_fan_recents" ON public.divine_fan_recents;
CREATE POLICY "Users manage own divine_fan_recents" ON public.divine_fan_recents
  FOR ALL USING (auth.uid() = user_id);
