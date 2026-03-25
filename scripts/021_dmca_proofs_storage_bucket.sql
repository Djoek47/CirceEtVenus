-- Private bucket for DMCA proof file uploads (fixes Storage: "The related resource does not exist")
-- Run in Supabase → SQL Editor once.

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('dmca-proofs', 'dmca-proofs', false, 52428800)
ON CONFLICT (id) DO NOTHING;

-- Objects are stored as: {userId}/{claimId}/{filename}
DROP POLICY IF EXISTS "dmca_proofs_insert_own" ON storage.objects;
CREATE POLICY "dmca_proofs_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'dmca-proofs'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "dmca_proofs_select_own" ON storage.objects;
CREATE POLICY "dmca_proofs_select_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'dmca-proofs'
    AND split_part(name, '/', 1) = auth.uid()::text
  );

DROP POLICY IF EXISTS "dmca_proofs_delete_own" ON storage.objects;
CREATE POLICY "dmca_proofs_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'dmca-proofs'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
