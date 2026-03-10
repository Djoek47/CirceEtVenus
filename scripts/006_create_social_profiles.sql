-- Create social_profiles table for tracking social media accounts
CREATE TABLE IF NOT EXISTS social_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'twitter')),
  username TEXT NOT NULL,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  posts INTEGER DEFAULT 0,
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  avg_likes INTEGER DEFAULT 0,
  avg_comments INTEGER DEFAULT 0,
  reputation_score INTEGER DEFAULT 50 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  sentiment TEXT DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform, username)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_social_profiles_user_id ON social_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_social_profiles_platform ON social_profiles(platform);

-- Enable RLS
ALTER TABLE social_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own social profiles"
  ON social_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own social profiles"
  ON social_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own social profiles"
  ON social_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own social profiles"
  ON social_profiles FOR DELETE
  USING (auth.uid() = user_id);
