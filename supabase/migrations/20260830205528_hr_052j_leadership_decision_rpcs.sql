create or replace function public.promote_leadership_appointment(p_appointment_id uuid)
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
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_appt from public.leadership_appointments where id=p_appointment_id for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  if v_appt.status not in ('active','pending_assessment','pending_review','ready_for_promotion','extended') then
    raise exception 'APPOINTMENT_NOT_ACTIVE';
  end if;
  if v_appt.employee_id = v_actor then raise exception 'SELF_DECISION_FORBIDDEN'; end if;

  select role into v_actor_role from public.profiles where id=v_actor and is_active=true;
  if v_actor_role is null then raise exception 'ACTOR_NOT_ACTIVE'; end if;

  select coalesce(array_agg(value), array[]::text[])
  into v_decision_roles
  from jsonb_array_elements_text(coalesce(v_appt.policy_snapshot->'decision_roles','[]'::jsonb));

  if coalesce(array_length(v_decision_roles,1),0)=0 then raise exception 'POLICY_NOT_CONFIGURED:decision_roles'; end if;
  if not (v_actor_role = any(v_decision_roles)) then raise exception 'FORBIDDEN'; end if;
  if v_actor_role <> 'owner' and not exists (
    select 1 from public.user_store_memberships m where m.user_id=v_actor and m.store_id=v_appt.store_id and m.is_active=true
  ) then raise exception 'FORBIDDEN_STORE'; end if;

  v_progress := public.get_leadership_training_progress(p_appointment_id);
  if coalesce((v_progress->>'policy_configured')::boolean,false) is not true then raise exception 'POLICY_NOT_CONFIGURED'; end if;
  if coalesce((v_progress->>'knowledge_completed')::boolean,false) is not true
     or coalesce((v_progress->>'practical_completed')::boolean,false) is not true
     or coalesce((v_progress->>'shift_completed')::boolean,false) is not true
     or coalesce((v_progress->>'final_review_completed')::boolean,false) is not true then
    raise exception 'PROMOTION_PREREQUISITES_INCOMPLETE';
  end if;

  v_target_profile_role := nullif(v_appt.policy_snapshot->>'profile_role_target','');
  if v_target_profile_role is null then
    if v_appt.target_role in ('owner','manager','supervisor','trainee_manager','senior_staff','staff') then
      v_target_profile_role := v_appt.target_role;
    else
      raise exception 'POLICY_NOT_CONFIGURED:profile_role_target';
    end if;
  end if;
  if v_target_profile_role not in ('owner','manager','supervisor','trainee_manager','senior_staff','staff') then
    raise exception 'INVALID_PROFILE_ROLE_TARGET';
  end if;
  if v_target_profile_role = 'trainee_manager' then raise exception 'INVALID_PROMOTION_TARGET'; end if;

  update public.profiles set role=v_target_profile_role, updated_at=now() where id=v_appt.employee_id;
  update public.leadership_appointments
    set active_role=v_target_profile_role, status='promoted', actual_end_date=current_date, updated_at=now()
    where id=p_appointment_id;

  insert into public.leadership_history(appointment_id,employee_id,event_type,old_value,new_value,reason,actor_id)
  values (p_appointment_id,v_appt.employee_id,'promoted',
    jsonb_build_object('role',v_appt.active_role,'status',v_appt.status),
    jsonb_build_object('role',v_target_profile_role,'target_role',v_appt.target_role,'status','promoted'),
    null,v_actor);
  insert into public.leadership_history(appointment_id,employee_id,event_type,old_value,new_value,reason,actor_id)
  values (p_appointment_id,v_appt.employee_id,'role_changed',
    jsonb_build_object('role',v_appt.active_role),jsonb_build_object('role',v_target_profile_role),null,v_actor);

  return jsonb_build_object('ok',true,'appointment_id',p_appointment_id,'status','promoted','profile_role',v_target_profile_role,'target_role',v_appt.target_role);
end;
$$;

