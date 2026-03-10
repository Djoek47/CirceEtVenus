-- Add platform and avatar to notifications for OnlyFans/Fansly rich notifications

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS platform text,
  ADD COLUMN IF NOT EXISTS avatar_url text;

COMMENT ON COLUMN notifications.platform IS 'onlyfans | fansly; null for system/cosmic';
COMMENT ON COLUMN notifications.avatar_url IS 'Fan or account avatar URL for message/subscription notifications';
