create or replace function public.validate_leadership_settings(p_settings jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_missing text[] := array[]::text[];
  v_map jsonb;
  v_valid_roles text[] := array['owner','manager','supervisor','trainee_manager','senior_staff','staff'];
  v_role text;
begin
  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    return jsonb_build_object('valid', false, 'missing', jsonb_build_array('settings_object'));
  end if;

  if jsonb_typeof(p_settings->'required_knowledge_keys') <> 'array'
     or jsonb_array_length(coalesce(p_settings->'required_knowledge_keys','[]'::jsonb)) = 0 then
    v_missing := array_append(v_missing, 'required_knowledge_keys');
  end if;

  if jsonb_typeof(p_settings->'required_practical_keys') <> 'array'
     or jsonb_array_length(coalesce(p_settings->'required_practical_keys','[]'::jsonb)) = 0 then
    v_missing := array_append(v_missing, 'required_practical_keys');
  end if;

  if jsonb_typeof(p_settings->'min_shift_logs') <> 'number'
     or coalesce((p_settings->>'min_shift_logs')::int, 0) < 1 then
    v_missing := array_append(v_missing, 'min_shift_logs');
  end if;

  if jsonb_typeof(p_settings->'decision_roles') <> 'array'
     or jsonb_array_length(coalesce(p_settings->'decision_roles','[]'::jsonb)) = 0 then
    v_missing := array_append(v_missing, 'decision_roles');
  else
    for v_role in select jsonb_array_elements_text(p_settings->'decision_roles') loop
      if not (v_role = any(v_valid_roles)) then
        v_missing := array_append(v_missing, 'decision_roles_invalid:' || v_role);
      end if;
    end loop;
  end if;

  v_map := p_settings->'target_role_profile_map';
  if jsonb_typeof(v_map) <> 'object' then
    v_missing := array_append(v_missing, 'target_role_profile_map');
  else
    if coalesce(trim(v_map->>'deputy_leader'),'') = '' then
      v_missing := array_append(v_missing, 'target_role_profile_map.deputy_leader');
    elsif not ((v_map->>'deputy_leader') = any(v_valid_roles)) then
      v_missing := array_append(v_missing, 'target_role_profile_map.deputy_leader_invalid');
    end if;

    if coalesce(trim(v_map->>'leader'),'') = '' then
      v_missing := array_append(v_missing, 'target_role_profile_map.leader');
    elsif not ((v_map->>'leader') = any(v_valid_roles)) then
      v_missing := array_append(v_missing, 'target_role_profile_map.leader_invalid');
    end if;
  end if;

  return jsonb_build_object(
    'valid', cardinality(v_missing) = 0,
    'missing', to_jsonb(v_missing)
  );
end;
$$;

revoke all on function public.validate_leadership_settings(jsonb) from public;
revoke all on function public.validate_leadership_settings(jsonb) from anon;
grant execute on function public.validate_leadership_settings(jsonb) to authenticated;

create or replace function public.upsert_leadership_settings(
  p_scope_type text,
  p_store_id uuid,
  p_policy_version text,
  p_settings jsonb,
  p_is_active boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
  v_id uuid;
  v_validation jsonb;
begin
  if v_actor is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select role into v_actor_role
  from public.profiles
  where id = v_actor and is_active = true;

  if v_actor_role <> 'owner' then
    raise exception 'FORBIDDEN';
  end if;

  if p_scope_type not in ('company','store') then
    raise exception 'INVALID_SCOPE_TYPE';
  end if;

  if p_scope_type = 'company' and p_store_id is not null then
    raise exception 'COMPANY_SCOPE_STORE_MUST_BE_NULL';
  end if;

  if p_scope_type = 'store' and p_store_id is null then
    raise exception 'STORE_SCOPE_REQUIRES_STORE_ID';
  end if;

  if coalesce(trim(p_policy_version),'') = '' then
    raise exception 'POLICY_VERSION_REQUIRED';
  end if;

  if p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    raise exception 'SETTINGS_OBJECT_REQUIRED';
  end if;

  if p_is_active then
    v_validation := public.validate_leadership_settings(p_settings);
    if coalesce((v_validation->>'valid')::boolean, false) is not true then
      raise exception 'POLICY_INCOMPLETE: %', coalesce(v_validation->'missing','[]'::jsonb)::text;
    end if;

    update public.leadership_settings
       set is_active = false,
           updated_by = v_actor,
           updated_at = now()
     where scope_type = p_scope_type
       and ((p_scope_type = 'company' and store_id is null)
            or (p_scope_type = 'store' and store_id = p_store_id))
       and is_active = true;
  end if;

  insert into public.leadership_settings(
    scope_type, store_id, policy_version, is_active, settings,
    created_by, updated_by
  ) values (
    p_scope_type, p_store_id, trim(p_policy_version), coalesce(p_is_active,false), p_settings,
    v_actor, v_actor
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.upsert_leadership_settings(text,uuid,text,jsonb,boolean) from public;
revoke all on function public.upsert_leadership_settings(text,uuid,text,jsonb,boolean) from anon;
grant execute on function public.upsert_leadership_settings(text,uuid,text,jsonb,boolean) to authenticated;;
