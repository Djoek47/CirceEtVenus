-- Former handles + optional manual title hints for leak search (DMCA / Protection)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS former_usernames TEXT[] DEFAULT '{}';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS leak_search_title_hints TEXT[] DEFAULT '{}';

COMMENT ON COLUMN public.profiles.former_usernames IS 'Prior platform @handles to include in leak search (rebrands)';
COMMENT ON COLUMN public.profiles.leak_search_title_hints IS 'Extra content titles/phrases to search for leaks';
