create or replace function public.submit_leadership_assessment(
  p_appointment_id uuid,
  p_assessment_type text,
  p_assessment_key text,
  p_result text,
  p_score numeric default null,
  p_comment text default null
)
returns public.leadership_assessments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_appt public.leadership_appointments;
  v_attempt_no integer;
  v_row public.leadership_assessments;
  v_event text;
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_appt
  from public.leadership_appointments
  where id = p_appointment_id;

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND';
  end if;

  if v_appt.status not in ('active','pending_assessment','pending_review','ready_for_promotion','extended') then
    raise exception 'APPOINTMENT_NOT_ACTIVE';
  end if;

  if v_actor = v_appt.employee_id then
    raise exception 'SELF_ASSESSMENT_NOT_ALLOWED';
  end if;

  if not public.is_leadership_manager_for_store(v_appt.store_id) then
    raise exception 'FORBIDDEN';
  end if;

  if p_assessment_type not in ('knowledge','practical','final_review') then
    raise exception 'INVALID_ASSESSMENT_TYPE';
  end if;

  if coalesce(btrim(p_assessment_key),'') = '' then
    raise exception 'ASSESSMENT_KEY_REQUIRED';
  end if;

  if p_result not in ('not_passed','needs_improvement','passed') then
    raise exception 'INVALID_RESULT';
  end if;

  select coalesce(max(attempt_no),0) + 1
    into v_attempt_no
  from public.leadership_assessments
  where appointment_id = p_appointment_id
    and assessment_type = p_assessment_type
    and assessment_key = p_assessment_key;

  insert into public.leadership_assessments (
    appointment_id,
    employee_id,
    assessment_type,
    assessment_key,
    result,
    score,
    comment,
    assessed_by,
    assessed_at,
    attempt_no,
    created_by
  ) values (
    p_appointment_id,
    v_appt.employee_id,
    p_assessment_type,
    btrim(p_assessment_key),
    p_result,
    p_score,
    nullif(btrim(p_comment),''),
    v_actor,
    now(),
    v_attempt_no,
    v_actor
  ) returning * into v_row;

  v_event := case when v_attempt_no > 1 then 'assessment_retested' else 'assessment_completed' end;

  insert into public.leadership_history (
    appointment_id,
    employee_id,
    event_type,
    old_value,
    new_value,
    reason,
    actor_id
  ) values (
    p_appointment_id,
    v_appt.employee_id,
    v_event,
    null,
    jsonb_build_object(
      'assessment_type', p_assessment_type,
      'assessment_key', btrim(p_assessment_key),
      'result', p_result,
      'score', p_score,
      'attempt_no', v_attempt_no
    ),
    nullif(btrim(p_comment),''),
    v_actor
  );

  return v_row;
end;
$$;

revoke all on function public.submit_leadership_assessment(uuid,text,text,text,numeric,text) from public;
grant execute on function public.submit_leadership_assessment(uuid,text,text,text,numeric,text) to authenticated;

create or replace function public.create_leadership_shift_log(
  p_appointment_id uuid,
  p_shift_date date,
  p_shift_type text,
  p_staff_count integer default null,
  p_main_tasks text default null,
  p_incident_summary text default null,
  p_handling_summary text default null,
  p_result text default 'passed',
  p_can_lead_independently boolean default false,
  p_supervisor_comment text default null
)
returns public.leadership_shift_logs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_appt public.leadership_appointments;
  v_row public.leadership_shift_logs;
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_appt
  from public.leadership_appointments
  where id = p_appointment_id;

  if not found then
    raise exception 'APPOINTMENT_NOT_FOUND';
  end if;

  if v_appt.status not in ('active','pending_assessment','pending_review','ready_for_promotion','extended') then
    raise exception 'APPOINTMENT_NOT_ACTIVE';
  end if;

  if v_actor = v_appt.employee_id then
    raise exception 'SELF_SHIFT_LOG_NOT_ALLOWED';
  end if;

  if not public.is_leadership_manager_for_store(v_appt.store_id) then
    raise exception 'FORBIDDEN';
  end if;

  if p_shift_date is null then
    raise exception 'SHIFT_DATE_REQUIRED';
  end if;

  if coalesce(btrim(p_shift_type),'') = '' then
    raise exception 'SHIFT_TYPE_REQUIRED';
  end if;

  if p_staff_count is not null and p_staff_count < 0 then
    raise exception 'INVALID_STAFF_COUNT';
  end if;

  if p_result not in ('not_passed','needs_improvement','passed') then
    raise exception 'INVALID_RESULT';
  end if;

  insert into public.leadership_shift_logs (
    appointment_id,
    employee_id,
    store_id,
    shift_date,
    shift_type,
    staff_count,
    supervisor_id,
    main_tasks,
    incident_summary,
    handling_summary,
    result,
    can_lead_independently,
    supervisor_comment,
    created_by
  ) values (
    p_appointment_id,
    v_appt.employee_id,
    v_appt.store_id,
    p_shift_date,
    btrim(p_shift_type),
    p_staff_count,
    v_actor,
    nullif(btrim(p_main_tasks),''),
    nullif(btrim(p_incident_summary),''),
    nullif(btrim(p_handling_summary),''),
    p_result,
    coalesce(p_can_lead_independently,false),
    nullif(btrim(p_supervisor_comment),''),
    v_actor
  ) returning * into v_row;

  insert into public.leadership_history (
    appointment_id,
    employee_id,
    event_type,
    old_value,
    new_value,
    reason,
    actor_id
  ) values (
    p_appointment_id,
    v_appt.employee_id,
    'shift_log_created',
    null,
    jsonb_build_object(
      'shift_date', p_shift_date,
      'shift_type', btrim(p_shift_type),
      'result', p_result,
      'can_lead_independently', coalesce(p_can_lead_independently,false)
    ),
    nullif(btrim(p_supervisor_comment),''),
    v_actor
  );

  return v_row;
end;
$$;

revoke all on function public.create_leadership_shift_log(uuid,date,text,integer,text,text,text,text,boolean,text) from public;
grant execute on function public.create_leadership_shift_log(uuid,date,text,integer,text,text,text,text,boolean,text) to authenticated;;
