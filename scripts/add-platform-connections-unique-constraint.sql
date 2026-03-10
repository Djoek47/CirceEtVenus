-- Add unique constraint on (user_id, platform) for platform_connections table
-- This enables proper upsert behavior

-- First, clean up any duplicates (keep the most recent one)
DELETE FROM platform_connections a
USING platform_connections b
WHERE a.user_id = b.user_id 
  AND a.platform = b.platform 
  AND a.created_at < b.created_at;

-- Add unique constraint
ALTER TABLE platform_connections 
ADD CONSTRAINT platform_connections_user_platform_unique 
UNIQUE (user_id, platform);
