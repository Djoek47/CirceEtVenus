-- Divine Manager: intent audit log for voice/chat commands (idempotency and history)
CREATE TABLE IF NOT EXISTS public.divine_intent_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  intent_type TEXT NOT NULL,
  params JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'confirmed', 'executed', 'rejected', 'failed')),
  result_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_divine_intent_log_user_id ON public.divine_intent_log(user_id);
CREATE INDEX IF NOT EXISTS idx_divine_intent_log_status ON public.divine_intent_log(status);
CREATE INDEX IF NOT EXISTS idx_divine_intent_log_created_at ON public.divine_intent_log(created_at DESC);

ALTER TABLE public.divine_intent_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own divine_intent_log" ON public.divine_intent_log;
CREATE POLICY "Users can manage own divine_intent_log" ON public.divine_intent_log
  FOR ALL USING (auth.uid() = user_id);
