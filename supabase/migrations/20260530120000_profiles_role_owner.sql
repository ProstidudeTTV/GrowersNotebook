-- Site owner: full staff powers; assign only via Supabase (profiles.role = 'owner').
ALTER TYPE role ADD VALUE IF NOT EXISTS 'owner';
