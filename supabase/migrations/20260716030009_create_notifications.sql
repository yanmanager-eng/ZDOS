-- Sprint 1 | Task 9: create public.notifications
-- Requires: 20260715_003_create_profiles.sql

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_type text NULL,
  related_id uuid NULL,
  read_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_id_read_at_idx
  ON public.notifications (user_id, read_at);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
