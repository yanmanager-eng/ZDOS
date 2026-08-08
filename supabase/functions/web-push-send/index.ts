/**
 * ZDOS Edge Function｜Web Push Sender
 * - VAPID private key ONLY from Deno.env (never frontend)
 * - Queries push_subscriptions with service role
 * - Disables Gone / expired endpoints
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type PushItem = {
  user_id?: string | null
  employee_no?: string | null
  title?: string
  body?: string
  type?: string
  target_view?: string
  target_id?: string
  event_key?: string | null
  url?: string
  store_code?: string | null
}

type RequestBody = {
  mode?: string
  context?: string
  items?: PushItem[]
  user_ids?: string[]
  store_code?: string | null
  audience?: string | null
  title?: string
  body?: string
  type?: string
  target_view?: string
  target_id?: string
  url?: string
}

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeStore(code: unknown): string | null {
  const c = String(code || '').trim().toUpperCase()
  if (!c || c === 'ALL' || c === '全体' || c === '全體') return null
  return c
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json(405, { ok: false, message: 'Method not allowed' })
  }

  const vapidPublic = String(
    Deno.env.get('WEB_PUSH_VAPID_PUBLIC_KEY') || Deno.env.get('VAPID_PUBLIC_KEY') || '',
  ).trim()
  const vapidPrivate = String(
    Deno.env.get('WEB_PUSH_VAPID_PRIVATE_KEY') || Deno.env.get('VAPID_PRIVATE_KEY') || '',
  ).trim()
  const vapidSubject = String(
    Deno.env.get('WEB_PUSH_VAPID_SUBJECT') || Deno.env.get('VAPID_SUBJECT') || 'mailto:ops@zdos.local',
  ).trim()
  const supabaseUrl = String(Deno.env.get('SUPABASE_URL') || '').trim()
  const serviceRole = String(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '').trim()
  const anonKey = String(Deno.env.get('SUPABASE_ANON_KEY') || '').trim()

  if (!vapidPublic || !vapidPrivate) {
    return json(500, { ok: false, message: 'VAPID secrets not configured on Edge Function' })
  }
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

  const admin = createClient(supabaseUrl, serviceRole)
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)

  const context = String(body.context || '').trim()
  const items: PushItem[] = Array.isArray(body.items) && body.items.length
    ? body.items
    : [{
        user_id: null,
        title: body.title || 'ZDOS',
        body: body.body || '',
        type: body.type || 'system',
        target_view: body.target_view || 'notifications',
        target_id: body.target_id || '',
        url: body.url || '',
        store_code: body.store_code || null,
      }]

  // Resolve target user ids
  let targetUserIds = new Set<string>()
  for (const item of items) {
    if (item.user_id) targetUserIds.add(String(item.user_id))
  }
  if (Array.isArray(body.user_ids)) {
    body.user_ids.forEach((id) => {
      if (id) targetUserIds.add(String(id))
    })
  }

  const audience = String(body.audience || '').trim().toLowerCase()
  const storeCode = normalizeStore(body.store_code || body.audience)

  if (!targetUserIds.size) {
    if (audience === 'all' || (!storeCode && (body.mode === 'by_audience' || audience))) {
      const { data: profiles, error } = await admin
        .from('profiles')
        .select('id')
        .eq('is_active', true)
      if (error) return json(500, { ok: false, message: error.message })
      ;(profiles || []).forEach((p: { id: string }) => targetUserIds.add(p.id))
    } else if (storeCode) {
      const { data: storeRow, error: storeErr } = await admin
        .from('stores')
        .select('id')
        .eq('code', storeCode)
        .maybeSingle()
      if (storeErr) return json(500, { ok: false, message: storeErr.message })
      if (!storeRow?.id) return json(400, { ok: false, message: `Unknown store ${storeCode}` })
      const { data: memberships, error: memErr } = await admin
        .from('user_store_memberships')
        .select('user_id')
        .eq('store_id', storeRow.id)
        .eq('is_active', true)
      if (memErr) return json(500, { ok: false, message: memErr.message })
      ;(memberships || []).forEach((m: { user_id: string }) => targetUserIds.add(m.user_id))
    }
  }

  // Resolve employee_no → user_id for items missing user_id
  const missingEmp = items
    .filter((i) => !i.user_id && i.employee_no)
    .map((i) => String(i.employee_no))
  if (missingEmp.length) {
    const { data: empProfiles } = await admin
      .from('profiles')
      .select('id, employee_no')
      .in('employee_no', missingEmp)
    const byEmp = new Map((empProfiles || []).map((p: { id: string; employee_no: string }) => [p.employee_no, p.id]))
    for (const item of items) {
      if (!item.user_id && item.employee_no) {
        const uid = byEmp.get(String(item.employee_no))
        if (uid) {
          item.user_id = uid
          targetUserIds.add(uid)
        }
      }
    }
  }

  if (!targetUserIds.size) {
    return json(200, { ok: true, sent: 0, failed: 0, message: 'No target users' })
  }

  const userIdList = [...targetUserIds]
  const { data: subs, error: subErr } = await admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth, enabled')
    .in('user_id', userIdList)
    .eq('enabled', true)

  if (subErr) {
    return json(500, { ok: false, message: subErr.message })
  }

  const subscriptions = Array.isArray(subs) ? subs : []
  if (!subscriptions.length) {
    return json(200, { ok: true, sent: 0, failed: 0, message: 'No enabled subscriptions' })
  }

  // Prefer per-user item payload when available
  const itemByUser = new Map<string, PushItem>()
  for (const item of items) {
    if (item.user_id) itemByUser.set(String(item.user_id), item)
  }
  const fallback = items[0] || {}

  let sent = 0
  let failed = 0
  const results: Array<Record<string, unknown>> = []

  for (const sub of subscriptions) {
    const item = itemByUser.get(String(sub.user_id)) || fallback
    const title = String(item.title || body.title || 'ZDOS').trim() || 'ZDOS'
    const message = String(item.body || body.body || '').trim() || '您有一則新訊息'
    const view = String(item.target_view || body.target_view || 'notifications')
    const id = String(item.target_id || body.target_id || '')
    const type = String(item.type || body.type || 'system')
    const url = String(item.url || body.url || '')

    const payload = {
      title,
      body: message,
      tag: item.event_key || `zdos-${sub.id}`,
      data: {
        type,
        view,
        target_view: view,
        id,
        target_id: id,
        url,
        event_key: item.event_key || null,
      },
      url,
    }

    try {
      const res = await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 12 },
      )
      sent += 1
      results.push({ subscription_id: sub.id, ok: true, statusCode: res?.statusCode || 201 })
      await admin.from('push_delivery_logs').insert({
        subscription_id: sub.id,
        user_id: sub.user_id,
        context,
        title,
        success: true,
        status_code: res?.statusCode || 201,
        error_message: null,
      })
    } catch (err: unknown) {
      failed += 1
      const statusCode = Number((err as { statusCode?: number })?.statusCode || 0) || null
      const errMsg = String((err as { message?: string })?.message || err || 'push failed')
      results.push({ subscription_id: sub.id, ok: false, statusCode, error: errMsg })

      if (statusCode === 404 || statusCode === 410) {
        await admin
          .from('push_subscriptions')
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq('id', sub.id)
      }

      await admin.from('push_delivery_logs').insert({
        subscription_id: sub.id,
        user_id: sub.user_id,
        context,
        title,
        success: false,
        status_code: statusCode,
        error_message: errMsg.slice(0, 500),
      })
    }
  }

  return json(200, {
    ok: true,
    sent,
    failed,
    targets: userIdList.length,
    subscriptions: subscriptions.length,
    context,
    results: results.slice(0, 50),
  })
})
