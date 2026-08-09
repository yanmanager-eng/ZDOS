/* ZDOS PWA Service Worker｜Web Push + notificationclick deep link */
/* eslint-disable no-restricted-globals */

const SW_VERSION = 'zdos-sw-20260810-sales-report-perm-002b';
const PRODUCTION_ORIGIN = 'https://zdos.app';

function resolveSwOrigin() {
  try {
    const host = String((self.location && self.location.hostname) || '').toLowerCase();
    if (host === 'zdos.app' || host === 'www.zdos.app') return PRODUCTION_ORIGIN;
    const origin = String((self.location && self.location.origin) || '').replace(/\/$/, '');
    if (/^https?:\/\//i.test(origin)) return origin;
  } catch (_) { /* ignore */ }
  return PRODUCTION_ORIGIN;
}

function isAllowedAppOrigin(origin) {
  const o = String(origin || '').replace(/\/$/, '');
  if (!o) return false;
  if (o === PRODUCTION_ORIGIN || o === 'https://www.zdos.app') return true;
  return o === resolveSwOrigin();
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(Promise.resolve());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function buildDeepLinkUrl(data) {
  const payload = data && typeof data === 'object' ? data : {};
  const view = String(payload.view || payload.target_view || '').trim();
  const id = String(payload.id || payload.target_id || '').trim();
  const type = String(payload.type || '').trim();
  const url = new URL(`${resolveSwOrigin()}/`);
  url.searchParams.set('zdos_push', '1');
  if (view) url.searchParams.set('view', view);
  if (id) url.searchParams.set('id', id);
  if (type) url.searchParams.set('type', type);
  return url.href;
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    if (event.data) {
      const text = event.data.text();
      try {
        payload = JSON.parse(text);
      } catch (_) {
        payload = { title: 'ZDOS', body: text };
      }
    }
  } catch (_) {
    payload = {};
  }

  const title = String(payload.title || 'ZDOS').trim() || 'ZDOS';
  const body = String(payload.body || payload.message || '').trim() || '您有一則新訊息';
  const data = payload.data && typeof payload.data === 'object' ? payload.data : payload;
  const appOrigin = resolveSwOrigin();
  let deepUrl = String(payload.url || data.url || '').trim() || buildDeepLinkUrl(data);
  try {
    const u = new URL(deepUrl, appOrigin);
    deepUrl = isAllowedAppOrigin(u.origin) ? u.href : buildDeepLinkUrl(data);
  } catch (_) {
    deepUrl = buildDeepLinkUrl(data);
  }

  const options = {
    body,
    icon: `${appOrigin}/ui/assets/brand/icons/icon-192.png`,
    badge: `${appOrigin}/ui/assets/brand/icons/icon-192.png`,
    data: {
      ...data,
      url: deepUrl,
      view: data.view || data.target_view || '',
      id: data.id || data.target_id || '',
      type: data.type || ''
    },
    tag: String(payload.tag || data.event_key || `zdos-${Date.now()}`),
    renotify: true,
    requireInteraction: false
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const appOrigin = resolveSwOrigin();
  let targetUrl = String(data.url || '').trim() || buildDeepLinkUrl(data);
  try {
    const u = new URL(targetUrl, appOrigin);
    targetUrl = isAllowedAppOrigin(u.origin) ? u.href : buildDeepLinkUrl(data);
  } catch (_) {
    targetUrl = buildDeepLinkUrl(data);
  }

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      try {
        const clientUrl = new URL(client.url);
        if (isAllowedAppOrigin(clientUrl.origin)) {
          client.postMessage({
            type: 'ZDOS_PUSH_NAV',
            view: data.view || data.target_view || '',
            id: data.id || data.target_id || '',
            target_view: data.view || data.target_view || '',
            target_id: data.id || data.target_id || '',
            notifyType: data.type || '',
            url: targetUrl
          });
          if ('focus' in client) await client.focus();
          return;
        }
      } catch (_) { /* continue */ }
    }
    if (self.clients.openWindow) {
      await self.clients.openWindow(targetUrl);
    }
  })());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data && data.type === 'ZDOS_SW_PING') {
    event.source?.postMessage({ type: 'ZDOS_SW_PONG', version: SW_VERSION, origin: resolveSwOrigin() });
  }
});
