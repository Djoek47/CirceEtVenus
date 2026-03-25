-- Mimic Test: structured fan-facing style + consent for AI-drafted replies (divine_manager_settings)
ALTER TABLE public.divine_manager_settings
  ADD COLUMN IF NOT EXISTS mimic_profile JSONB DEFAULT NULL;

COMMENT ON COLUMN public.divine_manager_settings.mimic_profile IS
  'Mimic Test results: tone, boundaries, exemplar replies, escalation rules, consent flags.';
