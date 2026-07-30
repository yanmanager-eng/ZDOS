/**
 * UI-002 Phase 2–4 | Operation Center Data Provider
 */
(function (global) {
    'use strict';

    var Workforce = global.ZDOSOperationCenterWorkforceProvider;
    var Signals = global.ZDOSOperationCenterSignalProvider;
    var EMPTY_LABEL = '尚無資料';
    var SOURCE_LOCAL = 'local';
    var SOURCE_SUPABASE = 'supabase';
    var ACTIVE_SALES_STATUSES = ['draft', 'submitted', 'approved', 'rejected'];

    function safeFloat(n) {
        var v = parseFloat(n);
        return Number.isFinite(v) ? v : 0;
    }

    function formatMoney(amount) {
        if (amount == null || !Number.isFinite(amount)) return EMPTY_LABEL;
        return 'NT$ ' + Math.round(amount).toLocaleString('zh-TW');
    }

    function parseTimeFromIso(iso) {
        if (!iso) return '';
        try {
            var d = new Date(iso);
            if (Number.isNaN(d.getTime())) return '';
            return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
        } catch (_) {
            return '';
        }
    }

    function parseTimeFromSalesId(id, fallbackFn) {
        if (typeof fallbackFn === 'function') {
            var label = String(fallbackFn(id) || '').trim();
            var m = label.match(/(\d{1,2}:\d{2})/);
            if (m) return m[1];
        }
        return '';
    }

    function buildQuickActions() {
        return [
            { id: 'leave', label: '排假', icon: '📅', action: 'scheduling' },
            { id: 'sales', label: '業績', icon: '📈', action: 'sales' },
            { id: 'academy', label: '能力學院', icon: '🎓', action: 'placeholder' },
            { id: 'reports', label: '報表', icon: '📊', action: 'reports' }
        ];
    }

    function buildSalesKpiCard(count, total, metaSuffix) {
        return {
            id: 'sales',
            label: '今日業績',
            value: count ? formatMoney(total) : EMPTY_LABEL,
            meta: count ? (count + ' 筆 · ' + metaSuffix) : '今日尚無業績回報',
            empty: !count
        };
    }

    function buildNotificationsKpiCard(unreadCount, metaSuffix) {
        var n = Number(unreadCount) || 0;
        return {
            id: 'notifications',
            label: '未讀通知',
            value: n > 0 ? String(n) : EMPTY_LABEL,
            meta: n > 0 ? (n + ' 則未讀 · ' + metaSuffix) : '目前無未讀通知',
            empty: n === 0
        };
    }

    function nextCalendarDate(yyyyMmDd) {
        var parts = String(yyyyMmDd || '').split('-');
        if (parts.length !== 3) return '';
        var d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
        d.setUTCDate(d.getUTCDate() + 1);
        return d.toISOString().slice(0, 10);
    }

    function businessDateTaipeiRange(businessDate) {
        var day = String(businessDate || '').trim();
        var next = nextCalendarDate(day);
        if (!day || !next) return null;
        return {
            startIso: day + 'T00:00:00+08:00',
            endIso: next + 'T00:00:00+08:00'
        };
    }

    function mergeTimelineEntries(data, extraEntries) {
        if (!extraEntries || !extraEntries.length) return;
        var merged = (data.timeline || []).map(function (t) {
            return { sortKey: String(t.time || ''), time: t.time, event: t.event };
        });
        extraEntries.forEach(function (e) {
            merged.push(e);
        });
        merged.sort(function (a, b) {
            return String(a.sortKey).localeCompare(String(b.sortKey));
        });
        data.timeline = merged.map(function (t) {
            return { time: t.time, event: t.event };
        });
    }

    /**
     * Read-only query: public.sales_reports (RLS via authenticated session).
     * Location: ZDOSOperationCenterDataProvider.fetchSupabaseTodaySalesKpi
     */
    function fetchSupabaseTodaySalesKpi(ctx) {
        var client = typeof ctx.getSupabaseClient === 'function' ? ctx.getSupabaseClient() : null;
        if (!client || !ctx.supabaseSessionReady) {
            return Promise.resolve({ ok: false, error: 'supabase_not_ready', useFallback: true });
        }
        var storeUuid = String(ctx.storeUuid || '').trim();
        var businessDate = String(ctx.businessDate || '').trim();
        if (!storeUuid || !businessDate) {
            return Promise.resolve({ ok: false, error: 'missing_store_or_date', useFallback: true });
        }

        return client
            .from('sales_reports')
            .select('id, revenue, status, business_date, store_id, submitted_at')
            .eq('business_date', businessDate)
            .eq('store_id', storeUuid)
            .in('status', ACTIVE_SALES_STATUSES)
            .then(function (result) {
                if (result.error) {
                    console.error('[ZDOS OC] sales_reports read failed', result.error);
                    return { ok: false, error: result.error.message || 'query_failed', useFallback: true };
                }
                var rows = Array.isArray(result.data) ? result.data : [];
                var total = rows.reduce(function (sum, row) {
                    return sum + safeFloat(row && row.revenue);
                }, 0);
                return {
                    ok: true,
                    useFallback: false,
                    count: rows.length,
                    total: total,
                    rows: rows
                };
            })
            .catch(function (err) {
                console.error('[ZDOS OC] sales_reports read unexpected', err);
                return {
                    ok: false,
                    error: err && err.message ? err.message : 'query_failed',
                    useFallback: true
                };
            });
    }

    /**
     * Read-only: public.notifications (RLS via authenticated session).
     * Location: ZDOSOperationCenterDataProvider.fetchSupabaseNotifications
     */
    function fetchSupabaseNotifications(ctx) {
        var client = typeof ctx.getSupabaseClient === 'function' ? ctx.getSupabaseClient() : null;
        if (!client || !ctx.supabaseSessionReady) {
            return Promise.resolve({ ok: false, error: 'supabase_not_ready', useFallback: true });
        }
        var profileId = String(ctx.profileId || '').trim();
        var businessDate = String(ctx.businessDate || '').trim();
        var range = businessDateTaipeiRange(businessDate);
        if (!profileId || !range) {
            return Promise.resolve({ ok: false, error: 'missing_profile_or_date', useFallback: true });
        }

        var unreadQuery = client
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profileId)
            .is('read_at', null);

        var todayQuery = client
            .from('notifications')
            .select('id, type, title, message, read_at, created_at')
            .eq('user_id', profileId)
            .gte('created_at', range.startIso)
            .lt('created_at', range.endIso)
            .order('created_at', { ascending: false });

        return Promise.all([unreadQuery, todayQuery])
            .then(function (results) {
                var countRes = results[0];
                var todayRes = results[1];
                if (countRes.error) {
                    console.error('[ZDOS OC] notifications unread count failed', countRes.error);
                    return {
                        ok: false,
                        error: countRes.error.message || 'query_failed',
                        useFallback: true
                    };
                }
                if (todayRes.error) {
                    console.error('[ZDOS OC] notifications today query failed', todayRes.error);
                    return {
                        ok: false,
                        error: todayRes.error.message || 'query_failed',
                        useFallback: true
                    };
                }
                return {
                    ok: true,
                    useFallback: false,
                    unreadCount: typeof countRes.count === 'number' ? countRes.count : 0,
                    todayEvents: Array.isArray(todayRes.data) ? todayRes.data : []
                };
            })
            .catch(function (err) {
                console.error('[ZDOS OC] notifications read unexpected', err);
                return {
                    ok: false,
                    error: err && err.message ? err.message : 'query_failed',
                    useFallback: true
                };
            });
    }

    function applySupabaseSalesKpiToData(data, supabaseKpi) {
        data.kpiCards = (data.kpiCards || []).map(function (k) {
            if (k.id === 'sales') return supabaseKpi;
            return k;
        });

        if (!supabaseKpi.empty) {
            data.focusItems = (data.focusItems || []).filter(function (f) {
                return f.id !== 'focus-sales';
            });
        }
    }

    function applySupabaseNotificationsToData(data, payload) {
        var unread = Number(payload.unreadCount) || 0;
        var kpi = buildNotificationsKpiCard(unread, 'Supabase 唯讀');
        data.kpiCards = (data.kpiCards || []).map(function (k) {
            if (k.id === 'notifications') return kpi;
            return k;
        });

        var timelineAdds = (payload.todayEvents || []).map(function (row) {
            var time = parseTimeFromIso(row && row.created_at) || '--:--';
            var title = String(row && row.title || '通知').trim();
            return {
                sortKey: time,
                time: time,
                event: '通知 · ' + title
            };
        });
        mergeTimelineEntries(data, timelineAdds);
    }

    function applyWorkforceSummaryToSnapshot(ctx, data) {
        if (!Workforce || typeof Workforce.buildWorkforceSummaryReadOnly !== 'function') {
            return { source: 'none', metrics: null };
        }
        var summary = Workforce.buildWorkforceSummaryReadOnly(ctx, EMPTY_LABEL);
        if (!summary.ok || !summary.kpi) {
            return { source: 'none', metrics: null };
        }
        data.kpiCards = (data.kpiCards || []).map(function (k) {
            if (k.id === 'attendance') return summary.kpi;
            return k;
        });
        return { source: summary.source || 'local_registry', metrics: summary.metrics || null };
    }

    function reapplyOperationSignals(ctx, data) {
        if (!Signals || typeof Signals.applySignalsToSnapshot !== 'function') {
            return;
        }
        var signalCtx = Object.assign({}, ctx, {
            _workforceMetrics: ctx._workforceMetrics || null
        });
        Signals.applySignalsToSnapshot(data, signalCtx);
    }

    function attachWorkforceSource(result, workforceMeta) {
        if (!result) return result;
        result.workforceSource = workforceMeta && workforceMeta.source ? workforceMeta.source : 'none';
        return result;
    }

    function buildLocalSnapshot(ctx) {
        try {
            if (!ctx || typeof ctx !== 'object') {
                return { ok: false, error: 'invalid_context', data: null };
            }

            var storeName = String(ctx.storeName || '').trim();
            var storeCode = String(ctx.storeCode || '').trim().toUpperCase();
            var businessDate = String(ctx.businessDate || '').trim();
            var salesRecords = Array.isArray(ctx.salesRecords) ? ctx.salesRecords : [];
            var leaveRegistry = Array.isArray(ctx.leaveRegistry) ? ctx.leaveRegistry : [];
            var attendanceRecords = Array.isArray(ctx.attendanceRecords) ? ctx.attendanceRecords : [];

            var storeSalesToday = salesRecords.filter(function (r) {
                return r && r.date === businessDate && String(r.store || '').trim() === storeName;
            });

            var salesTotal = storeSalesToday.reduce(function (sum, r) {
                return sum + safeFloat(r.salesAmount != null ? r.salesAmount : r.amount);
            }, 0);

            var salesKpi = buildSalesKpiCard(
                storeSalesToday.length,
                salesTotal,
                '本地 Registry · 唯讀'
            );

            var attendanceKpi = {
                id: 'attendance',
                label: '今日出勤',
                value: EMPTY_LABEL,
                meta: '排班資料不可用',
                empty: true
            };

            var pendingCount = Number(ctx.pendingSalesReviewCount) || 0;
            var canReview = !!ctx.canReviewSales;
            var approvalsKpi = {
                id: 'approvals',
                label: '待簽核',
                value: canReview ? String(pendingCount) : EMPTY_LABEL,
                meta: canReview
                    ? (pendingCount ? '待核對業績 · 唯讀' : '目前無待簽核')
                    : '無簽核權限',
                empty: !canReview || pendingCount === 0
            };

            var unread = Number(ctx.unreadAnnouncementCount);
            var notificationsKpi = {
                id: 'notifications',
                label: '未讀通知',
                value: Number.isFinite(unread) ? String(unread) : EMPTY_LABEL,
                meta: unread > 0 ? '公告中心 · 唯讀' : '目前無未讀公告',
                empty: !Number.isFinite(unread) || unread === 0
            };

            var focusItems = [];
            if (!ctx.todaySalesDone) {
                focusItems.push({ id: 'focus-sales', text: '完成今日業績回報', tag: '今日' });
            }
            if (ctx.hasInventoryPrivilege && !ctx.todayInventoryDone) {
                focusItems.push({ id: 'focus-inv', text: '完成庫存盤點', tag: '今日' });
            }
            if (canReview && pendingCount > 0) {
                focusItems.push({ id: 'focus-review', text: '業績核對（' + pendingCount + '）', tag: '待辦' });
            }
            focusItems = focusItems.slice(0, 3);

            var timeline = [];

            storeSalesToday.forEach(function (r) {
                var time = parseTimeFromSalesId(r.id, ctx.formatSalesTime) || '--:--';
                var shift = String(r.shift || '').trim() || '班別';
                var amt = safeFloat(r.salesAmount != null ? r.salesAmount : r.amount);
                timeline.push({
                    sortKey: time,
                    time: time,
                    event: shift + ' 業績回報 · ' + (amt ? formatMoney(amt) : EMPTY_LABEL)
                });
            });

            attendanceRecords.forEach(function (row) {
                if (String(row.date || '') !== businessDate) return;
                var time = parseTimeFromIso(row.createdAt || row.updatedAt) || '--:--';
                var label = typeof ctx.resolveEmployeeLabel === 'function'
                    ? ctx.resolveEmployeeLabel(row.employeeId)
                    : String(row.employeeId || '');
                timeline.push({
                    sortKey: time,
                    time: time,
                    event: (label || '員工') + ' 出勤紀錄'
                });
            });

            leaveRegistry.forEach(function (l) {
                if (l.date !== businessDate) return;
                if (storeCode && String(l.storeId || '').toUpperCase() !== storeCode) return;
                var time = parseTimeFromIso(l.createdAt) || '--:--';
                timeline.push({
                    sortKey: time,
                    time: time,
                    event: '請假登記 · ' + String(l.leaveType || '')
                });
            });

            timeline.sort(function (a, b) { return String(a.sortKey).localeCompare(String(b.sortKey)); });
            timeline = timeline.map(function (t) { return { time: t.time, event: t.event }; });

            var snapshotData = {
                kpiCards: [salesKpi, attendanceKpi, approvalsKpi, notificationsKpi],
                focusItems: focusItems,
                quickActions: buildQuickActions(),
                timeline: timeline
            };

            var workforceMeta = applyWorkforceSummaryToSnapshot(ctx, snapshotData);
            var signalCtx = Object.assign({}, ctx, { _workforceMetrics: workforceMeta.metrics });
            reapplyOperationSignals(signalCtx, snapshotData);

            return {
                ok: true,
                error: null,
                source: SOURCE_LOCAL,
                workforceSource: workforceMeta.source,
                data: snapshotData
            };
        } catch (err) {
            return { ok: false, error: err && err.message ? err.message : 'snapshot_failed', data: null };
        }
    }

    function fetchSnapshot(ctx) {
        var source = String(ctx && ctx.dataSource || SOURCE_LOCAL).toLowerCase();
        var localResult = buildLocalSnapshot(ctx);
        if (!localResult.ok) {
            return Promise.resolve(localResult);
        }
        if (source !== SOURCE_SUPABASE) {
            return Promise.resolve(attachWorkforceSource(localResult, {
                source: localResult.workforceSource || 'local_registry'
            }));
        }

        return Promise.all([
            fetchSupabaseTodaySalesKpi(ctx),
            fetchSupabaseNotifications(ctx)
        ]).then(function (results) {
            var sales = results[0];
            var notif = results[1];
            var data = localResult.data;
            var salesSource = 'local_fallback';
            var notificationsSource = 'local_fallback';
            var snapshotSource = SOURCE_LOCAL;

            if (sales.ok) {
                applySupabaseSalesKpiToData(
                    data,
                    buildSalesKpiCard(sales.count, sales.total, 'Supabase 唯讀')
                );
                salesSource = 'supabase';
            }

            if (notif.ok) {
                applySupabaseNotificationsToData(data, notif);
                notificationsSource = 'supabase';
            }

            var signalCtx = Object.assign({}, ctx, {
                _workforceMetrics: (Workforce && Workforce.buildWorkforceSummaryReadOnly)
                    ? (Workforce.buildWorkforceSummaryReadOnly(ctx, EMPTY_LABEL).metrics || null)
                    : null
            });
            reapplyOperationSignals(signalCtx, data);

            if (salesSource === 'supabase' || notificationsSource === 'supabase') {
                snapshotSource = SOURCE_SUPABASE;
            }

            return attachWorkforceSource({
                ok: true,
                error: null,
                source: snapshotSource,
                salesSource: salesSource,
                notificationsSource: notificationsSource,
                data: data
            }, { source: localResult.workforceSource || 'local_registry' });
        });
    }

    global.ZDOSOperationCenterDataProvider = {
        SOURCE_LOCAL: SOURCE_LOCAL,
        SOURCE_SUPABASE: SOURCE_SUPABASE,
        EMPTY_LABEL: EMPTY_LABEL,
        buildLocalSnapshot: buildLocalSnapshot,
        fetchSupabaseTodaySalesKpi: fetchSupabaseTodaySalesKpi,
        fetchSupabaseNotifications: fetchSupabaseNotifications,
        fetchSnapshot: fetchSnapshot
    };
})(typeof window !== 'undefined' ? window : globalThis);
