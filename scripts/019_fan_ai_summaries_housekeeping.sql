-- Fan AI summaries (OnlyFansAPI generate/get fan summary + webhook completion)
CREATE TABLE IF NOT EXISTS public.fan_ai_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform_fan_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  summary_json JSONB,
  analyzed_message_count INTEGER,
  last_analyzed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, platform_fan_id)
);

CREATE INDEX IF NOT EXISTS idx_fan_ai_summaries_user_id ON public.fan_ai_summaries(user_id);

ALTER TABLE public.fan_ai_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fan_ai_summaries_own" ON public.fan_ai_summaries;
CREATE POLICY "fan_ai_summaries_own" ON public.fan_ai_summaries
  FOR ALL USING (auth.uid() = user_id);

-- Housekeeping: auto-create OF user lists + segment overrides (JSON)
ALTER TABLE public.divine_manager_settings
  ADD COLUMN IF NOT EXISTS housekeeping_lists JSONB DEFAULT '{}'::jsonb;
