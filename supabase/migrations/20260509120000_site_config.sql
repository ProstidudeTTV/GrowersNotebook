-- Singleton site-wide banner / maintenance flags (single row id = 1).
CREATE TABLE site_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  motd_text text,
  announcement_title text,
  announcement_body text,
  announcement_style text NOT NULL DEFAULT 'info',
  announcement_starts_at timestamptz,
  announcement_ends_at timestamptz,
  announcement_enabled boolean NOT NULL DEFAULT false,
  maintenance_enabled boolean NOT NULL DEFAULT false,
  maintenance_message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO site_config (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;
