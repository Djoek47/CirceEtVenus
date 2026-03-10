-- Circe Shield schema updates
-- - Extend leak_alerts to support provenance + severity + resolved state
-- - Extend dmca_claims to support proof uploads + claimant contact fields

-- =========
-- leak_alerts
-- =========

ALTER TABLE public.leak_alerts
  ADD COLUMN IF NOT EXISTS source_platform TEXT,
  ADD COLUMN IF NOT EXISTS severity TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS detected_by TEXT,
  ADD COLUMN IF NOT EXISTS query TEXT;

-- Backfill: if an older table used no platform/severity, keep nulls.

-- Expand/normalize allowed statuses.
-- The existing table may have a CHECK constraint created inline. We drop any existing status check and add a new one.
DO $$
DECLARE
  c_name text;
BEGIN
  SELECT con.conname INTO c_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'leak_alerts'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%status%';

  IF c_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.leak_alerts DROP CONSTRAINT %I', c_name);
  END IF;
END $$;

ALTER TABLE public.leak_alerts
  ADD CONSTRAINT leak_alerts_status_check
  CHECK (status IN (
    'pending','reviewed','confirmed','ignored','dmca_sent',
    'detected','reviewing','resolved','false_positive'
  ));

-- Severity check (optional, allows null)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'leak_alerts'
      AND con.conname = 'leak_alerts_severity_check'
  ) THEN
    ALTER TABLE public.leak_alerts
      ADD CONSTRAINT leak_alerts_severity_check
      CHECK (severity IS NULL OR severity IN ('critical','high','medium','low'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leak_alerts_status ON public.leak_alerts(status);
CREATE INDEX IF NOT EXISTS idx_leak_alerts_source_platform ON public.leak_alerts(source_platform);

-- =========
-- dmca_claims
-- =========

ALTER TABLE public.dmca_claims
  ADD COLUMN IF NOT EXISTS proof_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS original_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS claimant_phone TEXT,
  ADD COLUMN IF NOT EXISTS claimant_address TEXT,
  ADD COLUMN IF NOT EXISTS generated_document_url TEXT;

CREATE INDEX IF NOT EXISTS idx_dmca_claims_leak_alert_id ON public.dmca_claims(leak_alert_id);

