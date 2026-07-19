-- Sprint 1 | Task 3: create public.profiles
-- Requires: 20260715_002_create_stores.sql (public.stores, public.update_updated_at)

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE RESTRICT,
  employee_no text NOT NULL UNIQUE,
  display_name text NOT NULL,
  role text NOT NULL CHECK (
    role IN (
      'owner',
      'manager',
      'supervisor',
      'trainee_manager',
      'senior_staff',
      'staff'
    )
  ),
  default_store_id uuid REFERENCES public.stores (id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
