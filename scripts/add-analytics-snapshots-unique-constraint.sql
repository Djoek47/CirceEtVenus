-- Add unique constraint on (user_id, platform, date) for analytics_snapshots table
-- This allows upserts to work correctly

-- First remove any duplicates (keeping the most recent one)
DELETE FROM analytics_snapshots a
WHERE a.id NOT IN (
  SELECT DISTINCT ON (user_id, platform, date) id
  FROM analytics_snapshots
  ORDER BY user_id, platform, date, created_at DESC
);

-- Now add the unique constraint
ALTER TABLE analytics_snapshots 
ADD CONSTRAINT analytics_snapshots_user_platform_date_unique 
UNIQUE (user_id, platform, date);
