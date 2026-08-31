-- HR-052D｜Employee profile + latest leadership appointment read contract.
-- This RPC exposes only the fields required by the employee-detail workflow.

create or replace function public.get_leadership_employee_state(
  p_employee_id uuid,
  p_store_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_result jsonb;
begin
  if v_actor_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select role into v_actor_role
  from public.profiles
  where id = v_actor_id and is_active = true;

  if v_actor_role is null then
    raise exception 'ACTOR_NOT_ACTIVE';
  end if;

  if v_actor_role not in ('owner', 'manager', 'supervisor') then
    raise exception 'INSUFFICIENT_PERMISSION';
  end if;

  if v_actor_role <> 'owner'
     and not public.profile_has_active_membership_for_store(v_actor_id, p_store_id) then
    raise exception 'STORE_ACCESS_DENIED';
  end if;

  if not public.profile_has_active_membership_for_store(p_employee_id, p_store_id) then
    raise exception 'EMPLOYEE_STORE_MEMBERSHIP_REQUIRED';
  end if;

  select jsonb_build_object(
    'profile', jsonb_build_object(
      'id', ep.id,
      'employee_no', ep.employee_no,
      'display_name', ep.display_name,
      'role', ep.role,
      'is_active', ep.is_active,
      'default_store_id', ep.default_store_id
    ),
    'appointment', case when la.id is null then null else jsonb_build_object(
      'id', la.id,
      'employee_id', la.employee_id,
      'store_id', la.store_id,
      'previous_role', la.previous_role,
      'active_role', la.active_role,
      'target_role', la.target_role,
      'effective_date', la.effective_date,
      'planned_end_date', la.planned_end_date,
      'mentor_id', la.mentor_id,
      'appointed_by', la.appointed_by,
      'status', la.status,
      'notes', la.notes,
      'policy_snapshot', la.policy_snapshot,
      'created_at', la.created_at
    ) end,
    'mentor_profile', case when mp.id is null then null else jsonb_build_object(
      'id', mp.id,
      'display_name', mp.display_name,
      'employee_no', mp.employee_no
    ) end
  )
  into v_result
  from public.profiles ep
  left join lateral (
    select a.*
    from public.leadership_appointments a
    where a.employee_id = ep.id
    order by a.created_at desc
    limit 1
  ) la on true
  left join public.profiles mp on mp.id = la.mentor_id
  where ep.id = p_employee_id;

  if v_result is null then
    raise exception 'EMPLOYEE_NOT_FOUND';
  end if;

  return v_result;
end;
$$;

revoke all on function public.get_leadership_employee_state(uuid, uuid) from public;
revoke all on function public.get_leadership_employee_state(uuid, uuid) from anon;
grant execute on function public.get_leadership_employee_state(uuid, uuid) to authenticated;
