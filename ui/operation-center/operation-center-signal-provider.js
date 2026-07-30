/**
 * UI-002 Phase 4–5 | Operation Center Signal Engine (registry-driven rules)
 */
(function (global) {
    'use strict';

    var Registry = global.ZDOSOperationCenterSignalRegistry;

    var LEVEL_CRITICAL = 'critical';
    var LEVEL_WARNING = 'warning';
    var LEVEL_INFO = 'info';

    function fallbackLevels() {
        return {
            CRITICAL: LEVEL_CRITICAL,
            WARNING: LEVEL_WARNING,
            INFO: LEVEL_INFO
        };
    }

    function getEntries() {
        if (Registry && Array.isArray(Registry.ENTRIES)) {
            return Registry.ENTRIES;
        }
        return [];
    }

    function levelRank(level) {
        if (level === LEVEL_CRITICAL) return 3;
        if (level === LEVEL_WARNING) return 2;
        return 1;
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function createSignalFromEntry(entry, input) {
        return {
            id: entry.id,
            level: entry.level,
            source: entry.source,
            title: entry.title,
            message: typeof entry.message === 'function' ? entry.message(input) : '',
            createdAt: nowIso(),
            priority: entry.priority,
            registryVersion: Registry ? Registry.REGISTRY_VERSION : null
        };
    }

    function buildSignalInput(ctx, data) {
        var cards = data && data.kpiCards ? data.kpiCards : [];
        var salesCard = null;
        var notifCard = null;
        cards.forEach(function (k) {
            if (k.id === 'sales') salesCard = k;
            if (k.id === 'notifications') notifCard = k;
        });

        var salesHasReportsToday = !!(salesCard && !salesCard.empty);
        var unread = 0;
        if (notifCard && !notifCard.empty) {
            var parsed = parseInt(String(notifCard.value || ''), 10);
            unread = Number.isFinite(parsed) ? parsed : 0;
        } else if (ctx && Number.isFinite(Number(ctx.unreadAnnouncementCount))) {
            unread = Number(ctx.unreadAnnouncementCount);
        }

        return {
            storeName: String(ctx && ctx.storeName || '').trim(),
            canReviewSales: !!(ctx && ctx.canReviewSales),
            pendingSalesReviewCount: Number(ctx && ctx.pendingSalesReviewCount) || 0,
            salesHasReportsToday: salesHasReportsToday,
            unreadNotificationCount: unread,
            workforceMetrics: ctx && ctx._workforceMetrics ? ctx._workforceMetrics : null
        };
    }

    function evaluateSignals(input) {
        input = input || {};
        var signals = [];
        getEntries().forEach(function (entry) {
            try {
                if (entry.when && entry.when(input)) {
                    signals.push(createSignalFromEntry(entry, input));
                }
            } catch (err) {
                console.error('[ZDOS OC Signal]', entry.id, err);
            }
        });

        signals.sort(function (a, b) {
            var tier = levelRank(b.level) - levelRank(a.level);
            if (tier !== 0) return tier;
            return (b.priority || 0) - (a.priority || 0);
        });

        return signals;
    }

    function pickPrimarySignal(signals) {
        if (!signals || !signals.length) return null;
        return signals[0];
    }

    function mapSignalToOperationStatus(signal) {
        if (!signal) {
            return { level: 'ok', message: '今日營運正常' };
        }
        var entry = Registry && Registry.getRegistryEntry
            ? Registry.getRegistryEntry(signal.id)
            : null;
        var statusText = entry && entry.statusMessage
            ? entry.statusMessage
            : signal.title;

        if (signal.level === LEVEL_CRITICAL) {
            return { level: 'alert', message: statusText };
        }
        if (signal.level === LEVEL_WARNING) {
            return { level: 'warn', message: statusText };
        }
        return { level: 'ok', message: '今日營運正常' };
    }

    function mapSignalToCopilot(signal) {
        if (!signal) {
            return {
                label: 'Operation Copilot',
                headline: '目前無主動提醒',
                body: '系統未偵測到需優先處理的營運事項。',
                actionLabel: null,
                empty: true,
                signalId: null,
                registryVersion: Registry ? Registry.REGISTRY_VERSION : null
            };
        }
        return {
            label: 'Operation Copilot',
            headline: signal.title,
            body: signal.message,
            actionLabel: '查看詳情',
            empty: false,
            signalId: signal.id,
            registryVersion: signal.registryVersion || (Registry ? Registry.REGISTRY_VERSION : null)
        };
    }

    function applySignalsToSnapshot(data, ctx) {
        if (!data) return [];
        var input = buildSignalInput(ctx, data);
        var signals = evaluateSignals(input);
        var primary = pickPrimarySignal(signals);

        data.operationSignals = signals;
        data.operationStatus = mapSignalToOperationStatus(primary);
        data.copilotMessage = mapSignalToCopilot(primary);
        data.signalRegistryVersion = Registry ? Registry.REGISTRY_VERSION : null;

        return signals;
    }

    var levels = fallbackLevels();

    global.ZDOSOperationCenterSignalProvider = {
        LEVEL_CRITICAL: Registry ? Registry.LEVEL_CRITICAL : levels.CRITICAL,
        LEVEL_WARNING: Registry ? Registry.LEVEL_WARNING : levels.WARNING,
        LEVEL_INFO: Registry ? Registry.LEVEL_INFO : levels.INFO,
        buildSignalInput: buildSignalInput,
        evaluateSignals: evaluateSignals,
        pickPrimarySignal: pickPrimarySignal,
        applySignalsToSnapshot: applySignalsToSnapshot
    };
})(typeof window !== 'undefined' ? window : globalThis);
