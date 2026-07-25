-- AUTH-005: recover_employee_no_by_contact
-- Confirmed live profiles columns (anon probe on ulbaleegutbiyxctqrth):
--   display_name (name), phone (phone), employee_no (employee number)
--   NOT present: name, full_name, email, mobile, employee_code, emp_id
-- Purpose: allow unauthenticated forgot-employee-no lookup; return only employee_no.

CREATE OR REPLACE FUNCTION public.zdos_normalize_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN x = '' THEN ''
    WHEN x LIKE '+886%' THEN '0' || substr(x, 5)
    WHEN x LIKE '886%' AND length(x) >= 11 THEN '0' || substr(x, 4)
    ELSE x
  END
  FROM (
    -- Strip spaces, half/full-width hyphens, and parentheses before country-code mapping.
    SELECT regexp_replace(
      coalesce(p_phone, ''),
      '[[:space:]\-－﹣()\（\）]',
      '',
      'g'
    ) AS x
  ) s;
$$;

COMMENT ON FUNCTION public.zdos_normalize_phone(text) IS
  'AUTH-005 internal phone normalizer: strip spaces/hyphens/parentheses; map +886/886 to 0-leading local form.';

REVOKE ALL ON FUNCTION public.zdos_normalize_phone(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.recover_employee_no_by_contact(
  p_name text,
  p_phone text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := public.zdos_normalize_phone(p_phone);
  v_count integer := 0;
  v_emp_no text;
BEGIN
  IF v_name = '' OR v_phone = '' THEN
    RETURN NULL;
  END IF;

  SELECT count(*)::integer
    INTO v_count
  FROM public.profiles pr
  WHERE btrim(coalesce(pr.display_name, '')) = v_name
    AND public.zdos_normalize_phone(pr.phone) = v_phone
    AND coalesce(pr.is_active, true) = true;

  -- 0 hits: empty. >1 hits: empty (do not pick arbitrarily; do not leak detail).
  IF v_count <> 1 THEN
    RETURN NULL;
  END IF;

  SELECT btrim(coalesce(pr.employee_no, ''))
    INTO v_emp_no
  FROM public.profiles pr
  WHERE btrim(coalesce(pr.display_name, '')) = v_name
    AND public.zdos_normalize_phone(pr.phone) = v_phone
    AND coalesce(pr.is_active, true) = true
  LIMIT 1;

  IF v_emp_no IS NULL OR v_emp_no = '' THEN
    RETURN NULL;
  END IF;

  RETURN v_emp_no;
END;
$$;

COMMENT ON FUNCTION public.recover_employee_no_by_contact(text, text) IS
  'AUTH-005 forgot employee no: match profiles.display_name + normalized profiles.phone; returns employee_no only.';

REVOKE ALL ON FUNCTION public.recover_employee_no_by_contact(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recover_employee_no_by_contact(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.recover_employee_no_by_contact(text, text) TO authenticated;
