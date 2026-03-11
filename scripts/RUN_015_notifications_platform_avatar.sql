-- Run this in Supabase: SQL Editor → New query → paste → Run
-- Fixes: column notifications.platform does not exist (and avatar_url)
-- Adds optional columns for OnlyFans/Fansly rich notifications (platform icon, avatar).

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN notifications.platform IS 'onlyfans | fansly; null for system/cosmic';
COMMENT ON COLUMN notifications.avatar_url IS 'Fan or account avatar URL for message/subscription notifications';
