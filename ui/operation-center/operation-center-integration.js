/**
 * UI-002 Phase 2 | Feature flag, data provider render, routing
 */
(function (global) {
    'use strict';

    var STORAGE_KEY = 'zdos_feature_operation_center_v1';
    var DEFAULT_ALLOWLIST = ['0001', '1'];

    function escapeHtml(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function normalizeEmpId(value) {
        var s = String(value || '').trim();
        if (!s) return '';
        if (/^\d+$/.test(s)) return s.padStart(4, '0');
        return s.toUpperCase();
    }

    function readMetaEnabled() {
        var meta = document.querySelector('meta[name="zdos-operation-center"]');
        if (!meta) return false;
        var v = String(meta.getAttribute('content') || '').trim().toLowerCase();
        return v === 'on' || v === 'true' || v === '1';
    }

    function readStoredConfig() {
        try {
            var raw = global.localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (_) {
            return null;
        }
    }

    function getOperationCenterFeatureConfig() {
        var stored = readStoredConfig();
        var enabled = false;
        var allowlist = DEFAULT_ALLOWLIST.slice();
        var dataMode = 'readonly';
        if (stored && typeof stored === 'object') {
            if (typeof stored.operationCenterEnabled === 'boolean') {
                enabled = stored.operationCenterEnabled;
            } else if (typeof stored.enabled === 'boolean') {
                enabled = stored.enabled;
            }
            if (Array.isArray(stored.allowlist)) {
                allowlist = stored.allowlist.map(function (id) { return normalizeEmpId(id); });
            }
            if (stored.operationCenterDataMode === 'mock') dataMode = 'mock';
            else if (stored.operationCenterDataMode === 'supabase') dataMode = 'supabase';
        }
        if (readMetaEnabled()) enabled = true;
        if (global.__zdosOcUrlPreview) enabled = true;
        return {
            operationCenterEnabled: enabled,
            allowlist: allowlist,
            operationCenterDataMode: dataMode
        };
    }

    function getOperationCenterDataMode() {
        return getOperationCenterFeatureConfig().operationCenterDataMode || 'readonly';
    }

    function operationCenterEnabled() {
        return getOperationCenterFeatureConfig().operationCenterEnabled;
    }

    function isOperationCenterAllowedForSession(employeeId) {
        if (!operationCenterEnabled()) return false;
        var cfg = getOperationCenterFeatureConfig();
        var emp = normalizeEmpId(employeeId);
        if (!emp) return false;
        if (!cfg.allowlist || !cfg.allowlist.length) return true;
        return cfg.allowlist.some(function (id) { return normalizeEmpId(id) === emp; });
    }

    function canUseOperationCenter(employeeId) {
        return isOperationCenterAllowedForSession(employeeId);
    }

    function resolveHomeViewAfterLogin(employeeId) {
        if (canUseOperationCenter(employeeId)) return 'operation-center';
        return 'dashboard';
    }

    function resolveRestoredView(savedView, employeeId) {
        var view = String(savedView || 'dashboard').trim();
        if (view === 'operation-center') {
            return canUseOperationCenter(employeeId) ? 'operation-center' : 'dashboard';
        }
        return view || 'dashboard';
    }

    function statusClass(level) {
        if (level === 'ok') return 'oc-status--ok';
        if (level === 'alert') return 'oc-status--alert';
        return 'oc-status--warn';
    }

    function adaptMockToView(mock) {
        return {
            operationStatus: mock.operationStatus || { level: 'ok', message: 'Mock' },
            copilotMessage: Object.assign({ empty: false }, mock.copilotMessage || {}),
            kpiCards: mock.kpiCards || [],
            focusItems: mock.focusItems || [],
            quickActions: mock.quickActions || [],
            timeline: mock.timeline || []
        };
    }

    function renderLoadingShell(root, options) {
        var userName = options && options.userName ? options.userName : '';
        root.innerHTML =
            '<div id="zdos-operation-center-root" class="oc-app">' +
            '<header class="oc-header" role="banner">' +
            '<div class="oc-header__brand"><div class="oc-header__logo">Z</div>' +
            '<div class="oc-header__titles"><div class="oc-header__product">ZDOS</div>' +
            '<div class="oc-header__page">Operation Center</div></div></div></header>' +
            '<main class="oc-main"><div class="oc-state-banner oc-state-banner--loading" role="status">載入營運資料…</div>' +
            '<p style="text-align:center;font-size:11px;color:var(--oc-color-text-tertiary);margin-top:12px;">' +
            escapeHtml(userName) + '</p></main></div>';
    }

    function bindOperationCenterInteractions(root) {
        root.querySelectorAll('[data-oc-quick]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var action = btn.getAttribute('data-oc-quick');
                if (action === 'scheduling' && typeof global.openSchedulingCenter === 'function') {
                    global.openSchedulingCenter();
                    if (typeof global.zdosAfterViewNav === 'function') global.zdosAfterViewNav();
                } else if (action === 'sales' && typeof global.openZDOSModule === 'function') {
                    global.openZDOSModule('sales');
                } else if (action === 'reports' && typeof global.openReportCenter === 'function') {
                    global.openReportCenter();
                } else if (typeof global.showToast === 'function') {
                    global.showToast('能力學院即將推出', 'info');
                }
            });
        });

        root.querySelectorAll('[data-oc-nav]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var nav = btn.getAttribute('data-oc-nav');
                if (nav === 'me' && typeof global.backToZDOSHome === 'function') {
                    global.backToZDOSHome();
                    return;
                }
                if (nav === 'notifications-tab' && typeof global.openAnnouncementCenter === 'function') {
                    global.openAnnouncementCenter();
                    if (typeof global.zdosAfterViewNav === 'function') global.zdosAfterViewNav();
                    return;
                }
                if (typeof global.showToast === 'function') {
                    global.showToast('Operation Center · ' + nav, 'info');
                }
            });
        });

        var copilotBtn = root.querySelector('[data-oc-copilot-action]');
        if (copilotBtn) {
            copilotBtn.addEventListener('click', function () {
                if (typeof global.openReviewCenter === 'function') {
                    global.openReviewCenter();
                } else if (typeof global.showToast === 'function') {
                    global.showToast('請由 Quick Actions 進入相關模組', 'info');
                }
            });
        }
    }

    function renderOperationCenterContent(root, options, data, meta) {
        var status = data.operationStatus || {};
        var copilot = data.copilotMessage || {};
        var userName = options && options.userName ? options.userName : '使用者';
        var storeLabel = options && options.storeLabel ? options.storeLabel : '';
        var footnote = meta && meta.mode === 'mock' ? 'Mock 資料' : 'Read Only · 本地 Registry';
        if (meta && meta.mode !== 'mock') {
            var sales = meta.salesSource;
            var notif = meta.notificationsSource;
            if (sales === 'supabase' && notif === 'supabase') {
                footnote = 'Read Only · 業績/通知 Supabase';
            } else if (sales === 'supabase') {
                footnote = notif === 'local_fallback'
                    ? 'Read Only · 業績 Supabase · 通知本地 fallback'
                    : 'Read Only · 業績 Supabase';
            } else if (notif === 'supabase') {
                footnote = sales === 'local_fallback'
                    ? 'Read Only · 通知 Supabase · 業績本地 fallback'
                    : 'Read Only · 通知 Supabase';
            } else if (sales === 'local_fallback' || notif === 'local_fallback') {
                footnote = 'Read Only · Supabase 部分本地 fallback';
            }
            if (meta.workforceSource === 'local_registry') {
                footnote += ' · 人力本地摘要';
            } else if (meta.workforceSource === 'none') {
                footnote += ' · 人力尚無摘要';
            }
        }

        var kpiHtml = (data.kpiCards || []).map(function (k) {
            var valueClass = k.empty ? ' oc-kpi-card__value--empty' : '';
            return (
                '<article class="oc-kpi-card">' +
                '<span class="oc-kpi-card__label">' + escapeHtml(k.label) + '</span>' +
                '<span class="oc-kpi-card__value' + valueClass + '">' + escapeHtml(k.value) + '</span>' +
                '<span class="oc-kpi-card__meta">' + escapeHtml(k.meta || '') + '</span>' +
                '</article>'
            );
        }).join('');

        var focusItems = data.focusItems || [];
        var focusHtml;
        if (!focusItems.length) {
            focusHtml = '<li class="oc-empty-state">尚無資料</li>';
        } else {
            focusHtml = focusItems.map(function (f, i) {
                return (
                    '<li class="oc-focus-item">' +
                    '<input type="checkbox" class="oc-focus-item__check" id="' + escapeHtml(f.id || 'focus-' + i) + '" ' +
                    'onchange="this.closest(\'.oc-focus-item\').classList.toggle(\'oc-focus-item--done\', this.checked)" ' +
                    'aria-label="標記完成：' + escapeHtml(f.text) + '">' +
                    '<label class="oc-focus-item__text" for="' + escapeHtml(f.id || 'focus-' + i) + '">' + escapeHtml(f.text) + '</label>' +
                    '<span class="oc-focus-item__tag">' + escapeHtml(f.tag || '') + '</span>' +
                    '</li>'
                );
            }).join('');
        }

        var quickHtml = (data.quickActions || []).map(function (q) {
            return (
                '<button type="button" class="oc-quick-action" data-oc-quick="' + escapeHtml(q.action) + '">' +
                '<span class="oc-quick-action__icon" aria-hidden="true">' + escapeHtml(q.icon) + '</span>' +
                escapeHtml(q.label) +
                '</button>'
            );
        }).join('');

        var timeline = data.timeline || [];
        var timelineHtml;
        if (!timeline.length) {
            timelineHtml = '<div class="oc-empty-state">尚無資料</div>';
        } else {
            timelineHtml = timeline.map(function (t) {
                return (
                    '<div class="oc-timeline__item">' +
                    '<time class="oc-timeline__time">' + escapeHtml(t.time) + '</time>' +
                    '<span class="oc-timeline__event">' + escapeHtml(t.event) + '</span>' +
                    '</div>'
                );
            }).join('');
        }

        var copilotClass = copilot.empty ? ' oc-ai-card--empty' : '';
        var copilotAction = copilot.actionLabel && !copilot.empty
            ? '<button type="button" class="oc-ai-card__action" data-oc-copilot-action="1">' + escapeHtml(copilot.actionLabel) + '</button>'
            : '';

        root.innerHTML =
            '<div id="zdos-operation-center-root" class="oc-app">' +
            '<header class="oc-header" role="banner">' +
            '<div class="oc-header__brand">' +
            '<div class="oc-header__logo" aria-hidden="true">Z</div>' +
            '<div class="oc-header__titles">' +
            '<div class="oc-header__product">ZDOS</div>' +
            '<div class="oc-header__page">Operation Center</div>' +
            '</div></div>' +
            '<div class="oc-header__actions">' +
            '<button type="button" class="oc-icon-btn" data-oc-nav="notifications" aria-label="通知"><span aria-hidden="true">🔔</span></button>' +
            '<button type="button" class="oc-icon-btn" data-oc-nav="profile" aria-label="個人"><span aria-hidden="true">👤</span></button>' +
            '</div></header>' +
            '<main class="oc-main">' +
            '<div class="oc-stack">' +
            '<div class="oc-status ' + statusClass(status.level) + '" role="status">' +
            '<span class="oc-status__dot" aria-hidden="true"></span><span>' + escapeHtml(status.message) + '</span></div>' +
            '<section class="oc-ai-card' + copilotClass + '">' +
            '<div class="oc-ai-card__label">' + escapeHtml(copilot.label || 'Operation Copilot') + '</div>' +
            '<h2 class="oc-ai-card__headline">' + escapeHtml(copilot.headline || '尚無資料') + '</h2>' +
            '<p class="oc-ai-card__body">' + escapeHtml(copilot.body || '') + '</p>' +
            copilotAction +
            '</section>' +
            '<section aria-labelledby="oc-kpi-heading">' +
            '<h2 class="oc-section-title" id="oc-kpi-heading">今日概況' +
            (storeLabel ? ' · ' + escapeHtml(storeLabel) : '') +
            '</h2><div class="oc-kpi-grid">' + kpiHtml + '</div></section>' +
            '<div class="oc-desktop-split">' +
            '<section aria-labelledby="oc-focus-heading">' +
            '<h2 class="oc-section-title" id="oc-focus-heading">Today\'s Focus</h2>' +
            '<ul class="oc-focus-list">' + focusHtml + '</ul></section>' +
            '<section aria-labelledby="oc-quick-heading">' +
            '<h2 class="oc-section-title" id="oc-quick-heading">Quick Actions</h2>' +
            '<div class="oc-quick-grid">' + quickHtml + '</div></section></div>' +
            '<section aria-labelledby="oc-timeline-heading">' +
            '<h2 class="oc-section-title" id="oc-timeline-heading">Operation Timeline</h2>' +
            '<div class="oc-timeline" role="log">' + timelineHtml + '</div></section>' +
            '<p class="text-center text-[11px] opacity-60" style="color:var(--oc-color-text-tertiary);font-family:var(--oc-font-family);">' +
            escapeHtml(userName) + ' · ' + escapeHtml(footnote) + '</p>' +
            '</div></main>' +
            '<nav class="oc-bottom-nav" aria-label="主要導覽">' +
            '<button type="button" class="oc-bottom-nav__item oc-bottom-nav__item--active" data-oc-nav="home"><span class="oc-bottom-nav__glyph">⌂</span>首頁</button>' +
            '<button type="button" class="oc-bottom-nav__item" data-oc-nav="work"><span class="oc-bottom-nav__glyph">☰</span>工作</button>' +
            '<button type="button" class="oc-bottom-nav__item" data-oc-nav="ai"><span class="oc-bottom-nav__glyph">✦</span>AI</button>' +
            '<button type="button" class="oc-bottom-nav__item" data-oc-nav="notifications-tab"><span class="oc-bottom-nav__glyph">🔔</span>通知</button>' +
            '<button type="button" class="oc-bottom-nav__item" data-oc-nav="me"><span class="oc-bottom-nav__glyph">◎</span>我的</button>' +
            '</nav></div>';

        bindOperationCenterInteractions(root);
    }

    function renderOperationCenterError(root, options, errorMessage) {
        var userName = options && options.userName ? options.userName : '';
        root.innerHTML =
            '<div id="zdos-operation-center-root" class="oc-app">' +
            '<main class="oc-main"><div class="oc-state-banner oc-state-banner--error" role="alert">' +
            '無法載入營運資料：' + escapeHtml(errorMessage || '未知錯誤') +
            '</div><p class="oc-empty-state">已保留經典首頁與既有模組，請稍後再試。</p>' +
            '<button type="button" class="oc-ai-card__action" style="display:block;margin:16px auto;" data-oc-nav="me">返回經典首頁</button>' +
            '<p style="text-align:center;font-size:11px;color:var(--oc-color-text-tertiary);">' + escapeHtml(userName) + '</p></main></div>';
        bindOperationCenterInteractions(root);
    }

    function renderOperationCenter(root, options) {
        options = options || {};
        renderLoadingShell(root, options);

        var mode = getOperationCenterDataMode();
        var fetchPromise;

        if (mode === 'mock') {
            fetchPromise = Promise.resolve({
                ok: true,
                data: adaptMockToView(global.operationCenterMockData || {}),
                source: 'mock'
            });
        } else if (global.ZDOSOperationCenterDataProvider) {
            var ctx = Object.assign({}, options.dataContext || {});
            if (mode === 'supabase') ctx.dataSource = 'supabase';
            else if (!ctx.dataSource) ctx.dataSource = 'local';
            fetchPromise = global.ZDOSOperationCenterDataProvider.fetchSnapshot(ctx);
        } else {
            fetchPromise = Promise.resolve({ ok: false, error: 'data_provider_missing', data: null });
        }

        fetchPromise.then(function (result) {
            if (!result || !result.ok || !result.data) {
                renderOperationCenterError(root, options, (result && result.error) || 'snapshot_failed');
                return;
            }
            renderOperationCenterContent(root, options, result.data, {
                mode: mode,
                source: result.source || mode,
                salesSource: result.salesSource || null,
                notificationsSource: result.notificationsSource || null,
                workforceSource: result.workforceSource || null
            });

            var ocSnapshotMeta = {
                mode: mode,
                source: result.source || mode,
                salesSource: result.salesSource || null,
                notificationsSource: result.notificationsSource || null,
                workforceSource: result.workforceSource || null
            };

            var postSnapshotDev = Promise.resolve();

            if (global.ZDOSOperationCenterAiShadowAdapter &&
                global.ZDOSOperationCenterAiShadowAdapter.isShadowPipelineEnabled()) {
                var shadowCtx = Object.assign({}, options.dataContext || {});
                postSnapshotDev = postSnapshotDev.then(function () {
                    return Promise.resolve(
                        global.ZDOSOperationCenterAiShadowAdapter.runShadowPipeline(
                            result.data,
                            shadowCtx,
                            ocSnapshotMeta
                        )
                    ).catch(function (shadowErr) {
                        console.error('[ZDOS AI Shadow]', shadowErr);
                        return null;
                    });
                });
            }

            if (global.ZDOSOperationCenterEmployeeAiDevHarness &&
                global.ZDOSOperationCenterEmployeeAiDevHarness.isEmployeeAiDevHarnessEnabled()) {
                var harnessCtx = Object.assign({}, options.dataContext || {});
                postSnapshotDev = postSnapshotDev.then(function () {
                    return Promise.resolve(
                        global.ZDOSOperationCenterEmployeeAiDevHarness.handleOperationCenterSnapshot(
                            result.data,
                            harnessCtx,
                            ocSnapshotMeta
                        )
                    ).catch(function (harnessErr) {
                        console.error('[ZDOS Employee AI Dev Harness]', harnessErr);
                        return null;
                    });
                });
            }

            postSnapshotDev.catch(function () { /* logged above */ });
        }).catch(function (err) {
            console.error('[ZDOS Operation Center]', err);
            renderOperationCenterError(root, options, err && err.message ? err.message : 'fetch_failed');
        });
    }

    function navigateToOperationCenter(state, persistView) {
        if (!state || !canUseOperationCenter(state.employeeId)) {
            if (typeof global.showToast === 'function') {
                global.showToast('Operation Center 未啟用或無權限（Feature Flag）', 'error');
            }
            return false;
        }
        state.currentView = 'operation-center';
        if (persistView !== false && typeof global.safeSetItem === 'function') {
            global.safeSetItem('zdos_current_view', 'operation-center');
        }
        return true;
    }

    try {
        var params = new URLSearchParams(global.location.search);
        if (params.get('oc') === '1') global.__zdosOcUrlPreview = true;
    } catch (_) { /* ignore */ }

    global.ZDOSOperationCenter = {
        STORAGE_KEY: STORAGE_KEY,
        getOperationCenterFeatureConfig: getOperationCenterFeatureConfig,
        getOperationCenterDataMode: getOperationCenterDataMode,
        operationCenterEnabled: operationCenterEnabled,
        canUseOperationCenter: canUseOperationCenter,
        resolveHomeViewAfterLogin: resolveHomeViewAfterLogin,
        resolveRestoredView: resolveRestoredView,
        renderOperationCenter: renderOperationCenter,
        navigateToOperationCenter: navigateToOperationCenter
    };
})(typeof window !== 'undefined' ? window : globalThis);
