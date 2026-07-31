/**
 * UI-003C.3 Phase 2 | Employee AI Dev Integration Harness (Beta Dev — no UI, no LLM)
 */
(function (global) {
    'use strict';

    var HARNESS_FLAG_KEY = 'zdos_feature_oc_employee_ai_dev_harness_v1';
    var HARNESS_VERSION = 'ui-003c3-phase2-1.0';
    var DEFAULT_MAX_RECORDS = 30;

    var harnessRingBuffer = [];
    var harnessSeq = 0;
    var lastSnapshotEnvelope = null;

    function safeJsonParse(raw, def) {
        try {
            return raw ? JSON.parse(raw) : def;
        } catch (_) {
            return def;
        }
    }

    function getDevHarnessConfig() {
        var def = {
            employeeAiDevHarnessEnabled: false,
            harnessLogToConsole: true,
            harnessMaxRecords: DEFAULT_MAX_RECORDS,
            runShadowComparison: true
        };
        try {
            if (!global.localStorage) return def;
            var stored = safeJsonParse(global.localStorage.getItem(HARNESS_FLAG_KEY), null);
            if (!stored || typeof stored !== 'object') return def;
            return {
                employeeAiDevHarnessEnabled: stored.employeeAiDevHarnessEnabled === true,
                harnessLogToConsole: stored.harnessLogToConsole !== false,
                harnessMaxRecords: Number(stored.harnessMaxRecords) || DEFAULT_MAX_RECORDS,
                runShadowComparison: stored.runShadowComparison !== false
            };
        } catch (_) {
            return def;
        }
    }

    function isEmployeeAiDevHarnessEnabled() {
        return getDevHarnessConfig().employeeAiDevHarnessEnabled === true;
    }

    function getEmployeeAdapter() {
        return global.ZDOSOperationCenterEmployeeAiAdapter || null;
    }

    function getShadowAdapter() {
        return global.ZDOSOperationCenterAiShadowAdapter || null;
    }

    function newHarnessRecordId() {
        harnessSeq += 1;
        return 'emp-ai-harness-' + Date.now().toString(36) + '-' + harnessSeq;
    }

    function pushHarnessRecord(record, maxRecords) {
        harnessRingBuffer.push(record);
        while (harnessRingBuffer.length > maxRecords) {
            harnessRingBuffer.shift();
        }
    }

    function shallowSnapshotCopy(data) {
        if (!data || typeof data !== 'object') return null;
        return {
            operationStatus: data.operationStatus,
            copilotMessage: data.copilotMessage
                ? Object.assign({}, data.copilotMessage)
                : null,
            operationSignals: Array.isArray(data.operationSignals)
                ? data.operationSignals.slice()
                : [],
            signalRegistryVersion: data.signalRegistryVersion || null
        };
    }

    function pickPrimaryFromShadowRecord(shadowRecord) {
        if (!shadowRecord) return null;
        if (shadowRecord.inputSignals && shadowRecord.inputSignals.length) {
            return shadowRecord.inputSignals[0];
        }
        return null;
    }

    function compareWithShadowRecord(pipelineRecord, shadowRecord) {
        var comparison = {
            comparable: false,
            shadowAvailable: !!shadowRecord,
            shadowRecordId: shadowRecord && shadowRecord.id ? shadowRecord.id : null,
            primarySignalId: {
                employee: pipelineRecord && pipelineRecord.primary
                    ? pipelineRecord.primary.id
                    : null,
                shadow: pickPrimaryFromShadowRecord(shadowRecord)
                    ? pickPrimaryFromShadowRecord(shadowRecord).id
                    : null,
                match: null
            },
            validator: {
                employeePass: pipelineRecord && pipelineRecord.validatorResult
                    ? pipelineRecord.validatorResult.pass === true
                    : null,
                shadowPass: shadowRecord && shadowRecord.validatorResult
                    ? shadowRecord.validatorResult.pass === true
                    : null
            },
            relatedSignalId: {
                employee: pipelineRecord && pipelineRecord.aiOutput
                    ? pipelineRecord.aiOutput.related_signal_id
                    : null,
                shadow: shadowRecord && shadowRecord.aiOutput
                    ? shadowRecord.aiOutput.related_signal_id
                    : null,
                match: null
            },
            ruleCopilotHeadline: pipelineRecord && pipelineRecord.ruleCopilot
                ? pipelineRecord.ruleCopilot.headline
                : null,
            candidateHeadline: pipelineRecord && pipelineRecord.candidateCopilotMessage
                ? pipelineRecord.candidateCopilotMessage.headline
                : null,
            shadowSummary: shadowRecord && shadowRecord.aiOutput
                ? shadowRecord.aiOutput.summary
                : null,
            notes: []
        };

        if (!shadowRecord) {
            comparison.notes.push('shadow_record_unavailable');
            return comparison;
        }
        if (!pipelineRecord) {
            comparison.notes.push('employee_pipeline_record_missing');
            return comparison;
        }

        comparison.comparable = true;
        comparison.primarySignalId.match =
            comparison.primarySignalId.employee === comparison.primarySignalId.shadow;
        comparison.relatedSignalId.match =
            comparison.relatedSignalId.employee === comparison.relatedSignalId.shadow;

        if (!comparison.primarySignalId.match) {
            comparison.notes.push('primary_signal_id_mismatch');
        }
        if (!comparison.relatedSignalId.match) {
            comparison.notes.push('related_signal_id_mismatch');
        }
        if (comparison.validator.employeePass !== comparison.validator.shadowPass) {
            comparison.notes.push('validator_pass_divergence');
        }
        if (comparison.ruleCopilotHeadline === comparison.candidateHeadline) {
            comparison.notes.push('candidate_equals_rule_headline');
        }

        return comparison;
    }

    function resolveLatestShadowRecord(cfg) {
        var Shadow = getShadowAdapter();
        if (!Shadow || !cfg.runShadowComparison) {
            return Promise.resolve(null);
        }
        if (typeof Shadow.getShadowRecords === 'function') {
            var existing = Shadow.getShadowRecords();
            if (existing.length) {
                return Promise.resolve(existing[existing.length - 1]);
            }
        }
        if (typeof Shadow.isShadowPipelineEnabled === 'function' &&
            Shadow.isShadowPipelineEnabled() &&
            typeof Shadow.runShadowPipeline === 'function') {
            return Promise.resolve(null);
        }
        return Promise.resolve(null);
    }

    function buildHarnessRecord(snapshotCopy, ctx, meta, pipelineResult, pipelineInnerRecord, shadowComparison) {
        return {
            id: newHarnessRecordId(),
            createdAt: new Date().toISOString(),
            harnessVersion: HARNESS_VERSION,
            displaySurface: 'rule-only',
            uiApply: false,
            snapshotMeta: {
                mode: meta && meta.mode ? meta.mode : null,
                source: meta && meta.source ? meta.source : null,
                scenarioId: meta && meta.scenarioId ? String(meta.scenarioId) : null,
                salesSource: meta && meta.salesSource ? meta.salesSource : null,
                notificationsSource: meta && meta.notificationsSource ? meta.notificationsSource : null,
                workforceSource: meta && meta.workforceSource ? meta.workforceSource : null
            },
            ctxSummary: {
                employeeId: ctx && ctx.employeeId ? String(ctx.employeeId) : '',
                storeCode: ctx && ctx.storeCode ? String(ctx.storeCode) : '',
                canReviewSales: !!(ctx && ctx.canReviewSales)
            },
            ruleCopilotDisplay: snapshotCopy && snapshotCopy.copilotMessage
                ? Object.assign({}, snapshotCopy.copilotMessage)
                : null,
            pipelineResult: pipelineResult,
            pipelineRecord: pipelineInnerRecord || null,
            shadowComparison: shadowComparison
        };
    }

    /**
     * Called after OC render; never mutates snapshot or DOM.
     */
    function handleOperationCenterSnapshot(data, ctx, meta) {
        var cfg = getDevHarnessConfig();
        if (!cfg.employeeAiDevHarnessEnabled) {
            return Promise.resolve({
                ran: false,
                reason: 'harness_off',
                displaySurface: 'rule-only'
            });
        }

        var Emp = getEmployeeAdapter();
        if (!Emp || typeof Emp.runEmployeeAiDevPipeline !== 'function') {
            return Promise.resolve({
                ran: false,
                reason: 'employee_adapter_missing',
                displaySurface: 'rule-only'
            });
        }

        var snapshotCopy = shallowSnapshotCopy(data);
        lastSnapshotEnvelope = {
            capturedAt: new Date().toISOString(),
            data: snapshotCopy,
            ctx: ctx ? Object.assign({}, ctx) : {},
            meta: meta ? Object.assign({}, meta) : {}
        };

        ctx = ctx || {};
        meta = meta || {};

        return Emp.runEmployeeAiDevPipeline(data, ctx, meta).then(function (pipelineResult) {
            var innerRecord = null;
            if (typeof Emp.getEmployeeAiDevRecords === 'function') {
                var devRecords = Emp.getEmployeeAiDevRecords();
                if (devRecords.length) {
                    innerRecord = devRecords[devRecords.length - 1];
                }
            }

            return resolveLatestShadowRecord(cfg).then(function (shadowRecord) {
                var shadowComparison = compareWithShadowRecord(innerRecord, shadowRecord);
                var harnessRecord = buildHarnessRecord(
                    snapshotCopy,
                    ctx,
                    meta,
                    pipelineResult,
                    innerRecord,
                    shadowComparison
                );
                pushHarnessRecord(harnessRecord, cfg.harnessMaxRecords);

                if (cfg.harnessLogToConsole && typeof console !== 'undefined' && console.debug) {
                    console.debug('[ZDOS Employee AI Dev Harness]', harnessRecord);
                }

                return {
                    ran: true,
                    reason: pipelineResult.reason || null,
                    harnessRecordId: harnessRecord.id,
                    pipelineResult: pipelineResult,
                    shadowComparison: shadowComparison,
                    displaySurface: 'rule-only',
                    uiApply: false
                };
            });
        }).catch(function (err) {
            var fallbackMsg = Emp.getRuleCopilotFallbackMessage
                ? Emp.getRuleCopilotFallbackMessage(data)
                : (data && data.copilotMessage) || null;
            var failRecord = buildHarnessRecord(
                snapshotCopy,
                ctx,
                meta,
                {
                    skipped: false,
                    source: 'rule',
                    uiApply: false,
                    copilotMessage: fallbackMsg,
                    reason: err && err.message ? err.message : 'harness_error',
                    fallback: true
                },
                null,
                { comparable: false, notes: ['harness_pipeline_error'] }
            );
            pushHarnessRecord(failRecord, cfg.harnessMaxRecords);
            if (cfg.harnessLogToConsole && console.error) {
                console.error('[ZDOS Employee AI Dev Harness]', err);
            }
            return {
                ran: true,
                reason: 'harness_error',
                harnessRecordId: failRecord.id,
                pipelineResult: failRecord.pipelineResult,
                displaySurface: 'rule-only',
                uiApply: false,
                fallback: true
            };
        });
    }

    function getHarnessRecords() {
        return harnessRingBuffer.slice();
    }

    function clearHarnessRecords() {
        harnessRingBuffer = [];
    }

    function getLastSnapshotEnvelope() {
        return lastSnapshotEnvelope;
    }

    function inspectHarness(options) {
        options = options || {};
        var records = getHarnessRecords();
        var summary = records.map(function (r) {
            var pr = r.pipelineResult || {};
            return {
                id: r.id,
                at: r.createdAt,
                source: pr.source,
                fallback: !!pr.fallback,
                skipped: !!pr.skipped,
                reason: pr.reason || '',
                ruleHeadline: r.ruleCopilotDisplay && r.ruleCopilotDisplay.headline,
                shadowComparable: r.shadowComparison && r.shadowComparison.comparable
            };
        });

        if (options.verbose !== false && typeof console !== 'undefined') {
            if (console.info) {
                console.info(
                    '[ZDOS Employee AI Dev Harness] inspect — records:',
                    records.length,
                    'harnessEnabled:',
                    isEmployeeAiDevHarnessEnabled()
                );
            }
            if (console.table && summary.length) {
                console.table(summary);
            } else if (console.debug) {
                console.debug(summary);
            }
            if (lastSnapshotEnvelope && console.debug) {
                console.debug('[ZDOS Employee AI Dev Harness] lastSnapshot', lastSnapshotEnvelope);
            }
        }

        return {
            harnessVersion: HARNESS_VERSION,
            harnessEnabled: isEmployeeAiDevHarnessEnabled(),
            records: records,
            summary: summary,
            lastSnapshot: lastSnapshotEnvelope
        };
    }

    function buildScenarioFixtures() {
        return [
            {
                id: 'happy-unread-notification',
                description: 'Primary unread-notification — expect dev candidate when employee flags on',
                data: {
                    copilotMessage: {
                        label: 'Operation Copilot',
                        headline: '未讀通知',
                        body: '您有 3 則未讀',
                        actionLabel: '查看詳情',
                        empty: false,
                        signalId: 'unread-notification'
                    },
                    operationSignals: [{
                        id: 'unread-notification',
                        title: '未讀通知',
                        message: '您有 3 則未讀',
                        level: 'info'
                    }],
                    signalRegistryVersion: '1.0.0'
                },
                ctx: { employeeId: '0001', canReviewSales: false, storeCode: 'DDP', canUseOperationCenter: true },
                meta: { mode: 'mock', source: 'harness-scenario' },
                expect: function (result) {
                    return result.pipelineResult &&
                        result.pipelineResult.source === 'employee-ai-dev' &&
                        result.pipelineResult.fallback !== true;
                }
            },
            {
                id: 'permission-sales-review-denied',
                description: 'sales-pending-review without canReviewSales — Rule fallback',
                data: {
                    copilotMessage: {
                        headline: '待審業績',
                        body: '1 筆待審',
                        empty: false,
                        signalId: 'sales-pending-review'
                    },
                    operationSignals: [{
                        id: 'sales-pending-review',
                        title: '待審業績',
                        message: '1 筆待審',
                        level: 'warning'
                    }],
                    signalRegistryVersion: '1.0.0'
                },
                ctx: { employeeId: '0001', canReviewSales: false, storeCode: 'DDP', canUseOperationCenter: true },
                meta: { mode: 'mock', source: 'harness-scenario' },
                expect: function (result) {
                    return result.pipelineResult &&
                        result.pipelineResult.source === 'rule' &&
                        result.pipelineResult.fallback === true;
                }
            },
            {
                id: 'harness-off-no-run',
                description: 'Harness disabled — no pipeline (完全無 AI)',
                harnessEnabled: false,
                employeeFlags: { employeeAiCopilotEnabled: true, aiCopilotEnabled: true },
                data: {
                    copilotMessage: { headline: 'Rule only', body: '', signalId: 'unread-notification' },
                    operationSignals: [{
                        id: 'unread-notification',
                        title: '未讀通知',
                        message: '您有 3 則未讀',
                        level: 'info'
                    }]
                },
                ctx: { employeeId: '0001', canReviewSales: false, storeCode: 'DDP' },
                meta: { mode: 'mock', source: 'harness-scenario' },
                expect: function (result) {
                    return result.ran === false && result.reason === 'harness_off';
                }
            }
        ];
    }

    function runTestScenarios(options) {
        options = options || {};
        var Emp = getEmployeeAdapter();
        if (!Emp) {
            return Promise.resolve({ ok: false, error: 'employee_adapter_missing', results: [] });
        }

        var scenarios = buildScenarioFixtures();
        var cfg = getDevHarnessConfig();
        var harnessKey = HARNESS_FLAG_KEY;
        var empKey = Emp.EMPLOYEE_AI_FLAG_KEY;
        var prevHarness = null;
        var prevEmp = null;

        try {
            if (global.localStorage) {
                prevHarness = global.localStorage.getItem(harnessKey);
                prevEmp = global.localStorage.getItem(empKey);
            }
        } catch (_) { /* ignore */ }

        function restoreStorage() {
            try {
                if (!global.localStorage) return;
                if (prevHarness == null) global.localStorage.removeItem(harnessKey);
                else global.localStorage.setItem(harnessKey, prevHarness);
                if (prevEmp == null) global.localStorage.removeItem(empKey);
                else global.localStorage.setItem(empKey, prevEmp);
            } catch (_) { /* ignore */ }
        }

        function setFlags(scenario) {
            try {
                if (!global.localStorage) return;
                var harnessOn = scenario.harnessEnabled !== false;
                global.localStorage.setItem(harnessKey, JSON.stringify({
                    employeeAiDevHarnessEnabled: harnessOn,
                    harnessLogToConsole: false,
                    harnessMaxRecords: cfg.harnessMaxRecords,
                    runShadowComparison: false
                }));
                var empFlags = scenario.employeeFlags || {
                    employeeAiCopilotEnabled: true,
                    aiCopilotEnabled: true,
                    employeeAiShadowProvider: "mock-local",
                    devLogToConsole: false
                };
                global.localStorage.setItem(empKey, JSON.stringify(empFlags));
            } catch (_) { /* ignore */ }
        }

        clearHarnessRecords();
        if (typeof Emp.clearEmployeeAiDevRecords === 'function') {
            Emp.clearEmployeeAiDevRecords();
        }

        var chain = Promise.resolve([]);
        scenarios.forEach(function (scenario) {
            chain = chain.then(function (results) {
                setFlags(scenario);
                if (scenario.harnessEnabled === false) {
                    return handleOperationCenterSnapshot(
                        scenario.data,
                        scenario.ctx,
                        Object.assign({}, scenario.meta, { scenarioId: scenario.id })
                    ).then(function (result) {
                        var pass = scenario.expect(result);
                        results.push({
                            id: scenario.id,
                            description: scenario.description,
                            pass: pass,
                            result: result
                        });
                        return results;
                    });
                }
                return handleOperationCenterSnapshot(
                    scenario.data,
                    scenario.ctx,
                    Object.assign({}, scenario.meta, { scenarioId: scenario.id })
                ).then(function (result) {
                    var pass = scenario.expect(result);
                    results.push({
                        id: scenario.id,
                        description: scenario.description,
                        pass: pass,
                        result: result
                    });
                    return results;
                });
            });
        });

        return chain.then(function (results) {
            restoreStorage();
            var allPass = results.every(function (r) { return r.pass; });
            var payload = { ok: allPass, results: results, harnessVersion: HARNESS_VERSION };
            if (options.log !== false && typeof console !== 'undefined' && console.info) {
                console.info('[ZDOS Employee AI Dev Harness] runTestScenarios', payload);
            }
            return payload;
        }).catch(function (err) {
            restoreStorage();
            throw err;
        });
    }

    global.ZDOSOperationCenterEmployeeAiDevHarness = {
        HARNESS_FLAG_KEY: HARNESS_FLAG_KEY,
        HARNESS_VERSION: HARNESS_VERSION,
        getDevHarnessConfig: getDevHarnessConfig,
        isEmployeeAiDevHarnessEnabled: isEmployeeAiDevHarnessEnabled,
        handleOperationCenterSnapshot: handleOperationCenterSnapshot,
        compareWithShadowRecord: compareWithShadowRecord,
        getHarnessRecords: getHarnessRecords,
        clearHarnessRecords: clearHarnessRecords,
        getLastSnapshotEnvelope: getLastSnapshotEnvelope,
        inspectHarness: inspectHarness,
        runTestScenarios: runTestScenarios,
        buildScenarioFixtures: buildScenarioFixtures
    };
})(typeof window !== 'undefined' ? window : globalThis);
