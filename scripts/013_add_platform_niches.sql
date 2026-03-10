-- Add niches array to platform_connections to describe creator content niche and boundaries.

ALTER TABLE public.platform_connections
ADD COLUMN IF NOT EXISTS niches TEXT[] DEFAULT '{}'::TEXT[];

