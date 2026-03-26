-- Append-only history of AI reputation briefings (Pro)
CREATE TABLE IF NOT EXISTS public.reputation_briefing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  briefing_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reputation_briefing_history_user_created
  ON public.reputation_briefing_history(user_id, created_at DESC);

ALTER TABLE public.reputation_briefing_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reputation_briefing_history_own" ON public.reputation_briefing_history;
CREATE POLICY "reputation_briefing_history_own" ON public.reputation_briefing_history
  FOR ALL USING (auth.uid() = user_id);
