-- Time-bounded bans: null ban_expires_at = permanent while banned_at is set.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ban_expires_at timestamptz;

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_profile_id uuid REFERENCES profiles (id) ON DELETE SET NULL,
  actor_role text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  subject_profile_id uuid REFERENCES profiles (id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text
);

CREATE INDEX audit_events_created_idx ON audit_events (created_at DESC);
CREATE INDEX audit_events_actor_idx ON audit_events (actor_profile_id);
CREATE INDEX audit_events_subject_idx ON audit_events (subject_profile_id);
CREATE INDEX audit_events_action_idx ON audit_events (action);
