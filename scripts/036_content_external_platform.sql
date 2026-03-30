-- Optional metadata-first link to platform posts/media (AI Studio vault hub)
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS source_platform TEXT
    CHECK (source_platform IS NULL OR source_platform IN ('creatix', 'onlyfans', 'fansly'));

ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS external_post_id TEXT;

ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS external_media_id TEXT;

ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS external_preview_url TEXT;

COMMENT ON COLUMN public.content.source_platform IS 'creatix = created in app; onlyfans/fansly = referenced remote post/media without mirroring bytes.';
COMMENT ON COLUMN public.content.external_post_id IS 'Upstream post id when source is onlyfans/fansly.';
COMMENT ON COLUMN public.content.external_media_id IS 'Primary media id when applicable.';
COMMENT ON COLUMN public.content.external_preview_url IS 'Thumbnail or preview URL from platform API (may require OF proxy to display).';

CREATE INDEX IF NOT EXISTS idx_content_user_source ON public.content (user_id, source_platform);
