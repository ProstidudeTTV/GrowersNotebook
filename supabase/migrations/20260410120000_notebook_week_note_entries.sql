-- Keep in sync with apps/api/drizzle/0026_notebook_week_note_entries.sql
ALTER TABLE notebook_weeks
  ADD COLUMN IF NOT EXISTS note_entries jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE notebook_weeks
SET note_entries = jsonb_build_array(
  jsonb_build_object(
    'body', notes,
    'at', to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  )
)
WHERE coalesce(trim(notes), '') <> ''
  AND note_entries = '[]'::jsonb;
