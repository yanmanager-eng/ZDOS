/**
 * ZDP-001｜ZDOS Development Platform MVP
 *
 * Sections:
 * 1. 今日待驗收
 * 2. 最近完成
 * 3. Founder Review（通過／修改／不通過）— memory only
 * 4. Build 資訊
 *
 * Does not modify Founder Console / Auth / Production.
 * Feature flag: ZDOS_DEV_PLATFORM (memory, default false, local DEV only)
 */
(function (global) {
    'use strict';

    var Engine = global.ZdosCapabilityEngine;
    var Resolver = global.ZdosCapabilityResolver;
    var FounderContext = global.ZdosFounderContext;
    var Adapter = global.ZdosFounderIdentityAdapter;
    var Registry = global.ZdosDevPlatformRegistry;

    if (!Engine || !Resolver || !FounderContext || !Adapter || !Registry) {
        throw new Error('[ZdosDevPlatform] Capability stack + registry must load first');
    }

    var FLAG_NAME = 'ZDOS_DEV_PLATFORM';
    var BUILD_ID = 'ZDP-001';
    var flagEnabled = false;
    var testRoleSourceOverride = null;
    var hostBridge = null;
    /** @type {Object.<string, 'pass'|'revise'|'fail'>} */
    var reviewDecisions = Object.create(null);
    var selectedReviewId = null;

    function isLocalDevHost() {
        try {
            var loc = global.location;
            if (!loc) return false;
            if (String(loc.protocol || '') === 'file:') return true;
            var host = String(loc.hostname || '').toLowerCase();
            return host === 'localhost' || host === '127.0.0.1' || host === '::1';
        } catch (_) {
            return false;
        }
    }

    function isFlagEnabled() {
        return flagEnabled === true;
    }

    function setFlagForDev(value) {
        if (!isLocalDevHost()) return false;
        flagEnabled = value === true;
        if (!flagEnabled) testRoleSourceOverride = null;
        return flagEnabled;
    }

    try {
        Object.defineProperty(global, FLAG_NAME, {
            configurable: true,
            enumerable: true,
            get: function () { return isFlagEnabled(); },
            set: function () { /* Dev API only */ }
        });
    } catch (_) {
        global[FLAG_NAME] = false;
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function attachHostBridge(bridge) {
        hostBridge = bridge && typeof bridge === 'object' ? bridge : null;
    }

    function resolveRoleSource(explicit) {
        if (testRoleSourceOverride && typeof testRoleSourceOverride === 'object') {
            return testRoleSourceOverride;
        }
        if (explicit && typeof explicit === 'object') return explicit;
        if (hostBridge && typeof hostBridge.getRoleSource === 'function') {
            return hostBridge.getRoleSource() || {};
        }
        return {};
    }

    function denyToast() {
        if (hostBridge && typeof hostBridge.showToast === 'function') {
            hostBridge.showToast('此功能僅限創辦人使用', 'error');
        }
    }

    function canAccessDevPlatform(roleSource) {
        if (!isFlagEnabled()) return false;
        if (!Engine.isEnabled()) return false;
        var src = resolveRoleSource(roleSource);
        if (!Adapter.isOfficialFounderRole(src)) return false;
        var ctx = Adapter.toFounderContext(src);
        if (!FounderContext.isFounderContext(ctx)) return false;
        return Resolver.has(ctx, 'founder') === true;
    }

    function reviewLabel(decision) {
        if (decision === 'pass') return '通過';
        if (decision === 'revise') return '修改';
        if (decision === 'fail') return '不通過';
        return '尚未評審';
    }

    function setReviewDecision(ticketId, decision) {
        if (!canAccessDevPlatform()) return false;
        var ticket = Registry.getTicket(ticketId);
        if (!ticket || ticket.bucket !== 'pending_review') return false;
        if (decision !== 'pass' && decision !== 'revise' && decision !== 'fail') return false;
        reviewDecisions[ticket.id] = decision;
        selectedReviewId = ticket.id;
        if (hostBridge && typeof hostBridge.rerender === 'function') {
            hostBridge.rerender();
        }
        return true;
    }

    function selectReviewTicket(ticketId) {
        if (!canAccessDevPlatform()) return false;
        var ticket = Registry.getTicket(ticketId);
        if (!ticket || ticket.bucket !== 'pending_review') return false;
        selectedReviewId = ticket.id;
        if (hostBridge && typeof hostBridge.rerender === 'function') {
            hostBridge.rerender();
        }
        return true;
    }

    function renderTicketList(items, emptyText) {
        if (!items.length) {
            return '<p class="zdp-empty">' + escapeHtml(emptyText) + '</p>';
        }
        return (
            '<ul class="zdp-list">' +
            items.map(function (t) {
                return (
                    '<li class="zdp-item" data-zdos-zdp-ticket="' + escapeHtml(t.id) + '">' +
                        '<div class="zdp-item-id">' + escapeHtml(t.id) + '</div>' +
                        '<p class="zdp-item-title">' + escapeHtml(t.title) + '</p>' +
                        '<p class="zdp-item-meta">' + escapeHtml(t.status) + (t.note ? ' · ' + escapeHtml(t.note) : '') + '</p>' +
                    '</li>'
                );
            }).join('') +
            '</ul>'
        );
    }

    function renderReviewSection() {
        var pending = Registry.listByBucket('pending_review');
        if (!pending.length) {
            return '<p class="zdp-empty">目前沒有待 Founder Review 的項目。</p>';
        }
        if (!selectedReviewId || !Registry.getTicket(selectedReviewId) || Registry.getTicket(selectedReviewId).bucket !== 'pending_review') {
            selectedReviewId = pending[0].id;
        }
        var current = Registry.getTicket(selectedReviewId);
        var decision = reviewDecisions[current.id] || '';

        var picker = pending.map(function (t) {
            var active = t.id === current.id ? ' is-active' : '';
            return (
                '<button type="button" class="zdp-review-btn' + active + '" data-zdos-zdp-select="' + escapeHtml(t.id) + '">' +
                    escapeHtml(t.id) +
                '</button>'
            );
        }).join('');

        return (
            '<div class="zdp-review-actions" aria-label="選擇待審項目">' + picker + '</div>' +
            '<div class="zdp-item zdp-item--review-current">' +
                '<div class="zdp-item-id">' + escapeHtml(current.id) + '</div>' +
                '<p class="zdp-item-title">' + escapeHtml(current.title) + '</p>' +
                '<p class="zdp-item-meta">' + escapeHtml(current.status) + '</p>' +
                '<p class="zdp-item-meta">評審結果：' + escapeHtml(reviewLabel(decision)) + '</p>' +
            '</div>' +
            '<div class="zdp-review-actions" aria-label="Founder Review">' +
                '<button type="button" class="zdp-review-btn zdp-review-btn--pass' + (decision === 'pass' ? ' is-active' : '') + '" data-zdos-zdp-review="pass">通過</button>' +
                '<button type="button" class="zdp-review-btn zdp-review-btn--revise' + (decision === 'revise' ? ' is-active' : '') + '" data-zdos-zdp-review="revise">修改</button>' +
                '<button type="button" class="zdp-review-btn zdp-review-btn--fail' + (decision === 'fail' ? ' is-active' : '') + '" data-zdos-zdp-review="fail">不通過</button>' +
            '</div>' +
            '<p class="zdp-empty">評審僅本機記憶體暫存，不寫入正式資料／localStorage 既有 key。</p>'
        );
    }

    function renderBuildSection() {
        var rows = [
            { label: '正式版', value: 'v1.5.0' },
            { label: 'NEXT 開發線', value: 'next' },
            { label: '目前項目', value: BUILD_ID },
            { label: '能力引擎', value: Engine.isEnabled() ? '正常' : '未啟用' },
            { label: '工作台旗標', value: (global.ZDOS_FOUNDER_CONSOLE === true) ? '已啟用' : '未啟用' },
            { label: '開發平台旗標', value: isFlagEnabled() ? '已啟用' : '未啟用' }
        ];
        return (
            '<div class="zdp-build-rows">' +
            rows.map(function (r) {
                return (
                    '<div class="zdp-build-row">' +
                        '<span class="zdp-build-label">' + escapeHtml(r.label) + '</span>' +
                        '<span class="zdp-build-value">' + escapeHtml(r.value) + '</span>' +
                    '</div>'
                );
            }).join('') +
            '</div>'
        );
    }

    function bindPageEvents(root) {
        if (!root || root.getAttribute('data-zdos-zdp-bound') === '1') return;
        root.setAttribute('data-zdos-zdp-bound', '1');
        root.addEventListener('click', function (ev) {
            var t = ev.target;
            if (!t || !t.getAttribute) return;
            var selectId = t.getAttribute('data-zdos-zdp-select');
            if (selectId) {
                selectReviewTicket(selectId);
                return;
            }
            var decision = t.getAttribute('data-zdos-zdp-review');
            if (decision) {
                setReviewDecision(selectedReviewId, decision);
            }
        });
    }

    function renderDevPlatform(root, options) {
        var opts = options && typeof options === 'object' ? options : {};
        var roleSource = resolveRoleSource(opts.roleSource);
        if (!canAccessDevPlatform(roleSource)) {
            if (opts.onDenied) opts.onDenied();
            else denyToast();
            return false;
        }
        if (!root) return false;

        var pending = Registry.listByBucket('pending_review');
        var completed = Registry.listByBucket('completed');

        var header =
            '<header class="zdos-workspace-header zdos-app-header">' +
                '<div class="zdos-workspace-header-inner">' +
                    '<button type="button" onclick="window.ZdosDevPlatform && window.ZdosDevPlatform.requestBack()" class="zdos-workspace-back zdos-nav-btn">← 返回</button>' +
                    '<div class="zdp-header-block">' +
                        '<h1 class="zdp-title">開發平台</h1>' +
                        '<p class="zdp-subtitle">Development Platform</p>' +
                    '</div>' +
                    '<div class="zdos-workspace-actions">' +
                        '<span class="zdos-workspace-btn zdos-home-ops-badge border-sky-500/25 bg-sky-500/15 text-sky-300">ZDP</span>' +
                    '</div>' +
                '</div>' +
            '</header>';

        root.innerHTML =
            '<div data-zdos-zdp-page="1" class="zdos-workspace w-full min-w-0 max-w-5xl mx-auto px-2 sm:px-3 py-3 sm:py-4 font-sans overflow-x-hidden">' +
                header +
                '<div class="zdos-workspace-body zdos-view-body zdp-stack">' +
                    '<section class="zdp-brief" aria-label="開發平台摘要">' +
                        '<h2 class="zdp-brief-title">ZDOS Development Platform</h2>' +
                        '<p class="zdp-brief-desc">檢視待驗收項目、最近完成與 Founder Review。不含假數據。</p>' +
                    '</section>' +
                    '<div class="zdp-stack zdp-grid">' +
                        '<section data-zdos-zdp-section="pending" class="zdp-card">' +
                            '<p class="zdp-card-eyebrow">Queue</p>' +
                            '<h3 class="zdp-card-title">今日待驗收</h3>' +
                            renderTicketList(pending, '目前沒有待驗收項目。') +
                        '</section>' +
                        '<section data-zdos-zdp-section="completed" class="zdp-card">' +
                            '<p class="zdp-card-eyebrow">Done</p>' +
                            '<h3 class="zdp-card-title">最近完成</h3>' +
                            renderTicketList(completed, '尚無已完成項目。') +
                        '</section>' +
                        '<section data-zdos-zdp-section="review" class="zdp-card zdp-card--span">' +
                            '<p class="zdp-card-eyebrow">Founder Review</p>' +
                            '<h3 class="zdp-card-title">創辦人評審</h3>' +
                            renderReviewSection() +
                        '</section>' +
                        '<section data-zdos-zdp-section="build" class="zdp-card zdp-card--span">' +
                            '<p class="zdp-card-eyebrow">Build</p>' +
                            '<h3 class="zdp-card-title">Build 資訊</h3>' +
                            renderBuildSection() +
                        '</section>' +
                    '</div>' +
                    '<p class="zdp-build-footer">Build ' + escapeHtml(BUILD_ID) + '</p>' +
                '</div>' +
            '</div>';

        // Re-bind on the outer root each render (innerHTML replaces previous listeners on page node)
        root.removeAttribute('data-zdos-zdp-bound');
        bindPageEvents(root);
        return true;
    }

    function openDevPlatform(roleSource) {
        if (!canAccessDevPlatform(roleSource)) {
            denyToast();
            return false;
        }
        if (hostBridge && typeof hostBridge.navigateToPlatform === 'function') {
            hostBridge.navigateToPlatform();
            return true;
        }
        return false;
    }

    function requestBack() {
        if (hostBridge && typeof hostBridge.navigateHome === 'function') {
            hostBridge.navigateHome();
        }
    }

    function renderEntryHtml() {
        if (!canAccessDevPlatform()) return '';
        return (
            '<button type="button" data-zdos-zdp-entry="1" onclick="openDevPlatform()" ' +
            'class="zdos-nav-btn group text-left zdos-home-card zdos-home-ops-card border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 to-sky-500/5 hover:border-cyan-400/40 transition-all">' +
                '<div class="zdos-home-ops-card-top"><span class="zdos-home-ops-icon">◫</span><span class="zdos-home-ops-arrow text-cyan-300">→</span></div>' +
                '<h3 class="zdos-home-ops-title">開發平台</h3>' +
                '<p class="zdos-home-ops-desc">Development Platform · 待驗收與 Review</p>' +
            '</button>'
        );
    }

    function renderMobileEntryHtml() {
        if (!canAccessDevPlatform()) return '';
        return (
            '<button type="button" data-zdos-zdp-entry="1" class="zdos-mh__quick-btn" onclick="openDevPlatform()">' +
                '<span class="zdos-mh__quick-icon" aria-hidden="true">◫</span>' +
                '<span class="zdos-mh__quick-label">開發平台</span>' +
            '</button>'
        );
    }

    function status() {
        return {
            flag: isFlagEnabled(),
            engineEnabled: Engine.isEnabled(),
            localDevHost: isLocalDevHost(),
            hasTestOverride: !!testRoleSourceOverride,
            canAccess: canAccessDevPlatform(),
            selectedReviewId: selectedReviewId,
            reviewCount: Object.keys(reviewDecisions).length
        };
    }

    var Dev = {
        enable: function () {
            if (!isLocalDevHost()) return { ok: false, reason: 'non-local' };
            Engine.setEnabledForDev(true);
            setFlagForDev(true);
            return status();
        },
        disable: function () {
            if (!isLocalDevHost()) return { ok: false, reason: 'non-local' };
            setFlagForDev(false);
            testRoleSourceOverride = null;
            return status();
        },
        status: status,
        openWithTestContext: function () {
            if (!isLocalDevHost()) return { ok: false, reason: 'non-local' };
            Engine.setEnabledForDev(true);
            setFlagForDev(true);
            testRoleSourceOverride = { cloudRole: 'owner' };
            var opened = openDevPlatform(testRoleSourceOverride);
            return { ok: opened === true, status: status() };
        },
        resetReviews: function () {
            if (!isLocalDevHost()) return { ok: false, reason: 'non-local' };
            reviewDecisions = Object.create(null);
            selectedReviewId = null;
            return status();
        }
    };

    function runZdosDevPlatformAcceptance() {
        var results = [];
        var passed = 0;
        var failed = 0;
        function note(name, ok, detail) {
            results.push({ name: name, ok: !!ok, detail: detail || '' });
            if (ok) passed += 1;
            else failed += 1;
        }

        var prevFlag = flagEnabled;
        var prevOverride = testRoleSourceOverride;
        var prevReviews = reviewDecisions;
        var prevSelected = selectedReviewId;
        var engineWas = Engine.isEnabled();

        try {
            setFlagForDev(false);
            testRoleSourceOverride = null;
            if (isLocalDevHost()) Engine.setEnabledForDev(false);
            note('flag_default_off', isFlagEnabled() === false, '');
            note('entry_absent_flag_off', renderEntryHtml() === '', '');

            if (isLocalDevHost()) {
                Engine.setEnabledForDev(true);
                setFlagForDev(true);
            }
            testRoleSourceOverride = { cloudRole: 'staff' };
            note('non_founder_denied', canAccessDevPlatform() === false && openDevPlatform() === false, '');

            testRoleSourceOverride = { cloudRole: 'owner' };
            note('founder_access_ok', canAccessDevPlatform() === true, JSON.stringify(status()));

            var probe = global.document && global.document.createElement('div');
            var rendered = probe ? renderDevPlatform(probe, { roleSource: { cloudRole: 'owner' }, onDenied: function () {} }) : false;
            var html = probe ? probe.innerHTML : '';
            note('renders', rendered === true, '');
            note('section_pending', /data-zdos-zdp-section="pending"/.test(html) && /今日待驗收/.test(html), '');
            note('section_completed', /data-zdos-zdp-section="completed"/.test(html) && /最近完成/.test(html), '');
            note('section_review', /data-zdos-zdp-section="review"/.test(html) && /通過/.test(html) && /修改/.test(html) && /不通過/.test(html), '');
            note('section_build', /data-zdos-zdp-section="build"/.test(html) && /Build 資訊/.test(html), '');
            note('real_pending_tickets', /NEXT-003/.test(html) && /NEXT-003A/.test(html), '');
            note('real_completed_tickets', /NEXT-000/.test(html) && /NEXT-001/.test(html) && /NEXT-002/.test(html), '');
            note('no_fake_percent', !/\d+\s*%/.test(html), '');
            note('no_fake_revenue', !/營收|\$|NT\$/.test(html), '');
            note('build_footer', /Build ZDP-001/.test(html), '');
            note('mobile_rwd_classes', /overflow-x-hidden/.test(html) && /min-w-0/.test(html), '');

            note('review_pass', setReviewDecision('NEXT-003A', 'pass') === true && reviewDecisions['NEXT-003A'] === 'pass', '');
            note('review_revise', setReviewDecision('NEXT-003A', 'revise') === true && reviewDecisions['NEXT-003A'] === 'revise', '');
            note('review_fail', setReviewDecision('NEXT-003', 'fail') === true && reviewDecisions['NEXT-003'] === 'fail', '');
            note('review_reject_completed', setReviewDecision('NEXT-001', 'pass') === false, '');

            if (probe) {
                renderDevPlatform(probe, { roleSource: { cloudRole: 'owner' }, onDenied: function () {} });
                renderDevPlatform(probe, { roleSource: { cloudRole: 'owner' }, onDenied: function () {} });
                var pages = probe.querySelectorAll('[data-zdos-zdp-page="1"]');
                note('rerender_no_dup', pages.length === 1, 'count=' + pages.length);
            } else {
                note('rerender_no_dup', false, 'no probe');
            }

            setFlagForDev(false);
            testRoleSourceOverride = null;
            if (isLocalDevHost()) Engine.setEnabledForDev(false);
            note('flag_off_restored', canAccessDevPlatform() === false && renderEntryHtml() === '', '');

            // Founder Console API still present / untouched surface
            note('founder_console_untouched', typeof global.ZdosFounderConsole === 'object' && typeof global.ZdosFounderConsoleDev === 'object', '');
        } finally {
            flagEnabled = prevFlag;
            testRoleSourceOverride = prevOverride;
            reviewDecisions = prevReviews;
            selectedReviewId = prevSelected;
            if (isLocalDevHost()) Engine.setEnabledForDev(engineWas);
        }

        return { passed: passed, failed: failed, total: results.length, results: results };
    }

    global.ZdosDevPlatform = Object.freeze({
        FLAG_NAME: FLAG_NAME,
        BUILD_ID: BUILD_ID,
        isFlagEnabled: isFlagEnabled,
        setFlagForDev: setFlagForDev,
        attachHostBridge: attachHostBridge,
        canAccessDevPlatform: canAccessDevPlatform,
        openDevPlatform: openDevPlatform,
        renderDevPlatform: renderDevPlatform,
        renderEntryHtml: renderEntryHtml,
        renderMobileEntryHtml: renderMobileEntryHtml,
        requestBack: requestBack,
        setReviewDecision: setReviewDecision,
        selectReviewTicket: selectReviewTicket,
        runAcceptance: runZdosDevPlatformAcceptance
    });

    global.ZdosDevPlatformDev = Object.freeze(Dev);
    global.runZdosDevPlatformAcceptance = runZdosDevPlatformAcceptance;
})(typeof window !== 'undefined' ? window : globalThis);
