-- Configurable bulk maintenance email subject/body (admin UI). Public page still uses maintenance_message.
alter table public.site_config
  add column if not exists maintenance_email_subject varchar(300);

alter table public.site_config
  add column if not exists maintenance_email_body text;

comment on column public.site_config.maintenance_email_subject is
  'Optional subject for bulk maintenance emails; default used when null.';

comment on column public.site_config.maintenance_email_body is
  'Optional full body for bulk maintenance emails; when null, a default template plus maintenance_message is used.';
