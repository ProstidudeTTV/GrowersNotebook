-- Snapshot of payload as approved by staff (user-submitted copy stays in `payload`).
alter table public.catalog_suggestions
  add column if not exists approved_payload jsonb;

comment on column public.catalog_suggestions.approved_payload is
  'JSON payload applied when status became approved; may differ from `payload` if staff edited before approve.';