create or replace function public.extend_leadership_appointment(p_appointment_id uuid, p_new_end_date date, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_appt public.leadership_appointments%rowtype;
  v_actor_role text;
  v_decision_roles text[];
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_reason is null or btrim(p_reason)='' then raise exception 'REASON_REQUIRED'; end if;

  select * into v_appt from public.leadership_appointments where id=p_appointment_id for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  if v_appt.status not in ('active','pending_assessment','pending_review','ready_for_promotion','extended') then raise exception 'APPOINTMENT_NOT_ACTIVE'; end if;
  if p_new_end_date is null or p_new_end_date <= v_appt.planned_end_date then raise exception 'NEW_END_DATE_MUST_BE_LATER'; end if;
  if v_appt.employee_id=v_actor then raise exception 'SELF_DECISION_FORBIDDEN'; end if;

  select role into v_actor_role from public.profiles where id=v_actor and is_active=true;
  if v_actor_role is null then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  select coalesce(array_agg(value), array[]::text[]) into v_decision_roles
  from jsonb_array_elements_text(coalesce(v_appt.policy_snapshot->'decision_roles','[]'::jsonb));
  if coalesce(array_length(v_decision_roles,1),0)=0 then raise exception 'POLICY_NOT_CONFIGURED:decision_roles'; end if;
  if not (v_actor_role=any(v_decision_roles)) then raise exception 'FORBIDDEN'; end if;
  if v_actor_role <> 'owner' and not exists (
    select 1 from public.user_store_memberships m where m.user_id=v_actor and m.store_id=v_appt.store_id and m.is_active=true
  ) then raise exception 'FORBIDDEN_STORE'; end if;

  update public.leadership_appointments set planned_end_date=p_new_end_date,status='extended',updated_at=now() where id=p_appointment_id;
  insert into public.leadership_history(appointment_id,employee_id,event_type,old_value,new_value,reason,actor_id)
  values(p_appointment_id,v_appt.employee_id,'internship_extended',
    jsonb_build_object('planned_end_date',v_appt.planned_end_date,'status',v_appt.status),
    jsonb_build_object('planned_end_date',p_new_end_date,'status','extended'),btrim(p_reason),v_actor);
  return jsonb_build_object('ok',true,'appointment_id',p_appointment_id,'status','extended','planned_end_date',p_new_end_date);
end;
$$;

create or replace function public.return_leadership_appointment(p_appointment_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_appt public.leadership_appointments%rowtype;
  v_actor_role text;
  v_decision_roles text[];
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_reason is null or btrim(p_reason)='' then raise exception 'REASON_REQUIRED'; end if;

  select * into v_appt from public.leadership_appointments where id=p_appointment_id for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  if v_appt.status not in ('active','pending_assessment','pending_review','ready_for_promotion','extended') then raise exception 'APPOINTMENT_NOT_ACTIVE'; end if;
  if v_appt.employee_id=v_actor then raise exception 'SELF_DECISION_FORBIDDEN'; end if;

  select role into v_actor_role from public.profiles where id=v_actor and is_active=true;
  if v_actor_role is null then raise exception 'ACTOR_NOT_ACTIVE'; end if;
  select coalesce(array_agg(value), array[]::text[]) into v_decision_roles
  from jsonb_array_elements_text(coalesce(v_appt.policy_snapshot->'decision_roles','[]'::jsonb));
  if coalesce(array_length(v_decision_roles,1),0)=0 then raise exception 'POLICY_NOT_CONFIGURED:decision_roles'; end if;
  if not (v_actor_role=any(v_decision_roles)) then raise exception 'FORBIDDEN'; end if;
  if v_actor_role <> 'owner' and not exists (
    select 1 from public.user_store_memberships m where m.user_id=v_actor and m.store_id=v_appt.store_id and m.is_active=true
  ) then raise exception 'FORBIDDEN_STORE'; end if;
  if v_appt.previous_role not in ('owner','manager','supervisor','trainee_manager','senior_staff','staff') then raise exception 'INVALID_PREVIOUS_ROLE'; end if;

  update public.profiles set role=v_appt.previous_role,updated_at=now() where id=v_appt.employee_id;
  update public.leadership_appointments set active_role=v_appt.previous_role,status='returned',actual_end_date=current_date,updated_at=now() where id=p_appointment_id;
  insert into public.leadership_history(appointment_id,employee_id,event_type,old_value,new_value,reason,actor_id)
  values(p_appointment_id,v_appt.employee_id,'returned_to_previous_role',
    jsonb_build_object('role',v_appt.active_role,'status',v_appt.status),
    jsonb_build_object('role',v_appt.previous_role,'status','returned'),btrim(p_reason),v_actor);
  insert into public.leadership_history(appointment_id,employee_id,event_type,old_value,new_value,reason,actor_id)
  values(p_appointment_id,v_appt.employee_id,'role_changed',
    jsonb_build_object('role',v_appt.active_role),jsonb_build_object('role',v_appt.previous_role),btrim(p_reason),v_actor);
  return jsonb_build_object('ok',true,'appointment_id',p_appointment_id,'status','returned','profile_role',v_appt.previous_role);
end;
$$;

revoke all on function public.promote_leadership_appointment(uuid) from public, anon;
revoke all on function public.extend_leadership_appointment(uuid,date,text) from public, anon;
revoke all on function public.return_leadership_appointment(uuid,text) from public, anon;
grant execute on function public.promote_leadership_appointment(uuid) to authenticated;
grant execute on function public.extend_leadership_appointment(uuid,date,text) to authenticated;
grant execute on function public.return_leadership_appointment(uuid,text) to authenticated;;
