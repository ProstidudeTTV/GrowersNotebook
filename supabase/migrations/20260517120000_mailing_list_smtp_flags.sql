-- Mailing list opt-in on profiles; site flag when bulk email had failures (nudge users to join list).
alter table public.profiles
  add column if not exists mailing_list_opt_in boolean not null default false;

comment on column public.profiles.mailing_list_opt_in is
  'User opted in to product/community email; stored server-side only.';

alter table public.site_config
  add column if not exists email_outreach_failure_at timestamptz;

comment on column public.site_config.email_outreach_failure_at is
  'Set when bulk SMTP had failures; public site may nudge users to join mailing list. Cleared on success or admin.';
