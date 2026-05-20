-- Enable postgres_changes on notebook comment threads (grow diary discussion).

ALTER PUBLICATION supabase_realtime ADD TABLE public.notebook_comments;
