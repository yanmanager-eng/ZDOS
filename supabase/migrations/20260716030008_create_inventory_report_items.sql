-- Sprint 1 | Task 8: create public.inventory_report_items
-- Requires: 20260715_006_create_inventory_products.sql, 20260715_007_create_inventory_reports.sql

CREATE TABLE public.inventory_report_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.inventory_reports (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.inventory_products (id) ON DELETE RESTRICT,
  quantity numeric(12, 3) NOT NULL,
  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_report_items_quantity_nonnegative_check CHECK (quantity >= 0),
  CONSTRAINT inventory_report_items_report_product_unique UNIQUE (report_id, product_id)
);

CREATE INDEX inventory_report_items_product_id_idx
  ON public.inventory_report_items (product_id);

ALTER TABLE public.inventory_report_items ENABLE ROW LEVEL SECURITY;
