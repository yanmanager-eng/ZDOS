alter table public.leadership_assessments
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create or replace function public.get_leadership_training_progress(p_appointment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_appt public.leadership_appointments%rowtype;
  v_knowledge_keys text[];
  v_practical_keys text[];
  v_min_shift_logs integer;
  v_require_independent boolean;
  v_knowledge_passed integer := 0;
  v_practical_passed integer := 0;
  v_shift_passed integer := 0;
  v_independent_ok boolean := false;
  v_final_review_completed boolean := false;
  v_missing text[] := array[]::text[];
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

  if not (
    v_appt.employee_id = v_actor
    or v_appt.mentor_id = v_actor
    or public.is_leadership_manager_for_store(v_appt.store_id)
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select coalesce(array_agg(value), array[]::text[])
    into v_knowledge_keys
  from jsonb_array_elements_text(coalesce(v_appt.policy_snapshot->'required_knowledge_keys', '[]'::jsonb));

  select coalesce(array_agg(value), array[]::text[])
    into v_practical_keys
  from jsonb_array_elements_text(coalesce(v_appt.policy_snapshot->'required_practical_keys', '[]'::jsonb));

  if jsonb_typeof(v_appt.policy_snapshot->'min_shift_logs') = 'number' then
    v_min_shift_logs := (v_appt.policy_snapshot->>'min_shift_logs')::integer;
  end if;

  v_require_independent := coalesce((v_appt.policy_snapshot->>'require_independent_lead')::boolean, false);

  if coalesce(array_length(v_knowledge_keys,1),0) = 0 then
    v_missing := array_append(v_missing, 'required_knowledge_keys');
  end if;
  if coalesce(array_length(v_practical_keys,1),0) = 0 then
    v_missing := array_append(v_missing, 'required_practical_keys');
  end if;
  if v_min_shift_logs is null then
    v_missing := array_append(v_missing, 'min_shift_logs');
  end if;

  with latest as (
    select distinct on (assessment_key) assessment_key, result
    from public.leadership_assessments
    where appointment_id = p_appointment_id
      and assessment_type = 'knowledge'
      and assessment_key = any(v_knowledge_keys)
    order by assessment_key, attempt_no desc, assessed_at desc
  )
  select count(*) filter (where result='passed') into v_knowledge_passed from latest;

  with latest as (
    select distinct on (assessment_key) assessment_key, result
    from public.leadership_assessments
    where appointment_id = p_appointment_id
      and assessment_type = 'practical'
      and assessment_key = any(v_practical_keys)
    order by assessment_key, attempt_no desc, assessed_at desc
  )
  select count(*) filter (where result='passed') into v_practical_passed from latest;

  select count(*) filter (where result='passed'),
         coalesce(bool_or(can_lead_independently), false)
    into v_shift_passed, v_independent_ok
  from public.leadership_shift_logs
  where appointment_id = p_appointment_id;

  select exists(
    select 1 from public.leadership_assessments
    where appointment_id = p_appointment_id
      and assessment_type = 'final_review'
      and assessment_key = 'overall'
  ) into v_final_review_completed;

  return jsonb_build_object(
    'appointment_id', p_appointment_id,
    'policy_configured', cardinality(v_missing)=0,
    'missing_policy_keys', to_jsonb(v_missing),
    'knowledge_required_count', coalesce(array_length(v_knowledge_keys,1),0),
    'knowledge_passed_count', v_knowledge_passed,
    'knowledge_completed', cardinality(v_missing)=0 and v_knowledge_passed = coalesce(array_length(v_knowledge_keys,1),0),
    'practical_required_count', coalesce(array_length(v_practical_keys,1),0),
    'practical_passed_count', v_practical_passed,
    'practical_completed', cardinality(v_missing)=0 and v_practical_passed = coalesce(array_length(v_practical_keys,1),0),
    'shift_required_count', v_min_shift_logs,
    'shift_passed_count', v_shift_passed,
    'independent_lead_required', v_require_independent,
    'independent_lead_met', (not v_require_independent) or v_independent_ok,
    'shift_completed', cardinality(v_missing)=0 and v_shift_passed >= coalesce(v_min_shift_logs,2147483647) and ((not v_require_independent) or v_independent_ok),
    'final_review_completed', v_final_review_completed,
    'final_review_eligible', cardinality(v_missing)=0
       and v_knowledge_passed = coalesce(array_length(v_knowledge_keys,1),0)
       and v_practical_passed = coalesce(array_length(v_practical_keys,1),0)
       and v_shift_passed >= coalesce(v_min_shift_logs,2147483647)
       and ((not v_require_independent) or v_independent_ok)
  );
end;
$$;

create or replace function public.submit_leadership_final_review(
  p_appointment_id uuid,
  p_management_judgment text,
  p_floor_control text,
  p_people_leadership text,
  p_proactive_reporting text,
  p_stability text,
  p_overall_comment text,
  p_recommendation text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_appt public.leadership_appointments%rowtype;
  v_progress jsonb;
  v_result text;
  v_review_id uuid;
  v_meta jsonb;
  v_values text[] := array[p_management_judgment,p_floor_control,p_people_leadership,p_proactive_reporting,p_stability];
begin
  if v_actor is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_appt
  from public.leadership_appointments
  where id = p_appointment_id
  for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;

  if v_appt.status not in ('active','pending_assessment','extended','pending_review') then
    raise exception 'APPOINTMENT_NOT_ACTIVE';
  end if;
  if v_appt.employee_id = v_actor then raise exception 'SELF_REVIEW_FORBIDDEN'; end if;
  if not public.is_leadership_manager_for_store(v_appt.store_id) then raise exception 'FORBIDDEN'; end if;

  if exists (select 1 from unnest(v_values) x where x not in ('not_passed','needs_improvement','passed')) then
    raise exception 'INVALID_REVIEW_RESULT';
  end if;
  if p_recommendation not in ('promote','extend','return') then raise exception 'INVALID_RECOMMENDATION'; end if;
  if nullif(btrim(coalesce(p_overall_comment,'')),'') is null then raise exception 'COMMENT_REQUIRED'; end if;

  v_progress := public.get_leadership_training_progress(p_appointment_id);
  if coalesce((v_progress->>'policy_configured')::boolean,false) = false then
    raise exception 'POLICY_NOT_CONFIGURED: %', v_progress->'missing_policy_keys';
  end if;
  if coalesce((v_progress->>'final_review_eligible')::boolean,false) = false then
    raise exception 'TRAINING_PREREQUISITES_INCOMPLETE';
  end if;

  if 'not_passed' = any(v_values) then v_result := 'not_passed';
  elsif 'needs_improvement' = any(v_values) then v_result := 'needs_improvement';
  else v_result := 'passed';
  end if;

  v_meta := jsonb_build_object(
    'management_judgment',p_management_judgment,
    'floor_control',p_floor_control,
    'people_leadership',p_people_leadership,
    'proactive_reporting',p_proactive_reporting,
    'stability',p_stability,
    'recommendation',p_recommendation
  );

  insert into public.leadership_assessments(
    appointment_id,employee_id,assessment_type,assessment_key,result,comment,assessed_by,attempt_no,created_by,metadata
  ) values (
    p_appointment_id,v_appt.employee_id,'final_review','overall',v_result,p_overall_comment,v_actor,
    coalesce((select max(attempt_no)+1 from public.leadership_assessments where appointment_id=p_appointment_id and assessment_type='final_review' and assessment_key='overall'),1),
    v_actor,v_meta
  ) returning id into v_review_id;

  update public.leadership_appointments
  set status = 'pending_review', updated_at = now()
  where id = p_appointment_id;

  insert into public.leadership_history(appointment_id,employee_id,event_type,new_value,reason,actor_id)
  values (p_appointment_id,v_appt.employee_id,'final_review_completed',jsonb_build_object('review_id',v_review_id,'result',v_result,'recommendation',p_recommendation,'details',v_meta),p_overall_comment,v_actor);

  return v_review_id;
end;
$$;

revoke all on function public.get_leadership_training_progress(uuid) from public, anon;
grant execute on function public.get_leadership_training_progress(uuid) to authenticated;
revoke all on function public.submit_leadership_final_review(uuid,text,text,text,text,text,text,text) from public, anon;
grant execute on function public.submit_leadership_final_review(uuid,text,text,text,text,text,text,text) to authenticated;;
