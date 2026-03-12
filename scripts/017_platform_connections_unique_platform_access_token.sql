-- Enforce at most one Circe et Venus user per external platform account.
-- Removes duplicate rows (same platform + access_token), then adds unique constraint.

-- 1. Remove duplicates: for each (platform, access_token) with non-null access_token,
--    keep the row with the earliest created_at and delete the rest.
DELETE FROM public.platform_connections a
USING public.platform_connections b
WHERE a.platform = b.platform
  AND a.access_token IS NOT NULL
  AND b.access_token IS NOT NULL
  AND a.access_token = b.access_token
  AND a.id != b.id
  AND a.created_at > b.created_at;

-- 2. Add unique constraint so the same external account cannot be linked to multiple users.
--    (Postgres allows multiple NULLs in unique columns, so rows with access_token IS NULL are unaffected.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'platform_connections_platform_access_token_unique'
  ) THEN
    ALTER TABLE public.platform_connections
    ADD CONSTRAINT platform_connections_platform_access_token_unique
    UNIQUE (platform, access_token);
  END IF;
END $$;
