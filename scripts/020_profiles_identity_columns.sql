-- Align profiles with app expectations (fixes PGRST204: pronouns column missing in schema cache)
-- Run in Supabase SQL Editor if your DB was created before these columns existed.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender_identity TEXT,
  ADD COLUMN IF NOT EXISTS pronouns TEXT,
  ADD COLUMN IF NOT EXISTS pronouns_custom TEXT;

COMMENT ON COLUMN public.profiles.pronouns IS 'Preset pronoun key from settings (e.g. she/her) or null if unspecified';
COMMENT ON COLUMN public.profiles.pronouns_custom IS 'Custom pronouns when preset is custom';
