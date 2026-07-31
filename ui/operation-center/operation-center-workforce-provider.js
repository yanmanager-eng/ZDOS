/**
 * UI-002 Phase 3C | Operation Center Workforce Summary (read-only, aggregate only)
 * M1-GATE: Supabase schedules blocked until Scheduling RLS (M1-005B-07).
 */
(function (global) {
    'use strict';

    var SOURCE_LOCAL_REGISTRY = 'local_registry';
    var SOURCE_NONE = 'none';
    var SUPABASE_BLOCK_REASON =
        'M1-GATE: public.schedules RLS 未就緒（M1-005B-07）；禁止 OC 查詢排班明細';

    function countScheduledToday(schedules, storeCode, businessDate) {
        var scheduledEmployees = {};
        (schedules || []).forEach(function (s) {
            if (!s || s.date !== businessDate) return;
            if (storeCode && String(s.storeId || '').toUpperCase() !== storeCode) return;
            var emp = String(s.employeeNo || s.employeeId || '').trim();
            if (emp) scheduledEmployees[emp] = true;
        });
        return Object.keys(scheduledEmployees).length;
    }

    function countLeaveToday(leaveRegistry, storeCode, businessDate) {
        return (leaveRegistry || []).filter(function (l) {
            return l && l.date === businessDate &&
                (!storeCode || String(l.storeId || '').toUpperCase() === storeCode);
        }).length;
    }

    /**
     * Permission: store-scoped aggregate only; no employee roster payload to OC UI.
     */
    function checkWorkforcePermission(ctx) {
        var storeCode = String(ctx && ctx.storeCode || '').trim().toUpperCase();
        var pool = Number(ctx && ctx.schedulableEmployeeCount) || 0;
        var storeAuthorized = !!storeCode && pool > 0;
        return {
            storeAuthorized: storeAuthorized,
            supabaseSchedulesAllowed: false,
            supabaseBlockReason: SUPABASE_BLOCK_REASON,
            aggregateOnly: true
        };
    }

    /**
     * Data source decision (Phase 3C): local registry until RLS gate passes.
     */
    function assessWorkforceDataSource(ctx) {
        var permission = checkWorkforcePermission(ctx);
        if (!permission.supabaseSchedulesAllowed) {
            return {
                primary: SOURCE_LOCAL_REGISTRY,
                supabaseEligible: false,
                reason: permission.supabaseBlockReason
            };
        }
        return { primary: SOURCE_LOCAL_REGISTRY, supabaseEligible: true, reason: null };
    }

    function buildWorkforceSummaryReadOnly(ctx, emptyLabel) {
        emptyLabel = emptyLabel || '尚無資料';
        var permission = checkWorkforcePermission(ctx);
        var storeCode = String(ctx && ctx.storeCode || '').trim().toUpperCase();
        var businessDate = String(ctx && ctx.businessDate || '').trim();
        var schedules = Array.isArray(ctx && ctx.schedules) ? ctx.schedules : [];
        var leaveRegistry = Array.isArray(ctx && ctx.leaveRegistry) ? ctx.leaveRegistry : [];
        var schedulablePool = Number(ctx && ctx.schedulableEmployeeCount) || 0;

        if (!permission.storeAuthorized) {
            return {
                ok: true,
                source: SOURCE_NONE,
                empty: true,
                permission: permission,
                metrics: null,
                kpi: {
                    id: 'attendance',
                    label: '今日出勤',
                    value: emptyLabel,
                    meta: '排班資料不可用',
                    empty: true
                }
            };
        }

        var scheduledToday = countScheduledToday(schedules, storeCode, businessDate);
        var leaveToday = countLeaveToday(leaveRegistry, storeCode, businessDate);
        var availableWorkforce = scheduledToday > 0
            ? Math.max(0, scheduledToday - leaveToday)
            : 0;

        var metrics = {
            scheduledToday: scheduledToday,
            schedulablePool: schedulablePool,
            leaveToday: leaveToday,
            availableWorkforce: availableWorkforce
        };

        var metaParts = [
            '排班 ' + scheduledToday,
            '可用 ' + availableWorkforce,
            '池內 ' + schedulablePool
        ];
        if (leaveToday) metaParts.push('請假 ' + leaveToday);
        metaParts.push('本地 Registry · 摘要');

        var kpi = {
            id: 'attendance',
            label: '今日出勤',
            value: scheduledToday + ' / ' + schedulablePool,
            meta: metaParts.join(' · '),
            empty: false
        };

        return {
            ok: true,
            source: SOURCE_LOCAL_REGISTRY,
            empty: false,
            permission: permission,
            metrics: metrics,
            kpi: kpi
        };
    }

    /**
     * Supabase path gated off — does not query schedules (RLS / authorization risk).
     */
    function fetchSupabaseWorkforceSummary(ctx) {
        assessWorkforceDataSource(ctx);
        return Promise.resolve({
            ok: false,
            blocked: true,
            useFallback: true,
            error: 'supabase_schedules_blocked',
            reason: SUPABASE_BLOCK_REASON
        });
    }

    global.ZDOSOperationCenterWorkforceProvider = {
        SOURCE_LOCAL_REGISTRY: SOURCE_LOCAL_REGISTRY,
        SUPABASE_BLOCK_REASON: SUPABASE_BLOCK_REASON,
        checkWorkforcePermission: checkWorkforcePermission,
        assessWorkforceDataSource: assessWorkforceDataSource,
        buildWorkforceSummaryReadOnly: buildWorkforceSummaryReadOnly,
        fetchSupabaseWorkforceSummary: fetchSupabaseWorkforceSummary
    };
})(typeof window !== 'undefined' ? window : globalThis);
