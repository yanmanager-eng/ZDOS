-- Sprint 1 | Task 6: create public.inventory_products
-- Requires: public.update_updated_at() from 20260715_002_create_stores.sql

CREATE TABLE public.inventory_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  unit text NOT NULL,
  safe_quantity numeric(12, 3) NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inventory_products_safe_quantity_nonnegative_check CHECK (
    safe_quantity IS NULL OR safe_quantity >= 0
  ),
  CONSTRAINT inventory_products_sort_order_nonnegative_check CHECK (
    sort_order >= 0
  )
);

CREATE TRIGGER set_inventory_products_updated_at
  BEFORE UPDATE ON public.inventory_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.inventory_products ENABLE ROW LEVEL SECURITY;
