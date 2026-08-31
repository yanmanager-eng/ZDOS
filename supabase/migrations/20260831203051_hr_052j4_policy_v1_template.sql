create or replace function public.get_leadership_policy_template(p_policy_version text default 'v1.0')
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if coalesce(trim(p_policy_version),'') <> 'v1.0' then
    raise exception 'UNSUPPORTED_POLICY_VERSION';
  end if;

  return jsonb_build_object(
    'policy_version', 'v1.0',
    'required_knowledge_keys', jsonb_build_array(
      'leadership_role_responsibility',
      'attendance_clock_rules',
      'leave_scheduling_management',
      'floor_shift_management',
      'handover_records',
      'zdos_basic_operations'
    ),
    'knowledge_labels', jsonb_build_object(
      'leadership_role_responsibility', '幹部角色與責任',
      'attendance_clock_rules', '出勤與打卡',
      'leave_scheduling_management', '請假／排假',
      'floor_shift_management', '現場值班與調度',
      'handover_records', '交接與紀錄',
      'zdos_basic_operations', 'ZDOS 基本操作'
    ),
    'required_practical_keys', jsonb_build_array(
      'opening_lead',
      'peak_hour_dispatch',
      'task_assignment',
      'problem_handling',
      'handover_ability',
      'closing_confirmation'
    ),
    'practical_labels', jsonb_build_object(
      'opening_lead', '開店帶班',
      'peak_hour_dispatch', '尖峰調度',
      'task_assignment', '工作指派',
      'problem_handling', '問題處理',
      'handover_ability', '交接能力',
      'closing_confirmation', '收店確認'
    ),
    'assessment_result_values', jsonb_build_array('not_passed','needs_improvement','passed'),
    'retest_policy', 'failed_items_only',
    'retain_all_attempts', true,
    'trainee_profile_role', 'trainee_manager',
    'min_shift_logs', null,
    'require_independent_lead', false,
    'decision_roles', jsonb_build_array(),
    'target_role_profile_map', jsonb_build_object(
      'deputy_leader', null,
      'leader', null
    ),
    'activation_ready', false,
    'activation_blockers', jsonb_build_array(
      'min_shift_logs',
      'decision_roles',
      'target_role_profile_map.deputy_leader',
      'target_role_profile_map.leader'
    )
  );
end;
$$;

revoke all on function public.get_leadership_policy_template(text) from public;
revoke all on function public.get_leadership_policy_template(text) from anon;
grant execute on function public.get_leadership_policy_template(text) to authenticated;;
