-- Sprint 1 | Task 7: create public.inventory_reports
-- Requires: 20260715_002_create_stores.sql, 20260715_003_create_profiles.sql

CREATE TABLE public.inventory_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_request_id uuid NOT NULL UNIQUE,
  store_id uuid NOT NULL REFERENCES public.stores (id) ON DELETE RESTRICT,
  business_date date NOT NULL,
  report_type text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  submitted_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  submitted_at timestamptz NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_reports_report_type_check CHECK (
    report_type IN ('opening', 'closing', 'spot_check')
  ),
  CONSTRAINT inventory_reports_status_check CHECK (
    status IN ('draft', 'submitted', 'cancelled')
  )
);

CREATE UNIQUE INDEX inventory_reports_active_store_date_type_uidx
  ON public.inventory_reports (store_id, business_date, report_type)
  WHERE status <> 'cancelled';

CREATE INDEX inventory_reports_store_id_business_date_idx
  ON public.inventory_reports (store_id, business_date);

CREATE INDEX inventory_reports_submitted_by_idx
  ON public.inventory_reports (submitted_by);

CREATE TRIGGER set_inventory_reports_updated_at
  BEFORE UPDATE ON public.inventory_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.inventory_reports ENABLE ROW LEVEL SECURITY;
