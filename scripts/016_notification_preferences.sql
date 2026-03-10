-- Notification preferences for platform activity (OnlyFans / Fansly)
-- User can choose: notify for every new message, new subscriber, new tip, subscription expired, subscription renewed
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_new_message boolean NOT NULL DEFAULT true,
  notify_new_subscriber boolean NOT NULL DEFAULT true,
  notify_new_tip boolean NOT NULL DEFAULT true,
  notify_subscription_expired boolean NOT NULL DEFAULT true,
  notify_subscription_renewed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE notification_preferences IS 'Per-user toggles for in-app notifications from OnlyFans/Fansly webhooks';

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_preferences_select_own ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY notification_preferences_insert_own ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY notification_preferences_update_own ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY notification_preferences_delete_own ON notification_preferences
  FOR DELETE USING (auth.uid() = user_id);
