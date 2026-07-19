-- Sprint 2 | Task 1: minimal testable RLS policies
-- Requires: migrations 001–010 deployed on zdos-dev

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER avoids RLS recursion in policy checks)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.has_active_membership_for_store(p_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_store_memberships
    WHERE user_id = auth.uid()
      AND store_id = p_store_id
      AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_active_membership_for_store(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_membership_for_store(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- profiles: restrict self-updates to display_name (and updated_at via trigger)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_profiles_self_update_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.id THEN
    IF NEW.employee_no IS DISTINCT FROM OLD.employee_no THEN
      RAISE EXCEPTION 'profiles: cannot change employee_no';
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'profiles: cannot change role';
    END IF;

    IF NEW.default_store_id IS DISTINCT FROM OLD.default_store_id THEN
      RAISE EXCEPTION 'profiles: cannot change default_store_id';
    END IF;

    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'profiles: cannot change is_active';
    END IF;

    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'profiles: cannot change created_at';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'profiles: cannot change id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_profiles_self_update_columns_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profiles_self_update_columns();

-- ---------------------------------------------------------------------------
-- stores
-- ---------------------------------------------------------------------------

CREATE POLICY stores_select_active_for_authenticated_active_users
  ON public.stores
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND is_active = true
    AND public.is_active_user()
  );

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- user_store_memberships
-- ---------------------------------------------------------------------------

CREATE POLICY user_store_memberships_select_own
  ON public.user_store_memberships
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- sales_reports
-- ---------------------------------------------------------------------------

CREATE POLICY sales_reports_select_own_active_stores
  ON public.sales_reports
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND public.is_active_user()
    AND public.has_active_membership_for_store(store_id)
  );

CREATE POLICY sales_reports_insert_own_active_stores
  ON public.sales_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND submitted_by = auth.uid()
    AND public.is_active_user()
    AND public.has_active_membership_for_store(store_id)
  );

CREATE POLICY sales_reports_update_own_created_active_stores
  ON public.sales_reports
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND submitted_by = auth.uid()
    AND public.is_active_user()
    AND public.has_active_membership_for_store(store_id)
  )
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND submitted_by = auth.uid()
    AND public.is_active_user()
    AND public.has_active_membership_for_store(store_id)
  );

-- inventory_products, inventory_reports, inventory_report_items,
-- notifications, audit_logs: RLS remains enabled with no policies (deny all).
