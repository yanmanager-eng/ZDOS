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
grant execute on function public.upsert_leadership_settings(text,uuid,text,jsonb,boolean) to authenticated;

create or replace function public.get_active_leadership_settings(p_store_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with candidate as (
    select ls.*,
           case when ls.scope_type='store' then 1 else 2 end as priority
    from public.leadership_settings ls
    where ls.is_active = true
      and (
        (ls.scope_type='store' and p_store_id is not null and ls.store_id = p_store_id)
        or ls.scope_type='company'
      )
    order by priority
    limit 1
  )
  select case when exists(select 1 from candidate)
    then jsonb_build_object(
      'id', c.id,
      'scope_type', c.scope_type,
      'store_id', c.store_id,
      'policy_version', c.policy_version,
      'settings', c.settings
    )
    else null end
  from candidate c
  union all
  select null where not exists(select 1 from candidate)
  limit 1;
$$;

revoke all on function public.get_active_leadership_settings(uuid) from public;
revoke all on function public.get_active_leadership_settings(uuid) from anon;
grant execute on function public.get_active_leadership_settings(uuid) to authenticated;;
