create table public.leadership_appointments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles(id) on delete restrict,
  store_id uuid not null references public.stores(id) on delete restrict,
  previous_role text not null,
  active_role text not null default 'trainee_manager',
  target_role text not null,
  effective_date date not null,
  planned_end_date date not null,
  actual_end_date date,
  mentor_id uuid references public.profiles(id) on delete set null,
  appointed_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'active' check (status in ('active','pending_assessment','pending_review','ready_for_promotion','extended','promoted','returned','cancelled')),
  notes text,
  policy_version text not null default 'v1.0',
  policy_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leadership_appointments_dates_chk check (planned_end_date >= effective_date),
  constraint leadership_appointments_actual_end_chk check (actual_end_date is null or actual_end_date >= effective_date)
);

create unique index leadership_appointments_one_open_per_employee_idx
on public.leadership_appointments(employee_id)
where status in ('active','pending_assessment','pending_review','ready_for_promotion','extended');

create index leadership_appointments_store_id_idx on public.leadership_appointments(store_id);
create index leadership_appointments_mentor_id_idx on public.leadership_appointments(mentor_id);
create index leadership_appointments_status_idx on public.leadership_appointments(status);

create table public.leadership_assessments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.leadership_appointments(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete restrict,
  assessment_type text not null check (assessment_type in ('knowledge','practical','final_review')),
  assessment_key text not null,
  result text not null check (result in ('not_passed','needs_improvement','passed')),
  score numeric(6,2),
  comment text,
  assessed_by uuid not null references public.profiles(id) on delete restrict,
  assessed_at timestamptz not null default now(),
  attempt_no integer not null default 1 check (attempt_no >= 1),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index leadership_assessments_attempt_uq
on public.leadership_assessments(appointment_id, assessment_type, assessment_key, attempt_no);
create index leadership_assessments_employee_id_idx on public.leadership_assessments(employee_id);
create index leadership_assessments_assessed_by_idx on public.leadership_assessments(assessed_by);

create table public.leadership_shift_logs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.leadership_appointments(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete restrict,
  store_id uuid not null references public.stores(id) on delete restrict,
  shift_date date not null,
  shift_type text,
  staff_count integer check (staff_count is null or staff_count >= 0),
  supervisor_id uuid not null references public.profiles(id) on delete restrict,
  main_tasks text,
  incident_summary text,
  handling_summary text,
  result text not null check (result in ('not_passed','needs_improvement','passed')),
  can_lead_independently boolean not null default false,
  supervisor_comment text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leadership_shift_logs_appointment_id_idx on public.leadership_shift_logs(appointment_id);
create index leadership_shift_logs_employee_id_idx on public.leadership_shift_logs(employee_id);
create index leadership_shift_logs_store_id_idx on public.leadership_shift_logs(store_id);
create index leadership_shift_logs_shift_date_idx on public.leadership_shift_logs(shift_date);

create table public.leadership_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.leadership_appointments(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in ('appointment_created','role_changed','assessment_completed','assessment_retested','shift_log_created','internship_extended','final_review_completed','promotion_deferred','promoted','returned_to_previous_role','cancelled','document_created','announcement_created','announcement_published')),
  old_value jsonb,
  new_value jsonb,
  reason text,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index leadership_history_appointment_id_idx on public.leadership_history(appointment_id);
create index leadership_history_employee_id_idx on public.leadership_history(employee_id);
create index leadership_history_occurred_at_idx on public.leadership_history(occurred_at desc);

create table public.leadership_settings (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null default 'company' check (scope_type in ('company','store')),
  store_id uuid references public.stores(id) on delete cascade,
  policy_version text not null,
  is_active boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leadership_settings_scope_chk check ((scope_type = 'company' and store_id is null) or (scope_type = 'store' and store_id is not null))
);

create unique index leadership_settings_company_active_uq
on public.leadership_settings(scope_type)
where scope_type = 'company' and is_active = true;

create unique index leadership_settings_store_active_uq
on public.leadership_settings(store_id)
where scope_type = 'store' and is_active = true;

alter table public.leadership_appointments enable row level security;
alter table public.leadership_assessments enable row level security;
alter table public.leadership_shift_logs enable row level security;
alter table public.leadership_history enable row level security;
alter table public.leadership_settings enable row level security;

revoke all on table public.leadership_appointments from anon, authenticated;
revoke all on table public.leadership_assessments from anon, authenticated;
revoke all on table public.leadership_shift_logs from anon, authenticated;
revoke all on table public.leadership_history from anon, authenticated;
revoke all on table public.leadership_settings from anon, authenticated;;
