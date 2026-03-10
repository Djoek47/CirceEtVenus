-- Create DMCA claims table for tracking takedown requests
CREATE TABLE IF NOT EXISTS dmca_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leak_alert_id UUID REFERENCES leak_alerts(id) ON DELETE SET NULL,
  infringing_url TEXT NOT NULL,
  platform TEXT NOT NULL,
  platform_username TEXT,
  claimant_name TEXT NOT NULL,
  claimant_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'acknowledged', 'removed', 'rejected', 'appealed')),
  notice_text TEXT,
  sent_at TIMESTAMPTZ,
  response_at TIMESTAMPTZ,
  response_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dmca_claims_user_id ON dmca_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_dmca_claims_status ON dmca_claims(status);
CREATE INDEX IF NOT EXISTS idx_dmca_claims_leak_alert ON dmca_claims(leak_alert_id);

-- Enable RLS
ALTER TABLE dmca_claims ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own claims
CREATE POLICY "Users can view own dmca claims" ON dmca_claims
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dmca claims" ON dmca_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dmca claims" ON dmca_claims
  FOR UPDATE USING (auth.uid() = user_id);
