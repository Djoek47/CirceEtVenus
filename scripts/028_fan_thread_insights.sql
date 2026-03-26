-- Latest DM thread snapshot per fan for Divine context (aligned with fan_ai_summaries)
CREATE TABLE IF NOT EXISTS public.fan_thread_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform_fan_id TEXT NOT NULL,
  thread_snapshot_text TEXT,
  reply_package_hash TEXT,
  summary_excerpt TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, platform_fan_id)
);

CREATE INDEX IF NOT EXISTS idx_fan_thread_insights_user_id ON public.fan_thread_insights(user_id);

ALTER TABLE public.fan_thread_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fan_thread_insights_own" ON public.fan_thread_insights;
CREATE POLICY "fan_thread_insights_own" ON public.fan_thread_insights
  FOR ALL USING (auth.uid() = user_id);
