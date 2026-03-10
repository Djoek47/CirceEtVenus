-- Create oauth_states table for CSRF protection during OAuth flows
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  state TEXT NOT NULL,
  code_verifier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- Users can only access their own OAuth states
CREATE POLICY "Users can manage own oauth states" ON oauth_states
  FOR ALL USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_platform ON oauth_states(user_id, platform);

-- Clean up old states (older than 10 minutes)
-- This should be run periodically
DELETE FROM oauth_states WHERE created_at < NOW() - INTERVAL '10 minutes';
