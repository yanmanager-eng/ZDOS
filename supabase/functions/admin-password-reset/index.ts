/**
 * AUTH-004 Phase 1｜管理員重設密碼
 * - 驗證呼叫者 JWT（owner / manager = Founder / Owner / Admin）
 * - 以 Service Role 呼叫 auth.admin.updateUserById（禁止前端 Secret）
 * - 可選寫入 profiles.must_change_password
 * - audit_logs：RESET_PASSWORD（不得寫入密碼內容）
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type RequestBody = {
  action?: string
  employeeNo?: string
  newPassword?: string
  mustChangePassword?: boolean
}

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeEmpNo(raw: unknown): string {
  return String(raw || '').trim().toUpperCase()
}

function validatePassword(pass: string): string {
  if (!pass || !pass.trim()) return '密碼不得為空白'
  if (pass.length < 8) return '密碼至少需要 8 個字元'
  if (!/[A-Za-z]/.test(pass) || !/[0-9]/.test(pass)) return '密碼必須包含英文字母及數字'
  return ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed' })
  }

  const supabaseUrl = String(Deno.env.get('SUPABASE_URL') || '').trim()
  const serviceRole = String(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '').trim()
  const anonKey = String(Deno.env.get('SUPABASE_ANON_KEY') || '').trim()
  if (!supabaseUrl || !serviceRole) {
    return json(500, { ok: false, message: 'Supabase service credentials missing' })
  }

  const authHeader = req.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) {
    return json(401, { ok: false, message: 'Missing Authorization' })
  }

  const userClient = createClient(supabaseUrl, anonKey || serviceRole, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData?.user?.id) {
    return json(401, { ok: false, message: 'Invalid session' })
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch (_) {
    return json(400, { ok: false, message: 'Invalid JSON body' })
  }

  const action = String(body.action || 'reset_password').trim()
  if (action !== 'reset_password') {
    return json(400, { ok: false, message: 'Unsupported action' })
  }

  const admin = createClient(supabaseUrl, serviceRole)

  const actorId = userData.user.id
  const { data: actorProfile, error: actorErr } = await admin
    .from('profiles')
    .select('id, employee_no, display_name, role, is_active, default_store_id')
    .eq('id', actorId)
    .maybeSingle()

  if (actorErr || !actorProfile) {
    return json(403, { ok: false, message: '找不到操作人 Profile' })
  }
  if (actorProfile.is_active === false) {
    return json(403, { ok: false, message: '操作人帳號已停用' })
  }
  const actorRole = String(actorProfile.role || '').trim()
  /* Founder / Owner / Admin → cloud roles owner | manager */
  if (actorRole !== 'owner' && actorRole !== 'manager') {
    return json(403, { ok: false, message: '僅 Founder／Owner／Admin 可重設密碼' })
  }

  const employeeNo = normalizeEmpNo(body.employeeNo)
  if (!employeeNo) {
    return json(400, { ok: false, message: '缺少員工編號' })
  }

  const newPassword = String(body.newPassword || '')
  const pwdErr = validatePassword(newPassword)
  if (pwdErr) {
    return json(400, { ok: false, message: pwdErr })
  }

  const mustChangePassword = body.mustChangePassword !== false

  const { data: targetProfile, error: targetErr } = await admin
    .from('profiles')
    .select('id, employee_no, display_name, role, is_active, default_store_id, must_change_password')
    .eq('employee_no', employeeNo)
    .maybeSingle()

  if (targetErr || !targetProfile?.id) {
    return json(404, { ok: false, message: '找不到此員工雲端帳號' })
  }
  if (targetProfile.is_active === false) {
    return json(400, { ok: false, message: '此員工帳號已停用，無法重設密碼' })
  }

  const { error: authErr } = await admin.auth.admin.updateUserById(targetProfile.id, {
    password: newPassword,
  })
  if (authErr) {
    console.error('[AUTH-004] auth.admin.updateUserById failed', {
      actor: actorProfile.employee_no,
      target: employeeNo,
      message: authErr.message,
    })
    return json(500, { ok: false, message: authErr.message || '更新 Auth 密碼失敗' })
  }

  const { error: profileErr } = await admin
    .from('profiles')
    .update({ must_change_password: mustChangePassword })
    .eq('id', targetProfile.id)

  if (profileErr) {
    console.error('[AUTH-004] profiles.must_change_password update failed', {
      actor: actorProfile.employee_no,
      target: employeeNo,
      message: profileErr.message,
    })
    return json(500, {
      ok: false,
      message: '密碼已更新，但 must_change_password 寫入失敗，請重試或聯絡技術支援',
    })
  }

  const { error: auditErr } = await admin.from('audit_logs').insert({
    user_id: actorId,
    store_id: targetProfile.default_store_id || actorProfile.default_store_id || null,
    action: 'RESET_PASSWORD',
    entity_type: 'profile',
    entity_id: targetProfile.id,
    old_data: {
      must_change_password: targetProfile.must_change_password === true,
      target_employee_no: targetProfile.employee_no,
    },
    new_data: {
      must_change_password: mustChangePassword,
      target_employee_no: targetProfile.employee_no,
      target_display_name: targetProfile.display_name,
      actor_employee_no: actorProfile.employee_no,
      actor_display_name: actorProfile.display_name,
      actor_role: actorRole,
    },
  })

  if (auditErr) {
    console.error('[AUTH-004] audit_logs insert failed', {
      actor: actorProfile.employee_no,
      target: employeeNo,
      message: auditErr.message,
    })
    /* 密碼已更新：audit 失敗不回滾，但回報警告 */
    return json(200, {
      ok: true,
      message: '密碼已重設（稽核紀錄寫入失敗，請通知技術支援）',
      employeeNo: targetProfile.employee_no,
      mustChangePassword,
      auditOk: false,
    })
  }

  return json(200, {
    ok: true,
    message: '密碼已重設',
    employeeNo: targetProfile.employee_no,
    mustChangePassword,
    auditOk: true,
  })
})
