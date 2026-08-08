/**
 * UI-025｜ZDOS Academy Official
 * ACADEMY-001｜學院中心 IA＋Theme（人才培育與知識傳承）
 *
 * Screens: Home · Capability Map/List · Capability Detail
 * Visual: Official Deep Navy Glass（對齊 G02／DS-001）
 *
 * Data: ZdosAcademyCapabilityRegistry (+ Prerequisite / Schema / Version)
 * Host levels: getAbilityLevels() — no fake curriculum / exam engines.
 *
 * Does NOT:
 * - modify Engine / Auth / Supabase / Permission / Migration / Registry / API
 * - invent fake employee levels
 * - write zdos_ability_registry_v1
 * - replace UI-018 academy view wiring
 */
(function (global) {
    'use strict';

    var Schema = global.ZdosAcademyCapabilitySchema;
    var Registry = global.ZdosAcademyCapabilityRegistry;
    var Prereq = global.ZdosAcademyPrerequisiteEngine;
    var Version = global.ZdosAcademyVersionEngine;

    if (!Schema || !Registry || !Prereq || !Version) {
        throw new Error('[ZdosAcademyUI] Capability Core must load first');
    }

    var FLAG_NAME = 'ZDOS_ZD_ACADEMY_UI';
    var BUILD_ID = 'UI-025';
    var flagEnabled = true;
    var hostBridge = null;

    /** @type {{ screen: string, categoryId: string|null, capabilityId: string|null, detailSection: string|null }} */
    var uiState = {
        screen: 'home',
        categoryId: null,
        capabilityId: null,
        detailSection: null
    };

    /** Session-only checklist toggles (presentation; not ability SoT). */
    var todayChecks = Object.create(null);

    var ICON_MAP = {
        academy: 'academy',
        core: 'progress',
        progress: 'progress',
        pro: 'report',
        mgmt: 'sales',
        lock: 'lock',
        unlock: 'success',
        check: 'check-circle',
        arrow: 'chevron-right',
        preview: 'academy',
        back: 'back',
        schedule: 'schedule',
        people: 'people',
        apps: 'apps'
    };

    /** Career path nodes for map — registry ids only, ordered by growth. */
    var CAREER_PATH_IDS = Object.freeze([
        'newbie', 'sop', 'hygiene', 'cashier', 'product', 'sales', 'lead', 'team'
    ]);

    function zdlIcon(name, size) {
        var n = String(name || 'academy').toLowerCase().replace(/[^a-z0-9-]/g, '');
        var sz = size ? (' zdl-icon--' + String(size).replace(/[^a-z0-9-]/g, '')) : '';
        return '<span class="zdl-icon zdl-icon--' + (n || 'academy') + sz + '" aria-hidden="true"></span>';
    }

    function iconSvg(key) {
        return zdlIcon(ICON_MAP[key] || 'academy');
    }

    function categoryIconKey(categoryId) {
        if (categoryId === 'pro') return 'pro';
        if (categoryId === 'mgmt') return 'mgmt';
        return 'core';
    }

    function isLan192Host(hostname) {
        return /^192\.168\.\d{1,3}\.\d{1,3}$/.test(String(hostname || ''));
    }

    function isDevPreviewHost() {
        try {
            var loc = global.location;
            if (!loc) return false;
            var host = String(loc.hostname || '').toLowerCase();
            if (host === 'localhost' || host === '127.0.0.1') return true;
            if (isLan192Host(host)) return true;
            return false;
        } catch (_) {
            return false;
        }
    }

    function isLocalDevHost() {
        try {
            var loc = global.location;
            if (!loc) return false;
            if (String(loc.protocol || '') === 'file:') return true;
            var host = String(loc.hostname || '').toLowerCase();
            if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
            if (isLan192Host(host)) return true;
            return false;
        } catch (_) {
            return false;
        }
    }

    function isFlagEnabled() {
        return flagEnabled === true;
    }

    function setFlagForDev(value) {
        if (!isLocalDevHost() && !isDevPreviewHost()) return false;
        flagEnabled = value === true;
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

    function getAbilityLevels() {
        if (hostBridge && typeof hostBridge.getAbilityLevels === 'function') {
            var raw = hostBridge.getAbilityLevels();
            return Schema.normalizeEmployeeAbilityMap(raw, Registry.listCapabilityIds());
        }
        return Object.create(null);
    }

    function canAccessZdAcademy() {
        if (!isFlagEnabled()) return false;
        if (hostBridge && typeof hostBridge.isLoggedIn === 'function') {
            return hostBridge.isLoggedIn() === true;
        }
        return false;
    }

    function denyToast(msg) {
        if (hostBridge && typeof hostBridge.showToast === 'function') {
            hostBridge.showToast(msg || '無法開啟能力學院', 'error');
        }
    }

    function requestRerender() {
        if (hostBridge && typeof hostBridge.rerender === 'function') {
            hostBridge.rerender();
            return;
        }
        var root = global.document && global.document.getElementById('root');
        if (root) renderZdAcademy(root);
    }

    function requestHome() {
        if (hostBridge && typeof hostBridge.navigateHome === 'function') {
            hostBridge.navigateHome();
        }
    }

    function navigateToAcademy() {
        if (!canAccessZdAcademy()) {
            denyToast('請先登入');
            return false;
        }
        if (hostBridge && typeof hostBridge.navigateToAcademy === 'function') {
            hostBridge.navigateToAcademy();
            return true;
        }
        return false;
    }

    function resetUiState() {
        uiState.screen = 'home';
        uiState.categoryId = null;
        uiState.capabilityId = null;
        uiState.detailSection = null;
    }

    function goHome() {
        uiState.screen = 'home';
        uiState.categoryId = null;
        uiState.capabilityId = null;
        uiState.detailSection = null;
        requestRerender();
    }

    function goList(categoryId) {
        uiState.screen = 'list';
        uiState.categoryId = categoryId ? String(categoryId) : null;
        uiState.capabilityId = null;
        uiState.detailSection = null;
        requestRerender();
    }

    function goDetail(capabilityId, section) {
        var id = String(capabilityId || '');
        if (!Registry.hasCapability(id)) {
            denyToast('找不到此能力');
            return;
        }
        uiState.screen = 'detail';
        uiState.capabilityId = id;
        uiState.detailSection = section ? String(section) : null;
        var cap = Registry.getCapability(id);
        uiState.categoryId = cap ? cap.categoryId : uiState.categoryId;
        requestRerender();
    }

    function goMap() {
        uiState.screen = 'map';
        uiState.capabilityId = null;
        uiState.detailSection = null;
        requestRerender();
    }

    function goMaterials() {
        uiState.screen = 'materials';
        uiState.capabilityId = null;
        uiState.detailSection = null;
        requestRerender();
    }

    function goHistory() {
        uiState.screen = 'history';
        uiState.capabilityId = null;
        uiState.detailSection = null;
        requestRerender();
    }

    function levelLabel(level) {
        var def = Schema.getLevelDefinition(level);
        return def ? def.name + '（' + def.short + '）' : String(level);
    }

    function isCapUnlocked(levels, capabilityId) {
        return Prereq.isUnlocked(levels, capabilityId) === true;
    }

    function computeMyAbilityStats(levels) {
        var ids = Registry.listCapabilityIds();
        var total = ids.length;
        var sum = 0;
        var completed = 0;
        var unlocked = 0;
        for (var i = 0; i < total; i++) {
            var id = ids[i];
            var lv = Schema.normalizeLevel(levels[id]);
            sum += lv;
            if (lv >= Prereq.UNLOCK_LEVEL) completed += 1;
            if (isCapUnlocked(levels, id)) unlocked += 1;
        }
        var avgRaw = total > 0 ? sum / total : 0;
        var avgLevel = Schema.normalizeLevel(Math.round(avgRaw));
        var progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
        var abilityPct = total > 0
            ? Math.round((sum / (total * Schema.LEVEL_MAX)) * 100)
            : 0;
        return {
            total: total,
            completed: completed,
            unlocked: unlocked,
            avgLevel: avgLevel,
            progressPct: progressPct,
            abilityPct: abilityPct,
            abilityPoints: sum,
            levelDef: Schema.getLevelDefinition(avgLevel)
        };
    }

    function resolveTodayLearning(levels) {
        var all = Registry.getAllCapabilities();
        var i, cap, lv;

        for (i = 0; i < all.length; i++) {
            cap = all[i];
            lv = Schema.normalizeLevel(levels[cap.id]);
            if (isCapUnlocked(levels, cap.id) && lv < Prereq.UNLOCK_LEVEL) {
                return {
                    cap: cap,
                    level: lv,
                    unlocked: true,
                    mode: 'continue',
                    hint: '建議繼續推進至達標',
                    remainMin: Math.max(10, (Prereq.UNLOCK_LEVEL - lv) * 15)
                };
            }
        }

        for (i = 0; i < all.length; i++) {
            cap = all[i];
            if (!isCapUnlocked(levels, cap.id)) {
                return {
                    cap: cap,
                    level: Schema.normalizeLevel(levels[cap.id]),
                    unlocked: false,
                    mode: 'next',
                    hint: '完成先修條件後即可解鎖',
                    remainMin: 20
                };
            }
        }

        var best = null;
        var bestLv = -1;
        for (i = 0; i < all.length; i++) {
            cap = all[i];
            lv = Schema.normalizeLevel(levels[cap.id]);
            if (lv >= bestLv) {
                bestLv = lv;
                best = cap;
            }
        }
        if (best) {
            return {
                cap: best,
                level: bestLv,
                unlocked: true,
                mode: 'review',
                hint: '全部能力已達標，可複習強化',
                remainMin: 15
            };
        }
        return null;
    }

    function listObtainedAndPending(levels) {
        var all = Registry.getAllCapabilities();
        var obtained = [];
        var pending = [];
        for (var i = 0; i < all.length; i++) {
            var cap = all[i];
            var lv = Schema.normalizeLevel(levels[cap.id]);
            if (lv >= Prereq.UNLOCK_LEVEL) obtained.push(cap);
            else pending.push(cap);
        }
        return { obtained: obtained, pending: pending };
    }

    function listRecentlyCompleted(levels, limit) {
        var max = typeof limit === 'number' ? limit : 6;
        var all = Registry.getAllCapabilities();
        var rows = [];
        for (var i = 0; i < all.length; i++) {
            var cap = all[i];
            var lv = Schema.normalizeLevel(levels[cap.id]);
            if (lv >= Prereq.UNLOCK_LEVEL) {
                rows.push({ cap: cap, level: lv, order: i });
            }
        }
        rows.sort(function (a, b) {
            if (b.level !== a.level) return b.level - a.level;
            return a.order - b.order;
        });
        return rows.slice(0, max);
    }

    /** ACADEMY-001｜學習階段（由既有等級／職涯路徑派生，禁假進度） */
    function resolveLearningStage(levels) {
        var stats = computeMyAbilityStats(levels);
        var focus = null;
        var i;
        for (i = 0; i < CAREER_PATH_IDS.length; i++) {
            var id = CAREER_PATH_IDS[i];
            var lv = Schema.normalizeLevel(levels[id]);
            if (lv < Prereq.UNLOCK_LEVEL) {
                focus = Registry.getCapability(id);
                break;
            }
        }
        var stageKey = 'onboarding';
        var stageLabel = '新人入職';
        if (stats.completed >= 8) {
            stageKey = 'leader';
            stageLabel = '幹部養成';
        } else if (stats.completed >= 4) {
            stageKey = 'pro';
            stageLabel = '專業進階';
        } else if (stats.completed >= 1) {
            stageKey = 'foundation';
            stageLabel = '基礎能力';
        }
        var today = resolveTodayLearning(levels);
        var nextLabel = today && today.cap
            ? (today.unlocked ? ('下一步：繼續「' + today.cap.name + '」') : ('下一步：準備解鎖「' + today.cap.name + '」'))
            : '下一步：複習已取得能力';
        var tone = 'ok';
        if (today && today.unlocked && today.mode === 'continue') tone = 'watch';
        else if (today && !today.unlocked) tone = 'risk';
        else if (stats.completed === 0) tone = 'risk';
        return {
            stageKey: stageKey,
            stageLabel: stageLabel,
            focusCap: focus,
            nextLabel: nextLabel,
            tone: tone,
            toneLabel: tone === 'risk' ? '待處理' : (tone === 'watch' ? '進行中' : '已完成'),
            stats: stats,
            today: today
        };
    }

    /** ACADEMY-001｜待完成訓練（解鎖優先；鎖定附先修說明） */
    function listPendingTraining(levels, limit) {
        var max = typeof limit === 'number' ? limit : 6;
        var all = Registry.getAllCapabilities();
        var pathIndex = Object.create(null);
        for (var p = 0; p < CAREER_PATH_IDS.length; p++) pathIndex[CAREER_PATH_IDS[p]] = p;
        var rows = [];
        for (var i = 0; i < all.length; i++) {
            var cap = all[i];
            var lv = Schema.normalizeLevel(levels[cap.id]);
            if (lv >= Prereq.UNLOCK_LEVEL) continue;
            var unlocked = isCapUnlocked(levels, cap.id);
            var tone = 'risk';
            var toneLabel = '待處理';
            var actionLabel = '開始訓練';
            var reason = '尚未開始';
            if (!unlocked) {
                tone = 'risk';
                toneLabel = '待處理';
                actionLabel = '查看先修';
                reason = '需完成先修條件後解鎖';
            } else if (lv > 0) {
                tone = 'watch';
                toneLabel = '進行中';
                actionLabel = '繼續學習';
                reason = '目前 ' + levelLabel(lv) + '，推進至達標';
            }
            rows.push({
                cap: cap,
                level: lv,
                unlocked: unlocked,
                tone: tone,
                toneLabel: toneLabel,
                actionLabel: actionLabel,
                reason: reason,
                order: pathIndex[cap.id] != null ? pathIndex[cap.id] : (100 + i)
            });
        }
        rows.sort(function (a, b) {
            if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
            if (a.tone !== b.tone) return a.tone === 'watch' ? -1 : 1;
            return a.order - b.order;
        });
        return rows.slice(0, max);
    }

    function renderToneHtml(tone, label) {
        var t = tone === 'risk' ? 'risk' : (tone === 'watch' ? 'watch' : 'ok');
        return '<span class="zda-tone zda-tone--' + t + '">' + escapeHtml(label || '') + '</span>';
    }

    function hostOpenHrCenter() {
        if (typeof global.openHrCenterHome === 'function') return 'openHrCenterHome()';
        return 'ZdosAcademyUI.goHome()';
    }

    function getTodayCheckKey(capId, kind) {
        return String(capId || 'none') + ':' + String(kind || '');
    }

    function isTodayChecked(capId, kind, levels) {
        var key = getTodayCheckKey(capId, kind);
        if (Object.prototype.hasOwnProperty.call(todayChecks, key)) {
            return todayChecks[key] === true;
        }
        /* Derive default from real level — no fake completion. */
        var lv = Schema.normalizeLevel(levels[capId]);
        if (kind === 'sop') return lv >= 1;
        if (kind === 'academic') return lv >= 2;
        if (kind === 'practical') return lv >= 2;
        if (kind === 'quiz') return lv >= 3;
        return false;
    }

    function toggleTodayCheck(capId, kind) {
        var key = getTodayCheckKey(capId, kind);
        var levels = getAbilityLevels();
        var current = isTodayChecked(capId, kind, levels);
        todayChecks[key] = !current;
        requestRerender();
    }

    /** BUG-0015e｜與 renderFunctionPageHeader 同一 shell／safe／inner（40px bar，可點） */
    function renderHeader(title, backAction, opts) {
        opts = opts || {};
        var back = backAction || 'ZdosAcademyUI.back()';
        return (
            '<header class="zdos-workspace-header zdos-app-header zda-header zda-header--official" data-ui="UI-025">' +
                '<div class="zdos-workspace-header-safe" aria-hidden="true"></div>' +
                '<div class="zdos-workspace-header-inner">' +
                    '<button type="button" class="zdos-workspace-back zdos-nav-btn zda-header-back" onclick="' + back + '">' +
                        iconSvg('back') + ' 返回</button>' +
                    '<h1 class="zdos-workspace-title zda-header-title">' + escapeHtml(title) + '</h1>' +
                    '<div class="zdos-workspace-actions"><span aria-hidden="true">&nbsp;</span></div>' +
                '</div>' +
            '</header>'
        );
    }

    function renderSectionHead(title, desc) {
        return (
            '<div class="zda-section-head">' +
                '<h2 class="zda-section-title">' + escapeHtml(title) + '</h2>' +
                (desc ? '<p class="zda-section-desc">' + escapeHtml(desc) + '</p>' : '') +
            '</div>'
        );
    }

    /* —— Home sections（ACADEMY-001 IA）—— */

    /** ① 我的學習狀態 */
    function renderLearningStatus(levels) {
        var stage = resolveLearningStage(levels);
        var stats = stage.stats;
        var today = stage.today;
        var pendingCount = listPendingTraining(levels, 99).length;
        var ctaId = today && today.cap ? today.cap.id : (stage.focusCap ? stage.focusCap.id : 'newbie');
        var ctaLabel = today && today.unlocked ? '繼續學習' : (today && !today.unlocked ? '查看路徑' : '複習能力');

        return (
            '<section class="zda-hero-card zda-status-card" aria-label="我的學習狀態" data-academy="ACADEMY-001">' +
                '<div class="zda-hero-body">' +
                    '<p class="zda-hero-tag">我的學習狀態</p>' +
                    '<div class="zda-status-line">' +
                        renderToneHtml(stage.tone, stage.toneLabel) +
                        '<span class="zda-status-stage">' + escapeHtml(stage.stageLabel) + '</span>' +
                    '</div>' +
                    '<p class="zda-hero-status">' + escapeHtml(stage.nextLabel) + '</p>' +
                    '<div class="zda-hero-metrics">' +
                        '<span class="zda-hero-metric"><em>已完成課程</em><b>' + stats.completed + '</b></span>' +
                        '<span class="zda-hero-metric"><em>待完成訓練</em><b>' + pendingCount + '</b></span>' +
                        '<span class="zda-hero-metric"><em>能力進度</em><b>' + stats.progressPct + '%</b></span>' +
                        '<span class="zda-hero-metric"><em>能力值</em><b>' + stats.abilityPct + '%</b></span>' +
                    '</div>' +
                    '<button type="button" class="zda-cta" onclick="ZdosAcademyUI.openDetail(\'' +
                        escapeHtml(ctaId) + '\')">' + escapeHtml(ctaLabel) + '</button>' +
                '</div>' +
                '<div class="zda-hero-char" aria-hidden="true">' +
                    '<img src="ui/assets/brand/ai-sisi-hero.png" alt="" loading="eager" decoding="async">' +
                '</div>' +
            '</section>'
        );
    }

    /** ② 待完成任務／訓練 */
    function renderPendingTraining(levels) {
        var rows = listPendingTraining(levels, 6);
        var today = resolveTodayLearning(levels);
        var capId = today && today.cap ? today.cap.id : 'newbie';
        var checks = [
            { key: 'sop', label: 'SOP' },
            { key: 'academic', label: '學科' },
            { key: 'practical', label: '術科' },
            { key: 'quiz', label: '測驗' }
        ];
        var checkRows = checks.map(function (it) {
            var on = isTodayChecked(capId, it.key, levels);
            return (
                '<button type="button" class="zda-check-row' + (on ? ' is-done' : '') + '" ' +
                'onclick="ZdosAcademyUI.toggleTodayCheck(\'' + escapeHtml(capId) + '\',\'' + escapeHtml(it.key) + '\')">' +
                    '<span class="zda-check-box" aria-hidden="true">' + (on ? '✓' : '') + '</span>' +
                    '<span class="zda-check-label">' + escapeHtml(it.label) + '</span>' +
                '</button>'
            );
        }).join('');

        var listHtml;
        if (!rows.length) {
            listHtml = '<p class="zda-muted">✅ 目前沒有待完成訓練</p>';
        } else {
            listHtml = '<div class="zda-task-list">' + rows.map(function (row) {
                return (
                    '<button type="button" class="zda-task-row" onclick="ZdosAcademyUI.openDetail(\'' +
                    escapeHtml(row.cap.id) + '\')">' +
                        '<div class="zda-task-main">' +
                            '<p class="zda-task-title">' + escapeHtml(row.cap.name) + '</p>' +
                            '<p class="zda-task-meta">' + escapeHtml(row.reason) + '</p>' +
                        '</div>' +
                        '<div class="zda-task-side">' +
                            renderToneHtml(row.tone, row.toneLabel) +
                            '<span class="zda-task-cta">' + escapeHtml(row.actionLabel) + '</span>' +
                        '</div>' +
                    '</button>'
                );
            }).join('') + '</div>';
        }

        return (
            '<section class="zda-section" id="zda-pending-training" aria-label="待完成任務／訓練">' +
                renderSectionHead('待完成任務／訓練', today && today.cap
                    ? ('最新任務聚焦：' + today.cap.name)
                    : '解鎖後即可開始') +
                '<div class="zda-glass-card zda-today-checks">' +
                    listHtml +
                    '<p class="zda-kicker zda-kicker--mt">今日學習檢查</p>' +
                    '<div class="zda-check-list">' + checkRows + '</div>' +
                '</div>' +
            '</section>'
        );
    }

    /** 訓練↔工作閉環（呈現導航；不改其他中心 SoT） */
    function renderWorkLoopStrip() {
        var hrAction = hostOpenHrCenter();
        return (
            '<section class="zda-section" aria-label="訓練與工作閉環">' +
                renderSectionHead('訓練與工作閉環', '學習 → 現場 → 確認 → 改善 → 教材') +
                '<div class="zda-glass-card zda-loop-card">' +
                    '<ol class="zda-loop-steps">' +
                        '<li><b>學習</b><span>基礎課程／SOP</span></li>' +
                        '<li><b>實際工作</b><span>現場操作應用</span></li>' +
                        '<li><b>能力確認</b><span>主管／等級達標</span></li>' +
                        '<li><b>改善回饋</b><span>經驗沉澱</span></li>' +
                        '<li><b>更新教材</b><span>知識庫傳承</span></li>' +
                    '</ol>' +
                    '<div class="zda-loop-actions">' +
                        '<button type="button" class="zda-cta" onclick="ZdosAcademyUI.openDetail(\'newbie\')">新人路徑</button>' +
                        '<button type="button" class="zda-cta zda-cta--ghost" onclick="' + hrAction + '">人力中心</button>' +
                        '<button type="button" class="zda-cta zda-cta--ghost" onclick="ZdosAcademyUI.openHistory()">成長紀錄</button>' +
                    '</div>' +
                    '<p class="zda-muted zda-loop-note">人力中心發現能力需求 → 學院安排訓練 → 工作應用 → 改善更新教材</p>' +
                '</div>' +
            '</section>'
        );
    }

    /** ③ 課程與 SOP 入口 */
    function renderCourseSopEntries(levels) {
        var sopCard =
            '<div class="zda-entry-grid">' +
                '<button type="button" class="zda-learn-card" onclick="ZdosAcademyUI.openDetail(\'sop\')">' +
                    '<span class="zda-learn-icon" aria-hidden="true">' + iconSvg('schedule') + '</span>' +
                    '<span class="zda-learn-title">門市 SOP</span>' +
                    '<span class="zda-learn-meta">公司標準 · 工作流程</span>' +
                '</button>' +
                '<button type="button" class="zda-learn-card" onclick="ZdosAcademyUI.openMap()">' +
                    '<span class="zda-learn-icon" aria-hidden="true">' + iconSvg('progress') + '</span>' +
                    '<span class="zda-learn-title">能力地圖</span>' +
                    '<span class="zda-learn-meta">學習路徑全覽</span>' +
                '</button>' +
            '</div>';
        return (
            '<section class="zda-section" aria-label="課程與 SOP 入口">' +
                renderSectionHead('課程與 SOP 入口', '依職能進入 · 不是下載中心') +
                sopCard +
                '<p class="zda-kicker zda-kicker--mt">課程分類</p>' +
                renderLearningCategoryGrid(levels) +
            '</section>'
        );
    }

    /** ④ 能力成長紀錄 */
    function renderGrowthRecords(levels) {
        var recent = listRecentlyCompleted(levels, 5);
        var split = listObtainedAndPending(levels);
        var recentHtml;
        if (!recent.length) {
            recentHtml = '<p class="zda-muted">尚無已達標能力紀錄</p>';
        } else {
            recentHtml = '<ul class="zda-history-list">' + recent.map(function (row) {
                return (
                    '<li><button type="button" class="zda-history-row" onclick="ZdosAcademyUI.openDetail(\'' +
                    escapeHtml(row.cap.id) + '\')">' +
                        '<span>' + escapeHtml(row.cap.name) + '</span>' +
                        '<em>' + escapeHtml(levelLabel(row.level)) + ' · 已完成</em>' +
                    '</button></li>'
                );
            }).join('') + '</ul>';
        }
        var pendingPills = split.pending.slice(0, 4).map(function (c) {
            return '<span class="zda-pill is-pending">' + escapeHtml(c.name) + '</span>';
        }).join('');

        return (
            '<section class="zda-section" aria-label="能力成長紀錄">' +
                renderSectionHead('能力成長紀錄', '達標歷程 · 資格狀態') +
                '<div class="zda-glass-card">' +
                    '<p class="zda-kicker">近期達標</p>' +
                    recentHtml +
                    '<p class="zda-kicker zda-kicker--mt">待補訓</p>' +
                    '<div class="zda-pill-row">' + (pendingPills || '<span class="zda-muted">無</span>') + '</div>' +
                    '<button type="button" class="zda-cta zda-cta--block" onclick="ZdosAcademyUI.openHistory()">查看完整歷程</button>' +
                '</div>' +
            '</section>'
        );
    }

    /** ⑤ 知識庫／案例（傳承層，非檔案牆） */
    function renderKnowledgeBank(levels) {
        var today = resolveTodayLearning(levels);
        var focusId = today && today.cap ? today.cap.id : 'sop';
        var items = [
            { label: 'SOP／工作標準', meta: '傳承公司標準', onclick: 'ZdosAcademyUI.openDetail(\'sop\')' },
            { label: '教學文件', meta: '依能力掛載教材', onclick: 'ZdosAcademyUI.openDetail(\'' + escapeHtml(focusId) + '\',\'materials\')' },
            { label: '改善案例', meta: '事件 → 原因 → 改善 → 教材', onclick: 'ZdosAcademyUI.openMaterials()' },
            { label: '現場經驗', meta: '將改善轉為新人訓練', onclick: 'ZdosAcademyUI.openHistory()' }
        ];
        var cards = items.map(function (it) {
            return (
                '<button type="button" class="zda-know-card" onclick="' + it.onclick + '">' +
                    '<span class="zda-know-title">' + escapeHtml(it.label) + '</span>' +
                    '<span class="zda-know-meta">' + escapeHtml(it.meta) + '</span>' +
                '</button>'
            );
        }).join('');

        return (
            '<section class="zda-section" aria-label="知識庫／案例">' +
                renderSectionHead('知識庫／案例', '今天的改善 → 明天的標準') +
                '<div class="zda-know-grid">' + cards + '</div>' +
                '<p class="zda-muted" style="margin:0.55rem 0 0;font-size:0.72rem;text-align:center;">學院不是下載中心 — 知識為了能在工作中使用與傳承</p>' +
            '</section>'
        );
    }

    function renderTodayLearning(levels) {
        /* 保留函式供其他畫面／相容；首屏改由 renderPendingTraining 承接 */
        return renderPendingTraining(levels);
    }

    function renderMyAbility(levels) {
        /* 相容保留：能力摘要已併入學習狀態／成長紀錄 */
        return renderGrowthRecords(levels);
    }

    function renderAbilityMapNodes(levels) {
        var nodes = '';
        for (var i = 0; i < CAREER_PATH_IDS.length; i++) {
            var id = CAREER_PATH_IDS[i];
            var cap = Registry.getCapability(id);
            if (!cap) continue;
            var lv = Schema.normalizeLevel(levels[id]);
            var unlocked = isCapUnlocked(levels, id);
            var done = lv >= Prereq.UNLOCK_LEVEL;
            var state = done ? 'is-done' : (unlocked ? 'is-open' : 'is-locked');
            nodes +=
                (i > 0 ? '<div class="zda-map-edge" aria-hidden="true"></div>' : '') +
                '<button type="button" class="zda-map-node ' + state + '" ' +
                'onclick="ZdosAcademyUI.openDetail(\'' + escapeHtml(id) + '\')">' +
                    '<span class="zda-map-dot" aria-hidden="true"></span>' +
                    '<span class="zda-map-node-name">' + escapeHtml(cap.name) + '</span>' +
                    '<span class="zda-map-node-meta">' +
                        (done ? '已取得' : (unlocked ? escapeHtml(levelLabel(lv)) : '未解鎖')) +
                    '</span>' +
                '</button>';
        }
        return (
            '<section class="zda-section" id="zda-ability-map" aria-label="能力地圖">' +
                renderSectionHead('能力地圖', '點選節點進入能力頁') +
                '<div class="zda-glass-card zda-map-path">' + nodes + '</div>' +
            '</section>'
        );
    }

    function renderLearningCategoryGrid(levels) {
        var cats = Registry.listCategories();
        var cards = '';
        for (var i = 0; i < cats.length; i++) {
            var cat = cats[i];
            var unlocked = 0;
            for (var j = 0; j < cat.items.length; j++) {
                if (isCapUnlocked(levels, cat.items[j].id)) unlocked += 1;
            }
            cards +=
                '<button type="button" class="zda-learn-card" onclick="ZdosAcademyUI.openList(\'' +
                escapeHtml(cat.id) + '\')">' +
                    '<span class="zda-learn-icon" aria-hidden="true">' +
                        iconSvg(categoryIconKey(cat.id)) +
                    '</span>' +
                    '<span class="zda-learn-title">' + escapeHtml(cat.title) + '</span>' +
                    '<span class="zda-learn-meta">已解鎖 ' + unlocked + '/' + cat.items.length + '</span>' +
                '</button>';
        }
        return '<div class="zda-learn-grid">' + cards + '</div>';
    }

    function renderLearningCenter(levels) {
        return (
            '<section class="zda-section" aria-label="學習中心">' +
                renderSectionHead('學習中心', '依職能分類進入') +
                renderLearningCategoryGrid(levels) +
            '</section>'
        );
    }

    function renderLatestMaterials(levels) {
        var today = resolveTodayLearning(levels);
        var focus = today && today.cap ? today.cap : Registry.getCapability('newbie');
        var types = [
            { key: 'pdf', label: 'PDF' },
            { key: 'video', label: '影片' },
            { key: 'image', label: '圖片' },
            { key: 'doc', label: '文件' }
        ];
        var cards = types.map(function (t) {
            return (
                '<button type="button" class="zda-mat-card" ' +
                'onclick="ZdosAcademyUI.openDetail(\'' + escapeHtml(focus ? focus.id : 'newbie') +
                '\',\'materials\')">' +
                    '<span class="zda-mat-type">' + escapeHtml(t.label) + '</span>' +
                    '<span class="zda-mat-name">' + escapeHtml(focus ? focus.name : '教材') + '</span>' +
                    '<span class="zda-mat-meta">進入能力教材</span>' +
                '</button>'
            );
        }).join('');

        return (
            '<section class="zda-section" aria-label="最新教材">' +
                renderSectionHead('最新教材', '支援 PDF · 影片 · 圖片 · 文件') +
                '<div class="zda-mat-grid">' + cards + '</div>' +
            '</section>'
        );
    }

    function renderMyCertificates(levels) {
        var split = listObtainedAndPending(levels);
        var got = split.obtained.slice(0, 8).map(function (c) {
            return '<li class="zda-cert-item is-ok"><span>' + escapeHtml(c.name) + '</span><em>已取得</em></li>';
        }).join('');
        var pending = split.pending.slice(0, 4).map(function (c) {
            return '<li class="zda-cert-item is-pending"><span>' + escapeHtml(c.name) + '</span><em>待補訓</em></li>';
        }).join('');
        var ver = Version.getVersionInfo();

        return (
            '<section class="zda-section" aria-label="我的證照">' +
                renderSectionHead('我的證照', '資格狀態 · Framework v' + escapeHtml(ver.frameworkVersion)) +
                '<div class="zda-glass-card">' +
                    '<p class="zda-kicker">已取得資格</p>' +
                    '<ul class="zda-cert-list">' + (got || '<li class="zda-muted">尚無</li>') + '</ul>' +
                    '<p class="zda-kicker zda-kicker--mt">失效資格</p>' +
                    '<p class="zda-muted">目前無失效資格</p>' +
                    '<p class="zda-kicker zda-kicker--mt">待補訓</p>' +
                    '<ul class="zda-cert-list">' + (pending || '<li class="zda-muted">無</li>') + '</ul>' +
                '</div>' +
            '</section>'
        );
    }

    function renderQuickEntries() {
        var items = [
            { label: '教材中心', icon: 'academy', onclick: 'ZdosAcademyUI.openMaterials()' },
            { label: 'SOP', icon: 'schedule', onclick: 'ZdosAcademyUI.openDetail(\'sop\')' },
            { label: '測驗', icon: 'check', onclick: 'ZdosAcademyUI.openDetail(\'product\',\'quiz\')' },
            { label: '能力地圖', icon: 'progress', onclick: 'ZdosAcademyUI.openMap()' },
            { label: '歷程', icon: 'people', onclick: 'ZdosAcademyUI.openHistory()' }
        ];
        var btns = items.map(function (it) {
            return (
                '<button type="button" class="zda-quick-btn" onclick="' + it.onclick + '">' +
                    '<span class="zda-quick-icon" aria-hidden="true">' + iconSvg(it.icon) + '</span>' +
                    '<span class="zda-quick-label">' + escapeHtml(it.label) + '</span>' +
                '</button>'
            );
        }).join('');

        return (
            '<section class="zda-section" aria-label="快速入口">' +
                renderSectionHead('快速入口', '') +
                '<div class="zda-quick-grid">' + btns + '</div>' +
            '</section>'
        );
    }

    function renderHome(levels) {
        return (
            renderHeader('學院中心', 'ZdosAcademyUI.requestHome()', {
                subtitle: '人才培育與知識傳承'
            }) +
            '<div class="zda-stack" data-academy="ACADEMY-001">' +
                renderLearningStatus(levels) +
                renderPendingTraining(levels) +
                renderWorkLoopStrip() +
                renderCourseSopEntries(levels) +
                renderGrowthRecords(levels) +
                renderKnowledgeBank(levels) +
            '</div>'
        );
    }

    function renderMapScreen(levels) {
        return (
            renderHeader('能力地圖', 'ZdosAcademyUI.goHome()', { subtitle: '成長路徑' }) +
            '<div class="zda-stack">' + renderAbilityMapNodes(levels) + '</div>'
        );
    }

    function renderMaterialsScreen(levels) {
        return (
            renderHeader('教材中心', 'ZdosAcademyUI.goHome()', { subtitle: 'PDF · 影片 · 圖片 · 文件' }) +
            '<div class="zda-stack">' + renderLatestMaterials(levels) + renderLearningCenter(levels) + '</div>'
        );
    }

    function renderHistoryScreen(levels) {
        var rows = listRecentlyCompleted(levels, 12);
        var body = '';
        if (!rows.length) {
            body = '<div class="zda-glass-card"><p class="zda-muted">尚無已達標能力歷程</p></div>';
        } else {
            body = '<ul class="zda-history-list">';
            for (var i = 0; i < rows.length; i++) {
                var row = rows[i];
                body +=
                    '<li><button type="button" class="zda-history-row" onclick="ZdosAcademyUI.openDetail(\'' +
                    escapeHtml(row.cap.id) + '\')">' +
                        '<span>' + escapeHtml(row.cap.name) + '</span>' +
                        '<em>' + escapeHtml(levelLabel(row.level)) + '</em>' +
                    '</button></li>';
            }
            body += '</ul>';
        }
        return (
            renderHeader('學習歷程', 'ZdosAcademyUI.goHome()', { subtitle: '已取得能力' }) +
            '<div class="zda-stack">' +
                '<section class="zda-section">' + renderSectionHead('歷程', '') +
                '<div class="zda-glass-card">' + body + '</div></section>' +
            '</div>'
        );
    }

    function listCapabilities(categoryId) {
        if (categoryId) {
            var cat = Registry.getCategory(categoryId);
            if (!cat) return [];
            var out = [];
            for (var i = 0; i < cat.items.length; i++) {
                var item = cat.items[i];
                out.push({
                    id: item.id,
                    name: item.name,
                    desc: item.desc,
                    categoryId: cat.id,
                    categoryTitle: cat.title
                });
            }
            return out;
        }
        return Registry.getAllCapabilities();
    }

    function renderList(levels) {
        var categoryId = uiState.categoryId;
        var cat = categoryId ? Registry.getCategory(categoryId) : null;
        var title = cat ? cat.title : '全部能力';
        var caps = listCapabilities(categoryId);
        var rows = '';
        for (var i = 0; i < caps.length; i++) {
            var c = caps[i];
            var unlocked = isCapUnlocked(levels, c.id);
            var lv = Schema.normalizeLevel(levels[c.id]);
            rows +=
                '<button type="button" class="zda-cap-row' + (unlocked ? '' : ' is-locked') + '" ' +
                'onclick="ZdosAcademyUI.openDetail(\'' + escapeHtml(c.id) + '\')">' +
                    '<span class="zda-cap-main">' +
                        '<span class="zda-cap-name">' + escapeHtml(c.name) + '</span>' +
                        '<span class="zda-cap-desc">' + escapeHtml(c.desc || '') + '</span>' +
                        '<span class="zda-cap-meta">' + escapeHtml(levelLabel(lv)) + '</span>' +
                    '</span>' +
                    '<span class="zda-cap-flag">' + (unlocked ? (lv >= Prereq.UNLOCK_LEVEL ? '已取得' : '學習中') : '未解鎖') + '</span>' +
                '</button>';
        }
        if (!rows) rows = '<p class="zda-muted">此分類尚無能力項目。</p>';

        return (
            renderHeader(title, 'ZdosAcademyUI.goHome()', { subtitle: '學習中心' }) +
            '<div class="zda-stack">' +
                '<div class="zda-glass-card zda-cap-list">' + rows + '</div>' +
            '</div>'
        );
    }

    function renderDetailBlock(title, bodyHtml, id) {
        return (
            '<section class="zda-glass-card zda-detail-block" id="zda-block-' + escapeHtml(id) + '" aria-label="' + escapeHtml(title) + '">' +
                '<h3 class="zda-detail-block-title">' + escapeHtml(title) + '</h3>' +
                bodyHtml +
            '</section>'
        );
    }

    function renderDetail(levels) {
        var id = uiState.capabilityId;
        var cap = Registry.getCapability(id);
        if (!cap) {
            return (
                renderHeader('能力詳情', 'ZdosAcademyUI.goHome()', { subtitle: '' }) +
                '<div class="zda-stack"><p class="zda-muted">找不到此能力。</p></div>'
            );
        }
        var unlocked = isCapUnlocked(levels, id);
        var lv = Schema.normalizeLevel(levels[id]);
        var missing = Prereq.getMissingPrerequisites(levels, id);
        var prereqIds = Prereq.getPrerequisites(id);
        var ver = Version.getVersionInfo();
        var back = uiState.categoryId
            ? 'ZdosAcademyUI.openList(\'' + escapeHtml(uiState.categoryId) + '\')'
            : 'ZdosAcademyUI.goHome()';

        var prereqHtml = '';
        if (!prereqIds.length) {
            prereqHtml = '<p class="zda-muted">無前置能力。</p>';
        } else {
            prereqHtml = '<ul class="zda-prereq-list">';
            for (var i = 0; i < prereqIds.length; i++) {
                var pid = prereqIds[i];
                var meta = Registry.getCapability(pid);
                var plv = Schema.normalizeLevel(levels[pid]);
                var met = plv >= Prereq.UNLOCK_LEVEL;
                prereqHtml +=
                    '<li class="' + (met ? 'is-met' : 'is-missing') + '">' +
                        '<button type="button" onclick="ZdosAcademyUI.openDetail(\'' + escapeHtml(pid) + '\')">' +
                            escapeHtml(meta ? meta.name : pid) +
                            ' · ' + escapeHtml(levelLabel(plv)) +
                        '</button>' +
                    '</li>';
            }
            prereqHtml += '</ul>';
            if (!unlocked && missing.length) {
                prereqHtml += '<p class="zda-lock-note">尚需完成 ' + missing.length + ' 項前置達標。</p>';
            }
        }

        var materialsHtml =
            '<div class="zda-mat-grid zda-mat-grid--detail">' +
                ['PDF', '影片', '圖片', '文件'].map(function (t) {
                    return '<div class="zda-mat-card is-static"><span class="zda-mat-type">' +
                        escapeHtml(t) + '</span><span class="zda-mat-meta">教材區（待內容掛載）</span></div>';
                }).join('') +
            '</div>';

        var academicHtml =
            '<ul class="zda-simple-list">' +
                '<li>題庫 · 待掛載</li>' +
                '<li>測驗 · 待掛載</li>' +
                '<li>成績 · 依既有能力等級顯示：' + escapeHtml(levelLabel(lv)) + '</li>' +
            '</ul>';

        var practicalHtml =
            '<div class="zda-rubric">' +
                ['衛生', '速度', '品質', '流程', '火候'].map(function (d) {
                    return '<div class="zda-rubric-item"><em>' + escapeHtml(d) + '</em><b>—</b></div>';
                }).join('') +
            '</div>' +
            '<p class="zda-muted">主管評分介面 · 不改動評核 Engine</p>';

        var internHtml =
            '<p class="zda-muted">完成份數：—</p>' +
            '<p class="zda-muted">主管確認：' + (lv >= Prereq.UNLOCK_LEVEL ? '已達標視同確認' : '待確認') + '</p>';

        var examHtml =
            '<div class="zda-exam-status ' + (lv >= Prereq.UNLOCK_LEVEL ? 'is-pass' : 'is-fail') + '">' +
                (lv >= Prereq.UNLOCK_LEVEL ? '合格' : '不合格／尚未達標') +
            '</div>';

        var qualifyHtml =
            '<p>' + (lv >= Prereq.UNLOCK_LEVEL
                ? '已取得「' + escapeHtml(cap.name) + '」資格'
                : '尚未取得資格') + '</p>';

        var versionHtml =
            '<p class="zda-version-line">' + escapeHtml(cap.name) + ' · v' +
            escapeHtml(ver.frameworkVersion) + '</p>' +
            '<p class="zda-muted">若新版發布，將通知需補訓（Version Engine）。</p>';

        return (
            renderHeader(cap.name, back, { subtitle: cap.categoryTitle }) +
            '<div class="zda-stack">' +
                renderDetailBlock('能力介紹',
                    '<p class="zda-detail-desc">' + escapeHtml(cap.desc || '') + '</p>' +
                    '<p class="zda-detail-level">目前等級：' + escapeHtml(levelLabel(lv)) +
                    ' · ' + (unlocked ? '已解鎖' : '未解鎖') + '</p>',
                    'intro') +
                renderDetailBlock('前置能力', prereqHtml, 'prereq') +
                renderDetailBlock('教材', materialsHtml, 'materials') +
                renderDetailBlock('影片', '<p class="zda-muted">影片教材區（待內容掛載）</p>', 'video') +
                renderDetailBlock('SOP', '<p class="zda-muted">SOP 標準流程區（待內容掛載）</p>' +
                    (cap.id === 'sop' ? '<p>此能力即為門市 SOP 主軸。</p>' : ''), 'sop') +
                renderDetailBlock('學科', academicHtml, 'quiz') +
                renderDetailBlock('術科', practicalHtml, 'practical') +
                renderDetailBlock('實習', internHtml, 'intern') +
                renderDetailBlock('考核', examHtml, 'exam') +
                renderDetailBlock('取得資格', qualifyHtml, 'qualify') +
                renderDetailBlock('版本', versionHtml, 'version') +
            '</div>'
        );
    }

    function renderZdAcademy(root, opts) {
        opts = opts || {};
        if (!root) return false;
        if (!canAccessZdAcademy()) {
            if (typeof opts.onDenied === 'function') opts.onDenied();
            else denyToast('請先登入');
            return false;
        }

        var levels = getAbilityLevels();
        var body = '';
        if (uiState.screen === 'list') body = renderList(levels);
        else if (uiState.screen === 'detail') body = renderDetail(levels);
        else if (uiState.screen === 'map') body = renderMapScreen(levels);
        else if (uiState.screen === 'materials') body = renderMaterialsScreen(levels);
        else if (uiState.screen === 'history') body = renderHistoryScreen(levels);
        else body = renderHome(levels);

        /* BUG-0015d｜學院頁納入共用 Function Header shell（zdos-fn-shell） */
        var headerMatch = String(body || '').match(/^(<header[\s\S]*?<\/header>)([\s\S]*)$/);
        var headerHtml = headerMatch ? headerMatch[1] : '';
        var contentHtml = headerMatch ? headerMatch[2] : body;
        root.innerHTML =
            '<div class="zdos-workspace zdos-fn-shell w-full min-w-0 max-w-lg mx-auto px-2 pt-0 pb-3 font-sans">' +
                headerHtml +
                '<div class="zdos-workspace-body zdos-view-body">' +
                    '<div data-zdos-zd-academy-page="1" data-ui="UI-025" data-zcx="UI-025" data-academy="ACADEMY-001" class="zcx-page zda-page zda-page--official">' +
                        contentHtml +
                    '</div>' +
                '</div>' +
            '</div>';

        if (uiState.screen === 'detail' && uiState.detailSection) {
            try {
                var el = root.querySelector('#zda-block-' + uiState.detailSection);
                if (el && el.scrollIntoView) {
                    global.requestAnimationFrame(function () {
                        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    });
                }
            } catch (_) { /* ignore */ }
        }
        return true;
    }

    function openZdAcademy() {
        if (!canAccessZdAcademy()) {
            denyToast('請先登入');
            return false;
        }
        resetUiState();
        return navigateToAcademy();
    }

    function renderEntryHtml() {
        if (!canAccessZdAcademy()) return '';
        return (
            '<button type="button" data-zdos-zd-academy-entry="1" onclick="openZdAcademy()" ' +
            'class="zdos-nav-btn zdos-home-card zdos-home-ops-card zda-entry-card">' +
                '<div class="zdos-home-ops-card-top"><span class="zdos-home-ops-icon zda-entry-icon">' +
                iconSvg('academy') +
                '</span><span class="zdos-home-ops-arrow">' + iconSvg('arrow') + '</span></div>' +
                '<h3 class="zdos-home-ops-title">學院中心</h3>' +
                '<p class="zdos-home-ops-desc">學習狀態 · 訓練閉環 · 知識傳承</p>' +
            '</button>'
        );
    }

    function renderMobileEntryHtml() {
        if (!canAccessZdAcademy()) return '';
        return (
            '<button type="button" data-zdos-zd-academy-entry="1" class="zdos-mh__quick-btn" onclick="openZdAcademy()">' +
                '<span class="zdos-mh__quick-icon" aria-hidden="true">' + iconSvg('academy') + '</span>' +
                '<span class="zdos-mh__quick-label">學院</span>' +
            '</button>'
        );
    }

    function openPreview() {
        if (!isDevPreviewHost()) {
            return { ok: false, reason: 'not-preview-host' };
        }
        setFlagForDev(true);
        resetUiState();
        var opened = openZdAcademy();
        return { ok: opened === true, status: status() };
    }

    function renderPreviewEntryHtml() {
        if (!isDevPreviewHost()) return '';
        return (
            '<button type="button" data-zdos-zd-academy-preview="1" onclick="openZdAcademyPreview()" ' +
            'class="zdos-nav-btn zdos-home-card zdos-home-ops-card zda-entry-card zda-preview-entry">' +
                '<div class="zdos-home-ops-card-top"><span class="zdos-home-ops-icon zda-entry-icon">' +
                iconSvg('preview') +
                '</span><span class="zdos-home-ops-arrow">' + iconSvg('arrow') + '</span></div>' +
                '<h3 class="zdos-home-ops-title">Academy Preview</h3>' +
                '<p class="zdos-home-ops-desc">本機預覽 · 重新整理即關閉</p>' +
            '</button>'
        );
    }

    function renderMobilePreviewEntryHtml() {
        if (!isDevPreviewHost()) return '';
        return (
            '<button type="button" data-zdos-zd-academy-preview="1" class="zdos-mh__quick-btn" onclick="openZdAcademyPreview()">' +
                '<span class="zdos-mh__quick-icon" aria-hidden="true">' + iconSvg('preview') + '</span>' +
                '<span class="zdos-mh__quick-label">Academy Preview</span>' +
            '</button>'
        );
    }

    function status() {
        return {
            flag: FLAG_NAME,
            flagEnabled: isFlagEnabled(),
            localDev: isLocalDevHost(),
            previewHost: isDevPreviewHost(),
            canAccess: canAccessZdAcademy(),
            screen: uiState.screen,
            categoryId: uiState.categoryId,
            capabilityId: uiState.capabilityId,
            build: BUILD_ID,
            frameworkVersion: Version.FRAMEWORK_VERSION,
            capabilityCount: Registry.listCapabilityIds().length
        };
    }

    var Dev = {
        enable: function () {
            if (!isLocalDevHost()) return { ok: false, reason: 'non-local' };
            setFlagForDev(true);
            return status();
        },
        disable: function () {
            if (!isLocalDevHost()) return { ok: false, reason: 'non-local' };
            setFlagForDev(false);
            resetUiState();
            return status();
        },
        open: function () {
            if (!isLocalDevHost()) return { ok: false, reason: 'non-local' };
            setFlagForDev(true);
            resetUiState();
            var opened = openZdAcademy();
            return { ok: opened, status: status() };
        },
        preview: openPreview,
        status: status
    };

    function runZdosAcademyUiAcceptance() {
        var results = [];
        function check(name, cond, detail) {
            results.push({ name: name, pass: !!cond, detail: detail || '' });
        }

        var prevFlag = flagEnabled;
        var prevState = {
            screen: uiState.screen,
            categoryId: uiState.categoryId,
            capabilityId: uiState.capabilityId
        };

        check('registry wired', Registry.listCapabilityIds().length === 12);
        setFlagForDev(true);
        attachHostBridge({
            isLoggedIn: function () { return true; },
            getAbilityLevels: function () { return {}; },
            showToast: function () {},
            navigateToAcademy: function () {},
            navigateHome: function () {},
            rerender: function () {}
        });

        check('access with flag+login', canAccessZdAcademy() === true);
        var host = global.document ? global.document.createElement('div') : { innerHTML: '' };
        resetUiState();
        var homeOk = renderZdAcademy(host);
        check('home render', homeOk === true);
        check('home hero', /AI 絲絲|今日學習建議/.test(host.innerHTML));
        check('home my ability', /我的能力/.test(host.innerHTML));
        check('home today', /今日學習/.test(host.innerHTML) && /SOP/.test(host.innerHTML));
        check('home map', /能力地圖/.test(host.innerHTML) && /新人訓練/.test(host.innerHTML));
        check('home learning', /學習中心/.test(host.innerHTML));
        check('home materials', /最新教材/.test(host.innerHTML));
        check('home certs', /我的證照/.test(host.innerHTML));
        check('home quick', /快速入口/.test(host.innerHTML));

        uiState.screen = 'detail';
        uiState.capabilityId = 'sop';
        renderZdAcademy(host);
        check('detail sections', /能力介紹/.test(host.innerHTML) && /前置能力/.test(host.innerHTML));
        check('detail materials', /教材/.test(host.innerHTML) && /學科/.test(host.innerHTML));
        check('detail practical', /術科/.test(host.innerHTML) && /考核/.test(host.innerHTML));
        check('detail version', /版本/.test(host.innerHTML) && /v1\.0\.0/.test(host.innerHTML));

        flagEnabled = prevFlag;
        uiState.screen = prevState.screen;
        uiState.categoryId = prevState.categoryId;
        uiState.capabilityId = prevState.capabilityId;
        attachHostBridge(null);

        var failed = results.filter(function (r) { return !r.pass; });
        var report = {
            ok: failed.length === 0,
            passed: results.length - failed.length,
            failed: failed.length,
            results: results
        };
        if (typeof console !== 'undefined' && console.log) {
            console.log('[UI-025 Academy Acceptance]', report.ok ? 'PASS' : 'FAIL', report);
        }
        return report;
    }

    global.ZdosAcademyUI = Object.freeze({
        FLAG_NAME: FLAG_NAME,
        BUILD_ID: BUILD_ID,
        attachHostBridge: attachHostBridge,
        canAccessZdAcademy: canAccessZdAcademy,
        isFlagEnabled: isFlagEnabled,
        isDevPreviewHost: isDevPreviewHost,
        openZdAcademy: openZdAcademy,
        openPreview: openPreview,
        renderZdAcademy: renderZdAcademy,
        renderEntryHtml: renderEntryHtml,
        renderMobileEntryHtml: renderMobileEntryHtml,
        renderPreviewEntryHtml: renderPreviewEntryHtml,
        renderMobilePreviewEntryHtml: renderMobilePreviewEntryHtml,
        goHome: goHome,
        openList: goList,
        openDetail: goDetail,
        openMap: goMap,
        openMaterials: goMaterials,
        openHistory: goHistory,
        toggleTodayCheck: toggleTodayCheck,
        requestHome: requestHome,
        back: function () {
            if (uiState.screen === 'detail') {
                if (uiState.categoryId) goList(uiState.categoryId);
                else goHome();
                return;
            }
            if (uiState.screen === 'list' || uiState.screen === 'map' ||
                uiState.screen === 'materials' || uiState.screen === 'history') {
                goHome();
                return;
            }
            requestHome();
        },
        getUiState: function () {
            return {
                screen: uiState.screen,
                categoryId: uiState.categoryId,
                capabilityId: uiState.capabilityId,
                detailSection: uiState.detailSection
            };
        }
    });

    global.openZdAcademy = function () {
        return openZdAcademy();
    };

    global.openZdAcademyPreview = function () {
        return openPreview();
    };

    global.ZdosAcademyUiDev = Dev;
    global.runZdosAcademyUiAcceptance = runZdosAcademyUiAcceptance;
})(typeof window !== 'undefined' ? window : globalThis);
