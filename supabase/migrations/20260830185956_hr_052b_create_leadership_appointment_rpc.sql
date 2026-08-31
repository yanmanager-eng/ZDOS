create or replace function public.create_leadership_appointment(
  p_employee_id uuid,
  p_store_id uuid,
  p_effective_date date,
  p_planned_end_date date,
  p_target_role text,
  p_mentor_id uuid default null,
  p_notes text default null,
  p_policy_version text default 'v1.0',
  p_policy_snapshot jsonb default '{}'::jsonb
)
returns public.leadership_appointments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_employee_role text;
  v_employee_active boolean;
  v_appointment public.leadership_appointments;
begin
  if v_actor_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select p.role
    into v_actor_role
  from public.profiles p
  where p.id = v_actor_id
    and p.is_active = true;

  if v_actor_role is null then
    raise exception 'ACTOR_NOT_ACTIVE';
  end if;

  if v_actor_role not in ('owner', 'manager', 'supervisor') then
    raise exception 'INSUFFICIENT_PERMISSION';
  end if;

  if v_actor_role <> 'owner' and not public.profile_has_active_membership_for_store(v_actor_id, p_store_id) then
    raise exception 'STORE_ACCESS_DENIED';
  end if;

  if p_effective_date is null or p_planned_end_date is null or p_planned_end_date < p_effective_date then
    raise exception 'INVALID_APPOINTMENT_DATES';
  end if;

  if nullif(btrim(p_target_role), '') is null then
    raise exception 'TARGET_ROLE_REQUIRED';
  end if;

  select p.role, p.is_active
    into v_employee_role, v_employee_active
  from public.profiles p
  where p.id = p_employee_id
  for update;

  if v_employee_role is null then
    raise exception 'EMPLOYEE_NOT_FOUND';
  end if;

  if v_employee_active is not true then
    raise exception 'EMPLOYEE_NOT_ACTIVE';
  end if;

  if v_employee_role not in ('staff', 'senior_staff') then
    raise exception 'EMPLOYEE_ROLE_NOT_ELIGIBLE';
  end if;

  if not public.profile_has_active_membership_for_store(p_employee_id, p_store_id) then
    raise exception 'EMPLOYEE_STORE_MEMBERSHIP_REQUIRED';
  end if;

  if p_mentor_id is not null then
    if not exists (
      select 1
      from public.profiles mp
      where mp.id = p_mentor_id
        and mp.is_active = true
    ) then
      raise exception 'MENTOR_NOT_FOUND_OR_INACTIVE';
    end if;
  end if;

  if exists (
    select 1
    from public.leadership_appointments la
    where la.employee_id = p_employee_id
      and la.status in ('active', 'pending_assessment', 'pending_review', 'ready_for_promotion', 'extended')
  ) then
    raise exception 'ACTIVE_APPOINTMENT_EXISTS';
  end if;

  insert into public.leadership_appointments (
    employee_id,
    store_id,
    previous_role,
    active_role,
    target_role,
    effective_date,
    planned_end_date,
    mentor_id,
    appointed_by,
    status,
    notes,
    policy_version,
    policy_snapshot,
    created_by
  ) values (
    p_employee_id,
    p_store_id,
    v_employee_role,
    'trainee_manager',
    btrim(p_target_role),
    p_effective_date,
    p_planned_end_date,
    p_mentor_id,
    v_actor_id,
    'active',
    p_notes,
    coalesce(nullif(btrim(p_policy_version), ''), 'v1.0'),
    coalesce(p_policy_snapshot, '{}'::jsonb),
    v_actor_id
  )
  returning * into v_appointment;

  update public.profiles
  set role = 'trainee_manager',
      updated_at = now()
  where id = p_employee_id;

  insert into public.leadership_history (
    appointment_id,
    employee_id,
    event_type,
    old_value,
    new_value,
    reason,
    actor_id
  ) values (
    v_appointment.id,
    p_employee_id,
    'appointment_created',
    jsonb_build_object('role', v_employee_role),
    jsonb_build_object(
      'role', 'trainee_manager',
      'target_role', v_appointment.target_role,
      'effective_date', v_appointment.effective_date,
      'planned_end_date', v_appointment.planned_end_date,
      'store_id', v_appointment.store_id,
      'mentor_id', v_appointment.mentor_id
    ),
    p_notes,
    v_actor_id
  );

  return v_appointment;
end;
$$;

revoke all on function public.create_leadership_appointment(uuid, uuid, date, date, text, uuid, text, text, jsonb) from public;
revoke all on function public.create_leadership_appointment(uuid, uuid, date, date, text, uuid, text, text, jsonb) from anon;
grant execute on function public.create_leadership_appointment(uuid, uuid, date, date, text, uuid, text, text, jsonb) to authenticated;;
