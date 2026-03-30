-- External community links for creator hub (Discord, Telegram, etc.)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS community_links JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.community_links IS 'Array of { id, label, url } for Community page; max length enforced in app.';
