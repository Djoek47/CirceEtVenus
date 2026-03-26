-- Persist Divine Realtime voice session memory for resume-after-reconnect (per user)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS divine_voice_memory JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.divine_voice_memory IS 'Voice session: action_log, resume_hint, status — for reconnect prompts';
