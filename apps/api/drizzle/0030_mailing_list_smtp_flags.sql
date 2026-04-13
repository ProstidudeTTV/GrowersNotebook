-- Mirror supabase/migrations/20260517120000_mailing_list_smtp_flags.sql for pnpm db:migrate
alter table public.profiles
  add column if not exists mailing_list_opt_in boolean not null default false;

alter table public.site_config
  add column if not exists email_outreach_failure_at timestamptz;
