-- Sprint 1 | Task 5: create public.sales_reports
-- Requires: 20260715_002_create_stores.sql, 20260715_003_create_profiles.sql

CREATE TABLE public.sales_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_request_id uuid NOT NULL UNIQUE,
  store_id uuid NOT NULL REFERENCES public.stores (id) ON DELETE RESTRICT,
  business_date date NOT NULL,
  shift text NOT NULL,
  revenue numeric(12, 2) NOT NULL DEFAULT 0,
  customer_count integer NULL,
  cash_amount numeric(12, 2) NULL,
  digital_amount numeric(12, 2) NULL,
  other_amount numeric(12, 2) NULL,
  note text NULL,
  status text NOT NULL DEFAULT 'draft',
  submitted_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  submitted_at timestamptz NULL,
  approved_by uuid NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  approved_at timestamptz NULL,
  rejection_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_reports_status_check CHECK (
    status IN ('draft', 'submitted', 'approved', 'rejected', 'cancelled')
  ),
  CONSTRAINT sales_reports_revenue_nonnegative_check CHECK (revenue >= 0),
  CONSTRAINT sales_reports_customer_count_nonnegative_check CHECK (
    customer_count IS NULL OR customer_count >= 0
  )
);

CREATE UNIQUE INDEX sales_reports_active_store_date_shift_uidx
  ON public.sales_reports (store_id, business_date, shift)
  WHERE status <> 'cancelled';

CREATE INDEX sales_reports_store_id_business_date_idx
  ON public.sales_reports (store_id, business_date);

CREATE INDEX sales_reports_status_submitted_at_idx
  ON public.sales_reports (status, submitted_at);

CREATE INDEX sales_reports_submitted_by_idx
  ON public.sales_reports (submitted_by);

CREATE TRIGGER set_sales_reports_updated_at
  BEFORE UPDATE ON public.sales_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.sales_reports ENABLE ROW LEVEL SECURITY;
