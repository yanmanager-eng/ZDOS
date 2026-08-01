-- Sprint 1 | Task 10: create public.audit_logs
-- Requires: 20260715_002_create_stores.sql, 20260715_003_create_profiles.sql

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  store_id uuid NULL REFERENCES public.stores (id) ON DELETE RESTRICT,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NULL,
  old_data jsonb NULL,
  new_data jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_entity_type_entity_id_idx
  ON public.audit_logs (entity_type, entity_id);

CREATE INDEX audit_logs_store_id_created_at_idx
  ON public.audit_logs (store_id, created_at);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
