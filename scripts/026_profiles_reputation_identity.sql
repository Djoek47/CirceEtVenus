-- Manual reputation search identity (no OAuth required)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reputation_manual_handles TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reputation_display_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS reputation_platform_handles JSONB DEFAULT NULL;

COMMENT ON COLUMN public.profiles.reputation_manual_handles IS
  'User-entered @handles for Serper reputation scans (e.g. sophierain); no open proxy—stored only here.';
COMMENT ON COLUMN public.profiles.reputation_display_name IS
  'Optional real/stage name for search query context (not verified identity).';
COMMENT ON COLUMN public.profiles.reputation_platform_handles IS
  'Optional JSON e.g. {"onlyfans":"user","mym":"user"} for query context.';
