-- HR-052J｜Final promotion decision.
-- Keep every authorization and prerequisite check inside the database transaction.
create or replace function public.promote_leadership_appointment(
  p_appointment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_appt public.leadership_appointments%rowtype;
  v_actor_role text;
  v_target_profile_role text;
  v_decision_roles text[];
  v_progress jsonb;
  v_role_map jsonb;
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select *
    into v_appt
  from public.leadership_appointments
  where id = p_appointment_id
  for update;

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND';
  end if;
  if v_appt.status not in ('active', 'pending_assessment', 'pending_review', 'ready_for_promotion', 'extended') then
    raise exception 'APPOINTMENT_NOT_ACTIVE';
  end if;
  if v_appt.employee_id = v_actor then
    raise exception 'SELF_DECISION_FORBIDDEN';
  end if;

  select role
    into v_actor_role
  from public.profiles
  where id = v_actor
    and is_active = true;

  if v_actor_role is null then
    raise exception 'ACTOR_NOT_ACTIVE';
  end if;

  select coalesce(array_agg(value), array[]::text[])
    into v_decision_roles
  from jsonb_array_elements_text(coalesce(v_appt.policy_snapshot->'decision_roles', '[]'::jsonb));

  if coalesce(array_length(v_decision_roles, 1), 0) = 0 then
    raise exception 'POLICY_NOT_CONFIGURED:decision_roles';
  end if;
  if not (v_actor_role = any(v_decision_roles)) then
    raise exception 'FORBIDDEN';
  end if;
  if v_actor_role <> 'owner'
     and not public.profile_has_active_membership_for_store(v_actor, v_appt.store_id) then
    raise exception 'FORBIDDEN_STORE';
  end if;

  -- Recalculate all training prerequisites in the same transaction. Never trust UI state.
  v_progress := public.get_leadership_training_progress(p_appointment_id);
  if coalesce((v_progress->>'policy_configured')::boolean, false) is not true then
    raise exception 'POLICY_NOT_CONFIGURED';
  end if;
  if coalesce((v_progress->>'knowledge_completed')::boolean, false) is not true
     or coalesce((v_progress->>'practical_completed')::boolean, false) is not true
     or coalesce((v_progress->>'shift_completed')::boolean, false) is not true
     or coalesce((v_progress->>'final_review_completed')::boolean, false) is not true then
    raise exception 'PROMOTION_PREREQUISITES_INCOMPLETE';
  end if;

  -- Resolve the business target (for example deputy_leader / leader) to profiles.role.
  v_role_map := coalesce(v_appt.policy_snapshot->'target_role_profile_map', '{}'::jsonb);
  v_target_profile_role := nullif(v_role_map->>v_appt.target_role, '');
  if v_target_profile_role is null and v_appt.target_role = 'supervisor' then
    v_target_profile_role := nullif(v_role_map->>'leader', '');
  elsif v_target_profile_role is null and v_appt.target_role = 'leader' then
    v_target_profile_role := nullif(v_role_map->>'supervisor', '');
  end if;
  -- Backward compatibility for appointments created before the role map was introduced.
  v_target_profile_role := coalesce(
    v_target_profile_role,
    nullif(v_appt.policy_snapshot->>'profile_role_target', ''),
    case
      when v_appt.target_role in ('owner', 'manager', 'supervisor', 'senior_staff', 'staff')
        then v_appt.target_role
      else null
    end
  );

  if v_target_profile_role is null then
    raise exception 'POLICY_NOT_CONFIGURED:target_role_profile_map';
  end if;
  if v_target_profile_role not in ('owner', 'manager', 'supervisor', 'senior_staff', 'staff') then
    raise exception 'INVALID_PROFILE_ROLE_TARGET';
  end if;

  update public.profiles
  set role = v_target_profile_role,
      updated_at = now()
  where id = v_appt.employee_id;

  update public.leadership_appointments
  set active_role = v_target_profile_role,
      status = 'promoted',
      actual_end_date = current_date,
      updated_at = now()
  where id = p_appointment_id;

  insert into public.leadership_history (
    appointment_id, employee_id, event_type, old_value, new_value, reason, actor_id
  ) values (
    p_appointment_id,
    v_appt.employee_id,
    'promoted',
    jsonb_build_object('role', v_appt.active_role, 'status', v_appt.status),
    jsonb_build_object(
      'role', v_target_profile_role,
      'target_role', v_appt.target_role,
      'status', 'promoted',
      'effective_date', current_date
    ),
    null,
    v_actor
  );

  insert into public.leadership_history (
    appointment_id, employee_id, event_type, old_value, new_value, reason, actor_id
  ) values (
    p_appointment_id,
    v_appt.employee_id,
    'role_changed',
    jsonb_build_object('role', v_appt.active_role),
    jsonb_build_object('role', v_target_profile_role),
    null,
    v_actor
  );

  return jsonb_build_object(
    'ok', true,
    'appointment_id', p_appointment_id,
    'status', 'promoted',
    'effective_date', current_date,
    'profile_role', v_target_profile_role,
    'target_role', v_appt.target_role
  );
end;
$$;
revoke all on function public.promote_leadership_appointment(uuid) from public, anon;
grant execute on function public.promote_leadership_appointment(uuid) to authenticated;
