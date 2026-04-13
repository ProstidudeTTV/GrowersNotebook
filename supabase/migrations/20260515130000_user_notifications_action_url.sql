-- Deep links from notification rows to in-app destinations (posts, notebooks, profiles).

ALTER TABLE user_notifications
  ADD COLUMN IF NOT EXISTS action_url text;
