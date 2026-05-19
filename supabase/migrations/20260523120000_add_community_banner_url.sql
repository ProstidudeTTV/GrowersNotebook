-- Add optional banner image URL to communities (admin-curated wide hero image).
ALTER TABLE communities ADD COLUMN IF NOT EXISTS banner_url TEXT;
