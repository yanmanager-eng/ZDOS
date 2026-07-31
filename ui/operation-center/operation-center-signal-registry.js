/**
 * UI-002 Phase 5 | Operation Center Signal Registry (canonical catalog)
 * Single source for signal metadata; rules stay deterministic (no LLM).
 */
(function (global) {
    'use strict';

    var REGISTRY_VERSION = '1.0.0';

    var LEVEL_CRITICAL = 'critical';
    var LEVEL_WARNING = 'warning';
    var LEVEL_INFO = 'info';

    var SOURCE_SALES = 'sales';
    var SOURCE_NOTIFICATIONS = 'notifications';
    var SOURCE_WORKFORCE = 'workforce';

    /**
     * @typedef {Object} SignalRegistryEntry
     * @property {string} id
     * @property {string} level
     * @property {string} source
     * @property {number} priority
     * @property {string} statusMessage
     * @property {string} title
     * @property {function(Object): boolean} when
     * @property {function(Object): string} message
     * @property {{ llmParaphraseAllowed: boolean, includeInAiContext: boolean, containsPii: boolean }} ai
     */

    var ENTRIES = [
        {
            id: 'sales-pending-review',
            level: LEVEL_CRITICAL,
            source: SOURCE_SALES,
            priority: 300,
            statusMessage: '今日有待核對業績',
            title: '待核對業績',
            when: function (input) {
                return !!(input && input.canReviewSales && input.pendingSalesReviewCount > 0);
            },
            message: function (input) {
                var n = Number(input && input.pendingSalesReviewCount) || 0;
                return '尚有 ' + n + ' 筆業績待核對，建議優先處理以免影響結帳。';
            },
            ai: {
                llmParaphraseAllowed: true,
                includeInAiContext: true,
                containsPii: false
            }
        },
        {
            id: 'sales-missing-today',
            level: LEVEL_WARNING,
            source: SOURCE_SALES,
            priority: 290,
            statusMessage: '今日尚需完成業績回報',
            title: '今日業績回報',
            when: function (input) {
                return !!(input && input.storeName && !input.salesHasReportsToday);
            },
            message: function (input) {
                return String(input.storeName) + ' 今日尚未完成業績回報，請至 Quick Actions 進入業績申報。';
            },
            ai: {
                llmParaphraseAllowed: true,
                includeInAiContext: true,
                containsPii: false
            }
        },
        {
            id: 'unread-notification',
            level: LEVEL_WARNING,
            source: SOURCE_NOTIFICATIONS,
            priority: 280,
            statusMessage: '有未讀通知待查閱',
            title: '未讀通知',
            when: function (input) {
                return Number(input && input.unreadNotificationCount) > 0;
            },
            message: function (input) {
                var n = Number(input && input.unreadNotificationCount) || 0;
                return '您有 ' + n + ' 則未讀通知，建議至通知中心查閱。';
            },
            ai: {
                llmParaphraseAllowed: true,
                includeInAiContext: true,
                containsPii: false
            }
        },
        {
            id: 'workforce-no-schedule-today',
            level: LEVEL_WARNING,
            source: SOURCE_WORKFORCE,
            priority: 270,
            statusMessage: '今日需注意人力安排',
            title: '今日排班',
            when: function (input) {
                var m = input && input.workforceMetrics;
                return !!(m && m.schedulablePool > 0 && m.scheduledToday === 0);
            },
            message: function () {
                return '今日門市尚無排班紀錄（本地 Registry 摘要），請至排班模組確認。';
            },
            ai: {
                llmParaphraseAllowed: true,
                includeInAiContext: true,
                containsPii: false
            }
        },
        {
            id: 'workforce-leave-today',
            level: LEVEL_INFO,
            source: SOURCE_WORKFORCE,
            priority: 100,
            statusMessage: '今日營運正常',
            title: '今日請假',
            when: function (input) {
                var m = input && input.workforceMetrics;
                return !!(m && m.leaveToday > 0);
            },
            message: function (input) {
                var n = Number(input && input.workforceMetrics && input.workforceMetrics.leaveToday) || 0;
                return '今日有 ' + n + ' 筆請假登記（店別摘要），請確認人力安排。';
            },
            ai: {
                llmParaphraseAllowed: true,
                includeInAiContext: true,
                containsPii: false
            }
        }
    ];

    var BY_ID = {};
    ENTRIES.forEach(function (entry) {
        BY_ID[entry.id] = entry;
    });

    function listRegistry() {
        return ENTRIES.map(function (e) {
            return {
                id: e.id,
                level: e.level,
                source: e.source,
                priority: e.priority,
                statusMessage: e.statusMessage,
                title: e.title,
                ai: e.ai,
                registryVersion: REGISTRY_VERSION
            };
        });
    }

    function getRegistryEntry(id) {
        return BY_ID[id] || null;
    }

    /**
     * JSON-safe bundle for future UI-003 context (no PII fields).
     */
    function buildAiContextBundle(activeSignals, options) {
        options = options || {};
        var includeAll = !!options.includeNonPrimary;
        var list = Array.isArray(activeSignals) ? activeSignals : [];
        if (!includeAll && list.length) {
            list = [list[0]];
        }
        return {
            registryVersion: REGISTRY_VERSION,
            generatedAt: new Date().toISOString(),
            signals: list
                .filter(function (s) {
                    var entry = getRegistryEntry(s && s.id);
                    return entry && entry.ai.includeInAiContext;
                })
                .map(function (s) {
                    return {
                        id: s.id,
                        level: s.level,
                        source: s.source,
                        title: s.title,
                        message: s.message,
                        priority: s.priority
                    };
                })
        };
    }

    global.ZDOSOperationCenterSignalRegistry = {
        REGISTRY_VERSION: REGISTRY_VERSION,
        LEVEL_CRITICAL: LEVEL_CRITICAL,
        LEVEL_WARNING: LEVEL_WARNING,
        LEVEL_INFO: LEVEL_INFO,
        SOURCE_SALES: SOURCE_SALES,
        SOURCE_NOTIFICATIONS: SOURCE_NOTIFICATIONS,
        SOURCE_WORKFORCE: SOURCE_WORKFORCE,
        ENTRIES: ENTRIES,
        listRegistry: listRegistry,
        getRegistryEntry: getRegistryEntry,
        buildAiContextBundle: buildAiContextBundle
    };
})(typeof window !== 'undefined' ? window : globalThis);
