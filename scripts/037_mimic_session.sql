-- Mimic Test: AI adaptive Q&A session (separate from divine_manager_settings.mimic_profile)
CREATE TABLE IF NOT EXISTS public.mimic_test_sessions (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  profile_json JSONB NOT NULL DEFAULT '{}',
  answers_json JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.mimic_test_sessions IS
  'Optional Mimic wizard AI follow-up: snapshot profile_json + structured answers_json.';

CREATE INDEX IF NOT EXISTS idx_mimic_test_sessions_updated ON public.mimic_test_sessions (updated_at DESC);

ALTER TABLE public.mimic_test_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own mimic_test_sessions" ON public.mimic_test_sessions;
CREATE POLICY "Users manage own mimic_test_sessions" ON public.mimic_test_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
