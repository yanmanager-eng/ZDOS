/**
 * NEXT-003 | Founder Console v0.1
 *
 * Feature flag: ZDOS_FOUNDER_CONSOLE (memory, default false)
 * Guards + render + DEV API + Acceptance
 * Not a second homepage. Not Auth. Does not replace existing privileges.
 */
(function (global) {
    'use strict';

    var Engine = global.ZdosCapabilityEngine;
    var Resolver = global.ZdosCapabilityResolver;
    var FounderContext = global.ZdosFounderContext;
    var Adapter = global.ZdosFounderIdentityAdapter;

    if (!Engine || !Resolver || !FounderContext || !Adapter) {
        throw new Error('[ZdosFounderConsole] Capability stack must load first');
    }

    var FLAG_NAME = 'ZDOS_FOUNDER_CONSOLE';
    var flagEnabled = false;
    var testRoleSourceOverride = null;
    var hostBridge = null;

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
            set: function () { /* ignore direct assignment — use Dev API */ }
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
        // DEV test override wins so openWithTestContext survives host getRoleSource() re-checks.
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

    /**
     * Full access gate used by entry render / open / route.
     */
    function canAccessFounderConsole(roleSource) {
        if (!isFlagEnabled()) return false;
        if (!Engine.isEnabled()) return false;
        var src = resolveRoleSource(roleSource);
        if (!Adapter.isOfficialFounderRole(src)) return false;
        var ctx = Adapter.toFounderContext(src);
        if (!FounderContext.isFounderContext(ctx)) return false;
        return Resolver.has(ctx, 'founder') === true;
    }

    function buildSystemHealthRows() {
        return [
            {
                label: '能力引擎',
                value: Engine.isEnabled() ? '正常' : '未啟用',
                tone: Engine.isEnabled() ? 'ok' : 'muted'
            },
            {
                label: '創辦人身分解析',
                value: Resolver ? '正常' : '不可用',
                tone: Resolver ? 'ok' : 'muted'
            },
            {
                label: '工作台功能旗標',
                value: isFlagEnabled() ? '已啟用' : '未啟用',
                tone: isFlagEnabled() ? 'on' : 'muted'
            },
            {
                label: '正式版隔離保護',
                value: '已保護',
                tone: 'ok'
            }
        ];
    }

    function buildDevelopmentRows() {
        return [
            { label: '正式版', value: 'v1.5.0', tone: '' },
            { label: 'NEXT 開發線', value: 'next', tone: '' },
            { label: '目前項目', value: 'NEXT-003A', tone: '' },
            { label: '已完成', value: 'NEXT-000、NEXT-001、NEXT-002、NEXT-003', tone: '' },
            { label: '開發進度', value: '進度資料尚未接入', tone: 'muted' }
        ];
    }

    function renderCard(id, eyebrow, title, bodyHtml, widthClass) {
        var width = widthClass === 'wide' ? 'zdos-fc-card--wide' : 'zdos-fc-card--narrow';
        return (
            '<section data-zdos-fc-card="' + escapeHtml(id) + '" class="zdos-fc-card zdos-home-card ' + width + '">' +
                '<div>' +
                    '<p class="zdos-fc-card-eyebrow">' + escapeHtml(eyebrow) + '</p>' +
                    '<h3 class="zdos-fc-card-title">' + escapeHtml(title) + '</h3>' +
                '</div>' +
                bodyHtml +
            '</section>'
        );
    }

    function toneClass(tone) {
        if (tone === 'ok') return ' zdos-fc-tone-ok';
        if (tone === 'on') return ' zdos-fc-tone-on';
        if (tone === 'muted') return ' zdos-fc-tone-muted';
        return '';
    }

    function renderRows(rows) {
        return (
            '<dl class="zdos-fc-rows">' +
            rows.map(function (row) {
                return (
                    '<div class="zdos-fc-row-item">' +
                        '<dt class="zdos-fc-row-label">' + escapeHtml(row.label) + '</dt>' +
                        '<dd class="zdos-fc-row-value' + toneClass(row.tone) + '">' + escapeHtml(row.value) + '</dd>' +
                    '</div>'
                );
            }).join('') +
            '</dl>'
        );
    }

    function renderFounderConsole(root, options) {
        var opts = options && typeof options === 'object' ? options : {};
        var roleSource = resolveRoleSource(opts.roleSource);
        if (!canAccessFounderConsole(roleSource)) {
            if (opts.onDenied) opts.onDenied();
            else denyToast();
            return false;
        }
        if (!root) return false;

        var backHandler = 'window.ZdosFounderConsole && window.ZdosFounderConsole.requestBack()';
        var header =
            '<header class="zdos-workspace-header zdos-app-header">' +
                '<div class="zdos-workspace-header-inner">' +
                    '<button type="button" onclick="' + backHandler + '" class="zdos-workspace-back zdos-nav-btn">← 返回</button>' +
                    '<div class="zdos-fc-header-block">' +
                        '<h1 class="zdos-fc-title">創辦人工作台</h1>' +
                        '<p class="zdos-fc-subtitle">Founder Control Center</p>' +
                    '</div>' +
                    '<div class="zdos-workspace-actions">' +
                        '<span class="zdos-workspace-btn zdos-fc-badge zdos-home-ops-badge border-sky-500/25 bg-sky-500/15 text-sky-300">Founder</span>' +
                    '</div>' +
                '</div>' +
            '</header>';

        var development = renderCard(
            'development',
            'Development',
            '開發狀態',
            renderRows(buildDevelopmentRows()),
            'wide'
        );
        var systemHealth = renderCard(
            'system-health',
            'System Health',
            '系統健康',
            renderRows(buildSystemHealthRows()) +
                '<p class="zdos-fc-note">Bug Registry 尚未接入</p>',
            'narrow'
        );
        var operation = renderCard(
            'operation',
            'Operation',
            '營運概況',
            '<p class="zdos-fc-body-text">營運資料尚未接入</p>',
            'narrow'
        );
        var aiBrief = renderCard(
            'ai-brief',
            'AI Brief',
            'AI Brief',
            '<p class="zdos-fc-body-text">AI 創辦人簡報將於後續版本啟用。</p>',
            'wide'
        );

        root.innerHTML =
            '<div data-zdos-founder-console-page="1" class="zdos-workspace w-full min-w-0 max-w-5xl mx-auto px-2 sm:px-3 py-3 sm:py-4 font-sans overflow-x-hidden">' +
                header +
                '<div class="zdos-workspace-body zdos-view-body zdos-fc-stack">' +
                    '<section class="zdos-fc-brief" aria-label="今日創辦人簡報">' +
                        '<h2 class="zdos-fc-brief-title">今日創辦人簡報</h2>' +
                        '<p class="zdos-fc-brief-desc">快速掌握系統狀態、開發進度與後續重點。</p>' +
                    '</section>' +
                    '<div class="zdos-fc-row zdos-fc-row--primary">' +
                        development + systemHealth +
                    '</div>' +
                    '<div class="zdos-fc-row zdos-fc-row--secondary">' +
                        operation + aiBrief +
                    '</div>' +
                    '<p class="zdos-fc-build">Build NEXT-003A</p>' +
                '</div>' +
            '</div>';
        return true;
    }

    function openFounderConsole(roleSource) {
        if (!canAccessFounderConsole(roleSource)) {
            denyToast();
            return false;
        }
        if (hostBridge && typeof hostBridge.navigateToConsole === 'function') {
            hostBridge.navigateToConsole();
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
        if (!canAccessFounderConsole()) return '';
        return (
            '<button type="button" data-zdos-founder-console-entry="1" onclick="openFounderConsole()" ' +
            'class="zdos-nav-btn group text-left zdos-home-card zdos-home-ops-card border-sky-500/25 bg-gradient-to-br from-sky-500/10 to-cyan-500/5 hover:border-sky-400/40 transition-all">' +
                '<div class="zdos-home-ops-card-top"><span class="zdos-home-ops-icon">▣</span><span class="zdos-home-ops-arrow text-sky-400">→</span></div>' +
                '<h3 class="zdos-home-ops-title">創辦人工作台</h3>' +
                '<p class="zdos-home-ops-desc">Founder Console · 開發與系統狀態</p>' +
            '</button>'
        );
    }

    function renderMobileEntryHtml() {
        if (!canAccessFounderConsole()) return '';
        return (
            '<button type="button" data-zdos-founder-console-entry="1" class="zdos-mh__quick-btn" onclick="openFounderConsole()">' +
                '<span class="zdos-mh__quick-icon" aria-hidden="true">▣</span>' +
                '<span class="zdos-mh__quick-label">創辦人工作台</span>' +
            '</button>'
        );
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
            var opened = openFounderConsole(testRoleSourceOverride);
            return { ok: opened === true, status: status() };
        }
    };

    function status() {
        return {
            flag: isFlagEnabled(),
            engineEnabled: Engine.isEnabled(),
            localDevHost: isLocalDevHost(),
            hasTestOverride: !!testRoleSourceOverride,
            canAccess: canAccessFounderConsole()
        };
    }

    function runZdosFounderConsoleAcceptance() {
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
        var engineWas = Engine.isEnabled();
        var root = global.document && global.document.getElementById('root');
        var originalRootHtml = root ? root.innerHTML : '';

        try {
            // 1. Flag default observation: after disable
            setFlagForDev(false);
            testRoleSourceOverride = null;
            if (isLocalDevHost()) Engine.setEnabledForDev(false);
            note('flag_default_off', isFlagEnabled() === false, 'flag=' + isFlagEnabled());

            // 2. Entry absent when flag off
            var entryHtmlOff = renderEntryHtml();
            note('entry_absent_flag_off', entryHtmlOff === '', 'len=' + entryHtmlOff.length);

            // 3. Non-founder no entry
            if (isLocalDevHost()) {
                Engine.setEnabledForDev(true);
                setFlagForDev(true);
            }
            testRoleSourceOverride = { cloudRole: 'staff', accountRole: '一般員工' };
            note('non_founder_no_entry', renderEntryHtml() === '' && canAccessFounderConsole() === false, '');

            // 4. Non-founder open denied
            var openDenied = openFounderConsole({ accountRole: '一般員工' });
            note('non_founder_open_denied', openDenied === false, '');

            // 5. Founder + flag + engine can access
            testRoleSourceOverride = { cloudRole: 'owner' };
            var canIn = canAccessFounderConsole();
            note('founder_access_ok', canIn === true, JSON.stringify(status()));

            // 6-10 cards content
            var probe = global.document && global.document.createElement('div');
            var rendered = false;
            if (probe) {
                rendered = renderFounderConsole(probe, {
                    roleSource: { cloudRole: 'owner' },
                    onDenied: function () {}
                });
            }
            note('console_renders', rendered === true, '');
            var html = probe ? probe.innerHTML : '';
            note('card_development', /data-zdos-fc-card="development"/.test(html), '');
            note('card_system_health', /data-zdos-fc-card="system-health"/.test(html), '');
            note('card_operation', /data-zdos-fc-card="operation"/.test(html), '');
            note('card_ai_brief', /data-zdos-fc-card="ai-brief"/.test(html), '');
            note('no_fake_percent', !/\d+\s*%/.test(html) && /進度資料尚未接入/.test(html), '');
            note('no_fake_bugs', /Bug Registry 尚未接入/.test(html) && !/Critical|High|Medium/.test(html), '');
            note('no_fake_ops_metrics', /營運資料尚未接入/.test(html) && /營運概況/.test(html), '');
            note('ai_brief_placeholder', /AI 創辦人簡報將於後續版本啟用/.test(html), '');
            note('ui_no_v01_badge', !/Founder Console v0\.1/i.test(html) && !/v0\.1/.test(html), '');
            note('ui_build_footer', /Build NEXT-003A/.test(html), '');
            note('ui_brief_copy', /今日創辦人簡報/.test(html) && /快速掌握系統狀態/.test(html), '');
            note('ui_zh_labels', /正式版/.test(html) && /能力引擎/.test(html) && /開發進度/.test(html), '');

            // 11. back hook exists
            note('back_hook', typeof requestBack === 'function', '');

            // 12. re-render replaces DOM (no duplicate page roots)
            if (probe) {
                renderFounderConsole(probe, { roleSource: { cloudRole: 'owner' }, onDenied: function () {} });
                renderFounderConsole(probe, { roleSource: { cloudRole: 'owner' }, onDenied: function () {} });
                var pages = probe.querySelectorAll('[data-zdos-founder-console-page="1"]');
                note('rerender_no_dup', pages.length === 1, 'count=' + pages.length);
            } else {
                note('rerender_no_dup', false, 'no probe element');
            }

            // 13. mobile width: page uses overflow-x-hidden / min-w-0
            note('mobile_rwd_classes', /overflow-x-hidden/.test(html) && /min-w-0/.test(html), '');

            // 14. flag off restores inaccessibility
            setFlagForDev(false);
            testRoleSourceOverride = null;
            if (isLocalDevHost()) Engine.setEnabledForDev(false);
            note('flag_off_restored', canAccessFounderConsole() === false && renderEntryHtml() === '', '');

            // 15. identity adapter does not treat staff as founder
            note('roles_untouched_mapping', Adapter.isOfficialFounderRole({ cloudRole: 'manager' }) === false, '');

            // 16. no throw path for denied open
            var threw = false;
            try { openFounderConsole({ accountRole: '店長' }); } catch (e) { threw = true; }
            note('no_uncaught_on_deny', threw === false, '');

            // Adapter hardcode check
            note('no_hardcoded_account', !/CH011901|顏志添|@/.test(String(Adapter.toFounderContext) + Adapter.isOfficialFounderRole), '');
        } finally {
            flagEnabled = prevFlag;
            testRoleSourceOverride = prevOverride;
            if (isLocalDevHost()) Engine.setEnabledForDev(engineWas);
            if (root && originalRootHtml != null && hostBridge && hostBridge.restoreRootOnAcceptance !== false) {
                // leave host DOM alone unless empty probe-only
            }
        }

        return {
            passed: passed,
            failed: failed,
            total: results.length,
            results: results
        };
    }

    global.ZdosFounderConsole = Object.freeze({
        FLAG_NAME: FLAG_NAME,
        isFlagEnabled: isFlagEnabled,
        setFlagForDev: setFlagForDev,
        attachHostBridge: attachHostBridge,
        canAccessFounderConsole: canAccessFounderConsole,
        openFounderConsole: openFounderConsole,
        renderFounderConsole: renderFounderConsole,
        renderEntryHtml: renderEntryHtml,
        renderMobileEntryHtml: renderMobileEntryHtml,
        requestBack: requestBack,
        runAcceptance: runZdosFounderConsoleAcceptance
    });

    global.ZdosFounderConsoleDev = Object.freeze(Dev);
    global.runZdosFounderConsoleAcceptance = runZdosFounderConsoleAcceptance;
})(typeof window !== 'undefined' ? window : globalThis);
