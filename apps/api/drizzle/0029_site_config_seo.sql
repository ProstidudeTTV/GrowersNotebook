-- Optional SEO overrides (managed in admin Site settings). Empty/null = use code defaults.
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS seo_default_title varchar(200);
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS seo_default_description varchar(500);
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS seo_keywords text;
ALTER TABLE site_config ADD COLUMN IF NOT EXISTS og_image_url text;
