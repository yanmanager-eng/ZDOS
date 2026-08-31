create or replace function public.is_leadership_manager_for_store(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
      and p.role in ('owner','manager','supervisor')
      and (
        p.role = 'owner'
        or exists (
          select 1
          from public.user_store_memberships m
          where m.user_id = p.id
            and m.store_id = p_store_id
            and m.is_active = true
        )
      )
  );
$$;

revoke all on function public.is_leadership_manager_for_store(uuid) from public, anon;
grant execute on function public.is_leadership_manager_for_store(uuid) to authenticated;

grant select on public.leadership_appointments,
                public.leadership_assessments,
                public.leadership_shift_logs,
                public.leadership_history,
                public.leadership_settings
  to authenticated;

revoke insert, update, delete on public.leadership_appointments,
                               public.leadership_assessments,
                               public.leadership_shift_logs,
                               public.leadership_history,
                               public.leadership_settings
  from authenticated, anon;

-- Appointments: self, assigned mentor, or authorized store leadership.
drop policy if exists leadership_appointments_select on public.leadership_appointments;
create policy leadership_appointments_select
on public.leadership_appointments
for select
to authenticated
using (
  employee_id = (select auth.uid())
  or mentor_id = (select auth.uid())
  or public.is_leadership_manager_for_store(store_id)
);

-- Assessments inherit visibility from the parent appointment.
drop policy if exists leadership_assessments_select on public.leadership_assessments;
create policy leadership_assessments_select
on public.leadership_assessments
for select
to authenticated
using (
  employee_id = (select auth.uid())
  or exists (
    select 1
    from public.leadership_appointments a
    where a.id = appointment_id
      and (
        a.mentor_id = (select auth.uid())
        or public.is_leadership_manager_for_store(a.store_id)
      )
  )
);

-- Shift logs: self, supervising mentor/supervisor on that record, or authorized store leadership.
drop policy if exists leadership_shift_logs_select on public.leadership_shift_logs;
create policy leadership_shift_logs_select
on public.leadership_shift_logs
for select
to authenticated
using (
  employee_id = (select auth.uid())
  or supervisor_id = (select auth.uid())
  or public.is_leadership_manager_for_store(store_id)
  or exists (
    select 1
    from public.leadership_appointments a
    where a.id = appointment_id
      and a.mentor_id = (select auth.uid())
  )
);

-- History: self, assigned mentor, or authorized store leadership via the appointment.
drop policy if exists leadership_history_select on public.leadership_history;
create policy leadership_history_select
on public.leadership_history
for select
to authenticated
using (
  employee_id = (select auth.uid())
  or exists (
    select 1
    from public.leadership_appointments a
    where a.id = appointment_id
      and (
        a.mentor_id = (select auth.uid())
        or public.is_leadership_manager_for_store(a.store_id)
      )
  )
);

-- Settings are HR/admin configuration: readable by owner, or manager/supervisor for applicable store scope.
drop policy if exists leadership_settings_select on public.leadership_settings;
create policy leadership_settings_select
on public.leadership_settings
for select
to authenticated
using (
  public.is_owner_user()
  or (
    scope_type = 'store'
    and store_id is not null
    and public.is_leadership_manager_for_store(store_id)
  )
  or (
    scope_type = 'company'
    and exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.is_active = true
        and p.role in ('manager','supervisor')
    )
  )
);;
