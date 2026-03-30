-- Optional one-off: remove demo rows inserted by the old client-side seed (titles matched getDefaultNotifications).
-- Run manually per environment after deploying the empty-state fix.
-- Review counts before DELETE.

DELETE FROM public.notifications
WHERE title IN (
  'Cosmic Alignment',
  'New Whale Alert',
  'Circe Alert',
  'Unread Messages',
  'Venus Insight'
)
AND description IN (
  'Venus enters Taurus - optimal time for luxury content',
  'DiamondKing subscribed with $500 tip',
  'Potential leak detected on external site',
  'You have 12 unread messages from fans',
  'Positive review trending on Reddit'
);
