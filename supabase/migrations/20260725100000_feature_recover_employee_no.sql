-- AUTH-005｜登入前「忘記工號」唯讀查詢（display_name + phone → employee_no）
-- 不修改 profiles / Auth；僅 SECURITY DEFINER SELECT。
-- 比對時正規化電話；多筆命中回傳 NULL（禁止 LIMIT 1 任意取一筆）。

-- 比對用電話正規化（不寫回 profiles.phone）
CREATE OR REPLACE FUNCTION public.zdos_normalize_phone(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT CASE
    WHEN digits IS NULL OR digits = '' THEN NULL
    -- +886 / 886 + 9 碼手機 → 0 + 9 碼
    WHEN digits ~ '^886[0-9]{9}$' THEN '0' || substring(digits FROM 4)
    ELSE digits
  END
  FROM (
    SELECT regexp_replace(
      regexp_replace(btrim(COALESCE(p_phone, '')), '[[:space:]\-()]+', '', 'g'),
      '[^0-9]',
      '',
      'g'
    ) AS digits
  ) s;
$$;

COMMENT ON FUNCTION public.zdos_normalize_phone(text) IS
  'AUTH-005 helper: normalize phone for comparison only (strip spaces/-/(); 886/+886 → 09…). Does not mutate stored data.';

REVOKE ALL ON FUNCTION public.zdos_normalize_phone(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.recover_employee_no_by_contact(p_name text, p_phone text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN count(*) = 1 THEN min(pr.employee_no)
    ELSE NULL
  END
  FROM public.profiles pr
  WHERE pr.is_active = true
    AND btrim(pr.display_name) = btrim(p_name)
    AND public.zdos_normalize_phone(pr.phone) = public.zdos_normalize_phone(p_phone)
    AND public.zdos_normalize_phone(p_phone) IS NOT NULL;
$$;

COMMENT ON FUNCTION public.recover_employee_no_by_contact(text, text) IS
  'AUTH-005: pre-login employee_no lookup by btrim(display_name) + normalized phone; returns null when 0 or >1 matches.';

REVOKE ALL ON FUNCTION public.recover_employee_no_by_contact(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recover_employee_no_by_contact(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.recover_employee_no_by_contact(text, text) TO authenticated;
