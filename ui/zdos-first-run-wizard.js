/**
 * ZDOS v1.5.0｜First Run Wizard（PWA 首次啟動引導）
 * 僅串接既有：standalone 安裝提示 + 開啟推播（ZdosWebPush）
 * 不得自動索取通知權限；完成／稍後皆可關閉。
 */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'zdos_frw_done_v150';
  const MODAL_ID = 'zdos-first-run-wizard';
  let step = 0;
  let deferredInstallPrompt = null;
  let boundInstallCapture = false;

  function safeGet(key) {
    try { return localStorage.getItem(key) || ''; } catch (_) { return ''; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, String(val)); } catch (_) { /* ignore */ }
  }

  function isDone() {
    return safeGet(STORAGE_KEY) === '1';
  }

  function markDone() {
    safeSet(STORAGE_KEY, '1');
  }

  function isIos() {
    const ua = navigator.userAgent || '';
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function isStandalone() {
    try {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    } catch (_) { /* ignore */ }
    return !!navigator.standalone;
  }

  function ensureInstallCapture() {
    if (boundInstallCapture) return;
    boundInstallCapture = true;
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      const root = document.getElementById(MODAL_ID);
      if (root && step === 1) render();
    });
  }

  function removeModal() {
    const el = document.getElementById(MODAL_ID);
    if (el) el.remove();
  }

  async function promptInstall() {
    if (!deferredInstallPrompt) {
      return { ok: false, message: isIos()
        ? '請使用 Safari「分享 → 加入主畫面」。'
        : '請使用瀏覽器選單「安裝應用程式／加入主畫面」。' };
    }
    try {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      return { ok: choice?.outcome === 'accepted', outcome: choice?.outcome };
    } catch (err) {
      return { ok: false, message: err?.message || '安裝提示失敗' };
    }
  }

  function stepMeta() {
    return [
      {
        title: '歡迎使用 ZDOS',
        desc: '可將 ZDOS 加入主畫面，像 App 一樣獨立使用，並在關閉後仍接收重要公告與通知。'
      },
      {
        title: '加入主畫面',
        desc: isStandalone()
          ? '已從主畫面／獨立視窗開啟，可繼續設定推播。'
          : (isIos()
            ? 'iPhone：請用 Safari 開啟 → 點分享 →「加入主畫面」，再從主畫面開啟 ZDOS。'
            : 'Android：可安裝 App 或加入主畫面。完成後建議從主畫面開啟。')
      },
      {
        title: '開啟推播通知',
        desc: '需由你主動開啟。不會在進入 App 時自動要求權限。'
      },
      {
        title: '設定完成',
        desc: '之後可在「我的 → 推播通知」再次調整。祝工作順利。'
      }
    ];
  }

  function render() {
    ensureInstallCapture();
    const steps = stepMeta();
    const meta = steps[step] || steps[0];
    let existing = document.getElementById(MODAL_ID);
    if (!existing) {
      existing = document.createElement('div');
      existing.id = MODAL_ID;
      document.body.appendChild(existing);
    }

    const dots = steps.map((_, i) =>
      `<span style="width:8px;height:8px;border-radius:999px;display:inline-block;background:${i === step ? '#22d3ee' : 'rgba(148,163,184,.35)'}"></span>`
    ).join('');

    let actions = '';
    if (step === 0) {
      actions = `
        <button type="button" data-frw="next" class="zdos-frw-btn zdos-frw-btn--primary">開始設定</button>
        <button type="button" data-frw="skip" class="zdos-frw-btn zdos-frw-btn--ghost">稍後再說</button>`;
    } else if (step === 1) {
      const installBtn = (!isStandalone() && deferredInstallPrompt)
        ? `<button type="button" data-frw="install" class="zdos-frw-btn zdos-frw-btn--primary">安裝／加入主畫面</button>`
        : '';
      actions = `
        ${installBtn}
        <button type="button" data-frw="next" class="zdos-frw-btn zdos-frw-btn--primary">${isStandalone() ? '下一步' : '我已加入／繼續'}</button>
        <button type="button" data-frw="skip" class="zdos-frw-btn zdos-frw-btn--ghost">稍後再說</button>`;
    } else if (step === 2) {
      actions = `
        <button type="button" data-frw="push" class="zdos-frw-btn zdos-frw-btn--primary">開啟推播通知</button>
        <button type="button" data-frw="next" class="zdos-frw-btn zdos-frw-btn--ghost">略過，稍後在「我的」開啟</button>`;
    } else {
      actions = `<button type="button" data-frw="done" class="zdos-frw-btn zdos-frw-btn--primary">開始使用 ZDOS</button>`;
    }

    const iosNote = (step === 1 && isIos() && !isStandalone())
      ? `<p class="zdos-frw-tip">請先將 ZDOS 加入主畫面，再開啟推播通知。</p>`
      : '';

    existing.innerHTML = `
      <div class="zdos-frw-backdrop" role="dialog" aria-modal="true" aria-labelledby="zdos-frw-title">
        <div class="zdos-frw-panel">
          <p class="zdos-frw-kicker">ZDOS v1.5.0 · First Run</p>
          <h2 id="zdos-frw-title" class="zdos-frw-title">${meta.title}</h2>
          <p class="zdos-frw-desc">${meta.desc}</p>
          ${iosNote}
          <div class="zdos-frw-dots" aria-hidden="true">${dots}</div>
          <div class="zdos-frw-actions">${actions}</div>
        </div>
      </div>`;

    existing.querySelector('[data-frw="next"]')?.addEventListener('click', () => {
      step = Math.min(step + 1, steps.length - 1);
      render();
    });
    existing.querySelector('[data-frw="skip"]')?.addEventListener('click', () => {
      markDone();
      removeModal();
    });
    existing.querySelector('[data-frw="done"]')?.addEventListener('click', () => {
      markDone();
      removeModal();
    });
    existing.querySelector('[data-frw="install"]')?.addEventListener('click', async () => {
      const result = await promptInstall();
      if (result.ok) {
        if (typeof global.showToast === 'function') global.showToast('已觸發安裝', 'success');
      } else if (result.message && typeof global.showToast === 'function') {
        global.showToast(result.message, 'info');
      }
      render();
    });
    existing.querySelector('[data-frw="push"]')?.addEventListener('click', async () => {
      if (typeof global.enableZdosWebPush === 'function') {
        await global.enableZdosWebPush();
      } else if (typeof global.ZdosWebPush?.enable === 'function') {
        const result = await global.ZdosWebPush.enable();
        if (typeof global.showToast === 'function') {
          global.showToast(result?.ok ? '推播通知已開啟' : (result?.message || '開啟推播失敗'), result?.ok ? 'success' : 'error');
        }
      }
      step = 3;
      render();
    });
  }

  function maybeShow() {
    ensureInstallCapture();
    if (isDone()) return false;
    if (document.getElementById(MODAL_ID)) return true;
    step = 0;
    render();
    return true;
  }

  function resetForDebug() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignore */ }
    step = 0;
    removeModal();
  }

  // Minimal styles once
  if (!document.getElementById('zdos-frw-style')) {
    const style = document.createElement('style');
    style.id = 'zdos-frw-style';
    style.textContent = `
      #${MODAL_ID}{position:fixed;inset:0;z-index:11050}
      .zdos-frw-backdrop{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(2,11,28,.88);backdrop-filter:blur(16px)}
      .zdos-frw-panel{width:100%;max-width:22rem;border-radius:1.5rem;border:1px solid rgba(255,255,255,.08);background:linear-gradient(180deg,rgba(15,23,42,.96),rgba(2,11,28,.96));padding:1.35rem 1.25rem 1.2rem;box-shadow:0 24px 60px rgba(0,0,0,.55);color:#e2e8f0;font-family:ui-sans-serif,system-ui,sans-serif}
      .zdos-frw-kicker{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#67e8f9;margin:0 0 .5rem}
      .zdos-frw-title{font-size:1.05rem;font-weight:800;color:#f8fafc;margin:0 0 .55rem;letter-spacing:.04em}
      .zdos-frw-desc{font-size:12px;line-height:1.55;color:#94a3b8;margin:0 0 .9rem}
      .zdos-frw-tip{font-size:11px;line-height:1.45;color:#fde68a;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);border-radius:.75rem;padding:.55rem .7rem;margin:0 0 .9rem}
      .zdos-frw-dots{display:flex;gap:6px;margin:0 0 1rem}
      .zdos-frw-actions{display:flex;flex-direction:column;gap:.5rem}
      .zdos-frw-btn{width:100%;border-radius:.85rem;padding:.85rem 1rem;font-size:12px;font-weight:700;letter-spacing:.06em;cursor:pointer;border:1px solid transparent}
      .zdos-frw-btn--primary{background:linear-gradient(180deg,rgba(34,211,238,.22),rgba(14,116,144,.28));border-color:rgba(34,211,238,.35);color:#ecfeff}
      .zdos-frw-btn--ghost{background:rgba(148,163,184,.08);border-color:rgba(148,163,184,.2);color:#cbd5e1}
    `;
    document.head.appendChild(style);
  }

  ensureInstallCapture();

  global.ZdosFirstRunWizard = {
    maybeShow,
    isDone,
    markDone,
    resetForDebug,
    STORAGE_KEY
  };
})(typeof window !== 'undefined' ? window : globalThis);
