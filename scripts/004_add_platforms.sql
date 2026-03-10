-- Add new platforms to the platform type enum
-- This migration adds ManyVids, Chaturbate, Stripchat, LoyalFans, and Pornhub

-- First, alter the check constraint on fans table
ALTER TABLE fans DROP CONSTRAINT IF EXISTS fans_platform_check;
ALTER TABLE fans ADD CONSTRAINT fans_platform_check 
  CHECK (platform IN ('onlyfans', 'fansly', 'manyvids', 'mym', 'chaturbate', 'stripchat', 'loyalfans', 'pornhub'));

-- Update platform_connections table
ALTER TABLE platform_connections DROP CONSTRAINT IF EXISTS platform_connections_platform_check;
ALTER TABLE platform_connections ADD CONSTRAINT platform_connections_platform_check 
  CHECK (platform IN ('onlyfans', 'fansly', 'manyvids', 'mym', 'chaturbate', 'stripchat', 'loyalfans', 'pornhub'));

-- Update conversations table
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_platform_check;
ALTER TABLE conversations ADD CONSTRAINT conversations_platform_check 
  CHECK (platform IN ('onlyfans', 'fansly', 'manyvids', 'mym', 'chaturbate', 'stripchat', 'loyalfans', 'pornhub'));

-- Update daily_analytics table
ALTER TABLE daily_analytics DROP CONSTRAINT IF EXISTS daily_analytics_platform_check;
ALTER TABLE daily_analytics ADD CONSTRAINT daily_analytics_platform_check 
  CHECK (platform IN ('onlyfans', 'fansly', 'manyvids', 'mym', 'chaturbate', 'stripchat', 'loyalfans', 'pornhub'));
