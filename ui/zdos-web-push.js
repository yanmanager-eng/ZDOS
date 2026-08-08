/**
 * ZDOS Web Push client (PWA)
 * BUG-0014d｜Cloud Save Trace — step-by-step diagnosis for enable → Supabase write
 */
(function (global) {
  'use strict';

  const FUNCTION_NAME = 'web-push-send';
  const META_VAPID = 'zdos-vapid-public-key';
  const PRODUCTION_ORIGIN = 'https://zdos.app';

  function resolveAppOrigin() {
    try {
      const host = String((global.location && location.hostname) || '').toLowerCase();
      if (host === 'zdos.app' || host === 'www.zdos.app') return PRODUCTION_ORIGIN;
      const origin = String((global.location && location.origin) || '').trim();
      if (/^https?:\/\//i.test(origin)) return origin.replace(/\/$/, '');
    } catch (_) { /* ignore */ }
    return PRODUCTION_ORIGIN;
  }

  let deps = {
    getClient: null,
    getSessionContext: null,
    onStatusChange: null
  };

  function safeErrMessage(err) {
    if (!err) return '';
    if (typeof err === 'string') return err.slice(0, 180);
    const msg = String(err.message || err.error_description || err.code || err).slice(0, 180);
    return msg
      .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
      .replace(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[JWT]');
  }

  function trace(step, code, message, extra) {
    const payload = {
      step: step,
      code: code || '',
      message: String(message || '').slice(0, 180)
    };
    if (extra && typeof extra === 'object') {
      if (extra.permission) payload.permission = extra.permission;
      if (extra.found != null) payload.found = !!extra.found;
      if (extra.hasUser != null) payload.hasUser = !!extra.hasUser;
    }
    console.info('[ZDOS WebPush Trace]', payload);
    return payload;
  }

  function fail(step, code, message, extra) {
    trace(step, code, message, extra);
    console.error('[ZDOS WebPush]', { step: step, code: code, message: message });
    return Object.assign(
      { ok: false, step: step, code: code || 'error', message: message || '推播失敗' },
      extra || {}
    );
  }

  function readVapidPublicKey() {
    const el = document.querySelector(`meta[name="${META_VAPID}"]`);
    return String(el?.getAttribute('content') || '').trim();
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
    return out;
  }

  function isValidVapidPublicKey(key) {
    if (!key || key.indexOf('TODO') === 0) return false;
    if (/private|BEGIN|SECRET/i.test(key)) return false;
    try {
      const bytes = urlBase64ToUint8Array(key);
      return bytes.length === 65 && bytes[0] === 0x04;
    } catch (_) {
      return false;
    }
  }

  function isIos() {
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function isStandaloneDisplay() {
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    } catch (_) { /* ignore */ }
    return !!(navigator.standalone);
  }

  function supportsWebPush() {
    return !!(
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  function isSecureContextOk() {
    try {
      if (global.isSecureContext) return true;
      const host = String((global.location && location.hostname) || '').toLowerCase();
      return host === 'localhost' || host === '127.0.0.1';
    } catch (_) {
      return false;
    }
  }

  async function waitForController(timeoutMs) {
    if (navigator.serviceWorker.controller) return true;
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        navigator.serviceWorker.removeEventListener('controllerchange', onChange);
        resolve(ok);
      };
      const onChange = () => finish(true);
      navigator.serviceWorker.addEventListener('controllerchange', onChange);
      setTimeout(() => finish(!!navigator.serviceWorker.controller), timeoutMs || 4000);
    });
  }

  async function ensureServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return fail('service_worker', 'service_worker_fail', 'Service Worker 尚未就緒');
    }
    if (!isSecureContextOk()) {
      return fail('service_worker', 'insecure_context', '推播需在 HTTPS RC 開啟（勿用區網 HTTP）');
    }

    let reg = null;
    try {
      reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    } catch (errRel) {
      const appOrigin = resolveAppOrigin();
      try {
        reg = await navigator.serviceWorker.register(appOrigin + '/sw.js', { scope: appOrigin + '/' });
      } catch (errAbs) {
        return fail(
          'service_worker',
          'service_worker_fail',
          'Service Worker 尚未就緒',
          { detail: safeErrMessage(errAbs || errRel) }
        );
      }
    }

    try {
      if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } catch (_) { /* ignore */ }

    let ready = null;
    try {
      ready = await navigator.serviceWorker.ready;
    } catch (err) {
      return fail('service_worker', 'service_worker_fail', 'Service Worker 尚未就緒', {
        detail: safeErrMessage(err)
      });
    }
    if (!ready) {
      return fail('service_worker', 'service_worker_fail', 'Service Worker 尚未就緒');
    }

    const controlled = await waitForController(5000);
    trace('service_worker', 'ok', 'serviceWorker.ready', {
      found: !!controlled,
      hasUser: !!ready.active
    });

    return { ok: true, step: 'service_worker', registration: ready, controlled: !!controlled };
  }

  function permissionState() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }

  async function getExistingSubscription() {
    try {
      const ready = await navigator.serviceWorker.ready;
      if (!ready || !ready.pushManager) return null;
      return await ready.pushManager.getSubscription();
    } catch (_) {
      return null;
    }
  }

  function subscriptionKeysOk(subscription) {
    try {
      const json = subscription.toJSON();
      const endpoint = String(json.endpoint || '').trim();
      const p256dh = String((json.keys && json.keys.p256dh) || '').trim();
      const auth = String((json.keys && json.keys.auth) || '').trim();
      return !!(endpoint && p256dh && auth);
    } catch (_) {
      return false;
    }
  }

  async function resolveCloudUserId(client) {
    if (!client || !client.auth || !client.auth.getUser) return '';
    try {
      const { data, error } = await client.auth.getUser();
      if (error || !data || !data.user || !data.user.id) return '';
      return String(data.user.id).trim();
    } catch (_) {
      return '';
    }
  }

  async function isCloudSubscriptionSaved(subscription) {
    const client = typeof deps.getClient === 'function' ? deps.getClient() : null;
    if (!client) return false;
    let endpoint = '';
    try {
      endpoint = String((subscription.toJSON() || {}).endpoint || '').trim();
    } catch (_) {
      return false;
    }
    if (!endpoint) return false;
    const { data, error } = await client
      .from('push_subscriptions')
      .select('id, enabled')
      .eq('endpoint', endpoint)
      .eq('enabled', true)
      .maybeSingle();
    if (error) return false;
    return !!(data && data.id);
  }

  async function getStatus() {
    const perm = permissionState();
    if (!supportsWebPush()) {
      return {
        code: 'unsupported',
        label: '不支援',
        permission: perm,
        standalone: isStandaloneDisplay(),
        ios: isIos(),
        subscribed: false,
        cloudSaved: false
      };
    }
    if (isIos() && !isStandaloneDisplay()) {
      return {
        code: 'need_homescreen',
        label: '需加入主畫面',
        permission: perm,
        standalone: false,
        ios: true,
        subscribed: false,
        cloudSaved: false,
        tip: '請用 Safari 打開目前 HTTPS RC → 分享 → 加入主畫面，再從主畫面圖示開啟後訂閱推播。'
      };
    }
    if (perm === 'denied') {
      return {
        code: 'denied',
        label: '系統拒絕',
        permission: perm,
        standalone: isStandaloneDisplay(),
        ios: isIos(),
        subscribed: false,
        cloudSaved: false,
        tip: '通知權限未允許。請到 iPhone「設定 → 通知」允許 ZDOS 後再試。'
      };
    }
    const sub = await getExistingSubscription();
    if (perm === 'granted' && sub) {
      let cloudSaved = false;
      try {
        cloudSaved = await isCloudSubscriptionSaved(sub);
      } catch (_) {
        cloudSaved = false;
      }
      return {
        code: cloudSaved ? 'enabled' : 'cloud_pending',
        label: cloudSaved ? '已開啟' : '需重新開啟',
        permission: perm,
        standalone: isStandaloneDisplay(),
        ios: isIos(),
        subscribed: true,
        cloudSaved: cloudSaved,
        tip: cloudSaved ? '' : '本機已允許通知，但尚未同步到伺服器。請再點「開啟推播通知」。'
      };
    }
    return {
      code: 'disabled',
      label: '未開啟',
      permission: perm,
      standalone: isStandaloneDisplay(),
      ios: isIos(),
      subscribed: !!sub,
      cloudSaved: false
    };
  }

  async function saveSubscription(subscription) {
    const client = typeof deps.getClient === 'function' ? deps.getClient() : null;
    if (!client) {
      return fail('cloud_user', 'auth_session_missing', '推播需要雲端登入');
    }

    const authUserId = await resolveCloudUserId(client);
    trace('cloud_user', authUserId ? 'ok' : 'fail', 'auth.getUser()', { hasUser: !!authUserId });
    if (!authUserId) {
      return fail('cloud_user', 'auth_session_missing', '推播需要雲端登入', { hasUser: false });
    }

    const ctx = typeof deps.getSessionContext === 'function' ? deps.getSessionContext() : {};
    const userId = authUserId;

    let json;
    try {
      json = subscription.toJSON();
    } catch (err) {
      return fail('subscribe', 'subscribe_fail', 'iPhone 無法建立 Push Subscription', {
        detail: safeErrMessage(err)
      });
    }
    const endpoint = String(json.endpoint || '').trim();
    const p256dh = String((json.keys && json.keys.p256dh) || '').trim();
    const auth = String((json.keys && json.keys.auth) || '').trim();
    if (!endpoint || !p256dh || !auth) {
      return fail('subscribe', 'subscribe_fail', 'iPhone 無法建立 Push Subscription');
    }

    const row = {
      user_id: userId,
      employee_id: String(ctx.employeeId || '').trim() || null,
      store_id: String(ctx.storeId || '').trim() || null,
      endpoint: endpoint,
      p256dh: p256dh,
      auth: auth,
      enabled: true,
      user_agent: String(navigator.userAgent || '').slice(0, 400),
      updated_at: new Date().toISOString()
    };

    trace('db_save', 'start', 'upsert push_subscriptions');
    const up = await client.from('push_subscriptions').upsert(row, { onConflict: 'endpoint' });
    if (up.error) {
      console.warn('[ZDOS WebPush Trace]', {
        step: 'db_save',
        code: up.error.code || 'upsert_fail',
        message: safeErrMessage(up.error)
      });
      const ins = await client.from('push_subscriptions').insert(row);
      if (ins.error) {
        const upd = await client
          .from('push_subscriptions')
          .update({
            user_id: row.user_id,
            employee_id: row.employee_id,
            store_id: row.store_id,
            p256dh: row.p256dh,
            auth: row.auth,
            enabled: true,
            user_agent: row.user_agent,
            updated_at: row.updated_at
          })
          .eq('endpoint', endpoint);
        if (upd.error) {
          return fail(
            'db_save',
            'database_insert_fail',
            '推播訂閱寫入伺服器失敗',
            { detail: safeErrMessage(upd.error || ins.error || up.error) }
          );
        }
      }
    }
    trace('db_save', 'ok', 'push_subscriptions write attempted');

    trace('read_back', 'start', 'select enabled subscription');
    const { data: verified, error: verErr } = await client
      .from('push_subscriptions')
      .select('id, enabled, user_id')
      .eq('endpoint', endpoint)
      .eq('enabled', true)
      .maybeSingle();

    if (verErr) {
      return fail('read_back', 'database_verify_fail', '推播訂閱驗證失敗', {
        detail: safeErrMessage(verErr)
      });
    }
    if (!verified || !verified.id) {
      return fail('read_back', 'database_verify_fail', '推播訂閱驗證失敗');
    }
    if (String(verified.user_id || '') !== userId) {
      return fail('read_back', 'database_verify_fail', '推播訂閱驗證失敗');
    }
    trace('read_back', 'ok', 'enabled subscription verified');
    return { ok: true, step: 'read_back', code: 'database_ok', id: verified.id };
  }

  async function disableLocalEndpointOnLogout() {
    try {
      const sub = await getExistingSubscription();
      if (!sub) return { ok: true, skipped: true };
      const client = typeof deps.getClient === 'function' ? deps.getClient() : null;
      if (client) {
        await client
          .from('push_subscriptions')
          .update({ enabled: false, updated_at: new Date().toISOString() })
          .eq('endpoint', sub.endpoint);
      }
      await sub.unsubscribe();
      return { ok: true };
    } catch (err) {
      return fail('logout', 'logout_cleanup_fail', safeErrMessage(err) || '登出清理失敗');
    }
  }

  async function enable() {
    try {
      if (!supportsWebPush()) {
        return fail('permission', 'unsupported', '此裝置／瀏覽器不支援 Web Push');
      }
      if (!isSecureContextOk()) {
        return fail('service_worker', 'insecure_context', '推播需在 HTTPS RC 開啟（勿用區網 HTTP）');
      }
      if (isIos() && !isStandaloneDisplay()) {
        return fail(
          'service_worker',
          'need_homescreen',
          '請用 Safari 打開目前 HTTPS RC → 分享 → 加入主畫面，再從主畫面圖示開啟後訂閱推播。'
        );
      }

      // 5) Cloud user first（避免後面白做）
      const client = typeof deps.getClient === 'function' ? deps.getClient() : null;
      const authUserId = await resolveCloudUserId(client);
      trace('cloud_user', authUserId ? 'ok' : 'fail', 'auth.getUser()', { hasUser: !!authUserId });
      if (!authUserId) {
        return fail('cloud_user', 'auth_session_missing', '推播需要雲端登入', { hasUser: false });
      }

      const vapid = readVapidPublicKey();
      if (!isValidVapidPublicKey(vapid)) {
        return fail('subscribe', 'vapid_invalid', 'iPhone 無法建立 Push Subscription');
      }

      // 2) Service Worker
      const sw = await ensureServiceWorker();
      if (!sw.ok) {
        return Object.assign(sw, {
          message: sw.message || 'Service Worker 尚未就緒',
          step: 'service_worker'
        });
      }

      const ready = sw.registration || (await navigator.serviceWorker.ready);
      if (!ready || !ready.pushManager) {
        return fail('service_worker', 'service_worker_fail', 'Service Worker 尚未就緒');
      }

      // 1) Permission
      let permission = permissionState();
      trace('permission', 'check', 'Notification.permission', { permission: permission });
      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
      }
      trace('permission', permission === 'granted' ? 'ok' : 'fail', 'Notification.permission', {
        permission: permission
      });
      if (permission !== 'granted') {
        return fail('permission', 'permission_fail', '通知權限未允許', { permission: permission });
      }

      // 3) getSubscription
      let subscription = null;
      try {
        subscription = await ready.pushManager.getSubscription();
      } catch (err) {
        return fail('get_subscription', 'subscribe_fail', 'iPhone 無法建立 Push Subscription', {
          detail: safeErrMessage(err)
        });
      }
      trace('get_subscription', subscription ? 'ok' : 'null', 'pushManager.getSubscription()', {
        found: !!subscription
      });

      // 4) subscribe if needed
      if (!subscription) {
        try {
          subscription = await ready.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapid)
          });
          trace('subscribe', 'ok', 'pushManager.subscribe() SUCCESS');
        } catch (subErr) {
          return fail(
            'subscribe',
            'subscribe_fail',
            'iPhone 無法建立 Push Subscription',
            { detail: safeErrMessage(subErr) }
          );
        }
      } else {
        trace('subscribe', 'skip', 'reuse existing subscription');
      }

      if (!subscription || !subscriptionKeysOk(subscription)) {
        return fail('subscribe', 'subscribe_fail', 'iPhone 無法建立 Push Subscription');
      }

      // 6-7) DB save + read-back
      let saved = await saveSubscription(subscription);
      if (!saved.ok) {
        try { await subscription.unsubscribe(); } catch (_) { /* ignore */ }
        try {
          subscription = await ready.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapid)
          });
          trace('subscribe', 'retry_ok', 'resubscribe after db fail');
        } catch (subErr2) {
          return fail(
            saved.step || 'db_save',
            saved.code || 'database_insert_fail',
            saved.message || '推播訂閱寫入伺服器失敗',
            { detail: safeErrMessage(subErr2) }
          );
        }
        saved = await saveSubscription(subscription);
        if (!saved.ok) return saved;
      }

      const status = await getStatus();
      if (typeof deps.onStatusChange === 'function') deps.onStatusChange(status);
      if (!status.cloudSaved) {
        return fail('read_back', 'database_verify_fail', '推播訂閱驗證失敗');
      }

      trace('done', 'ok', 'enable complete');
      return {
        ok: true,
        step: 'done',
        code: 'ok',
        permission: 'granted',
        subscribed: true,
        cloudSaved: true,
        status: status,
        message: '推播通知已開啟（已同步伺服器）'
      };
    } catch (err) {
      return fail('unknown', 'unexpected', safeErrMessage(err) || '開啟推播失敗');
    }
  }

  async function dispatch(items, context) {
    const client = typeof deps.getClient === 'function' ? deps.getClient() : null;
    if (!client) return fail('cloud_user', 'auth_session_missing', '推播需要雲端登入');
    const list = (Array.isArray(items) ? items : [items]).filter(Boolean);
    if (!list.length) return fail('dispatch', 'empty_items', '無推播項目');

    const body = {
      mode: 'by_items',
      context: String(context || ''),
      items: list.map((item) => {
        const view = item.target_view || item.targetView || item.view || '';
        const id = item.target_id || item.targetId || item.id || '';
        const type = item.type || '';
        const url = new URL(resolveAppOrigin() + '/');
        url.searchParams.set('zdos_push', '1');
        if (view) url.searchParams.set('view', view);
        if (id) url.searchParams.set('id', id);
        if (type) url.searchParams.set('type', type);
        return {
          user_id: item.user_id || item.userId || null,
          employee_no: item.employee_no || item.employeeNo || null,
          title: item.title || 'ZDOS',
          body: item.message || item.body || '',
          type: type,
          target_view: view,
          target_id: id,
          event_key: item.event_key || item.eventKey || null,
          url: url.href,
          store_code: item.store_code || item.storeCode || null
        };
      })
    };

    try {
      const { data, error } = await client.functions.invoke(FUNCTION_NAME, { body: body });
      if (error) return fail('dispatch', 'dispatch_fail', safeErrMessage(error) || 'Web Push 發送失敗');
      if (data && data.ok === false) return Object.assign({ ok: false, step: 'dispatch', code: 'dispatch_rejected' }, data);
      return data || { ok: true };
    } catch (err) {
      return fail('dispatch', 'dispatch_fail', safeErrMessage(err) || 'Web Push 發送失敗');
    }
  }

  function init(options) {
    deps = Object.assign({}, deps, options || {});
    return ensureServiceWorker().catch((err) => {
      console.warn('[ZDOS WebPush] SW register skipped', safeErrMessage(err));
      return { ok: false, step: 'service_worker', code: 'service_worker_fail' };
    });
  }

  global.ZdosWebPush = {
    init: init,
    enable: enable,
    getStatus: getStatus,
    ensureServiceWorker: ensureServiceWorker,
    dispatch: dispatch,
    disableLocalEndpointOnLogout: disableLocalEndpointOnLogout,
    isIos: isIos,
    isStandaloneDisplay: isStandaloneDisplay,
    supportsWebPush: supportsWebPush,
    permissionState: permissionState,
    FUNCTION_NAME: FUNCTION_NAME
  };
})(typeof window !== 'undefined' ? window : globalThis);
