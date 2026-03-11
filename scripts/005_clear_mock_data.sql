-- Clear all mock/sample data from the database
-- This ensures dashboards only show real data from connected platforms
--
-- WHEN TO RUN (pre-launch):
-- - If you ever loaded demo/sample data into this DB, run this script ONCE in
--   Supabase SQL Editor before onboarding real users.
-- - If your production DB was created empty and never had mock data, skip this.
-- - Run only in the environment you intend to clean (e.g. production); not in dev
--   unless you intend to wipe dev data.

-- Clear analytics snapshots (contains mock revenue data)
DELETE FROM analytics_snapshots;

-- Clear fans data
DELETE FROM fans;

-- Clear conversations and messages
DELETE FROM messages;
DELETE FROM conversations;

-- Clear content
DELETE FROM content;

-- Clear leak alerts and reputation mentions
DELETE FROM leak_alerts;
DELETE FROM reputation_mentions;

-- Clear platform connections (users will need to reconnect)
DELETE FROM platform_connections;
