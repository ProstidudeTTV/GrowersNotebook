-- Multiple post-media image attachments per comment (same bucket as posts / DMs).
alter table public.comments
  add column if not exists image_urls jsonb not null default '[]'::jsonb;
