-- Sprint 1 | Task 4: create public.user_store_memberships
-- Requires: 20260715_002_create_stores.sql, 20260715_003_create_profiles.sql

CREATE TABLE public.user_store_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  store_id uuid NOT NULL REFERENCES public.stores (id) ON DELETE RESTRICT,
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, store_id)
);

CREATE INDEX user_store_memberships_store_id_is_active_idx
  ON public.user_store_memberships (store_id, is_active);

ALTER TABLE public.user_store_memberships ENABLE ROW LEVEL SECURITY;
