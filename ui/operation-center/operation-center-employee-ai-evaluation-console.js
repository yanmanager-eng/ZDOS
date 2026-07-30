/**
 * UI-003C.3 Phase 3 | Employee AI Dev Evaluation Console (Beta Dev — DevTools only, no OC UI)
 */
(function (global) {
    'use strict';

    var EVAL_FLAG_KEY = 'zdos_feature_oc_employee_ai_eval_v1';
    var EVAL_VERSION = 'ui-003c3-phase3-1.0';

    function safeJsonParse(raw, def) {
        try {
            return raw ? JSON.parse(raw) : def;
        } catch (_) {
            return def;
        }
    }

    function getEvalConsoleConfig() {
        var def = {
            employeeAiEvalConsoleEnabled: false,
            autoRenderOnLoad: true,
            logVerboseRows: false
        };
        try {
            if (!global.localStorage) return def;
            var stored = safeJsonParse(global.localStorage.getItem(EVAL_FLAG_KEY), null);
            if (!stored || typeof stored !== 'object') return def;
            return {
                employeeAiEvalConsoleEnabled: stored.employeeAiEvalConsoleEnabled === true,
                autoRenderOnLoad: stored.autoRenderOnLoad !== false,
                logVerboseRows: stored.logVerboseRows === true
            };
        } catch (_) {
            return def;
        }
    }

    function isEvaluationConsoleEnabled() {
        return getEvalConsoleConfig().employeeAiEvalConsoleEnabled === true;
    }

    if (!isEvaluationConsoleEnabled()) {
        global.ZDOSOperationCenterEmployeeAiEvalConsole = {
            EVAL_FLAG_KEY: EVAL_FLAG_KEY,
            EVAL_VERSION: EVAL_VERSION,
            isEvaluationConsoleEnabled: isEvaluationConsoleEnabled,
            getEvalConsoleConfig: getEvalConsoleConfig,
            loaded: false,
            displaySurface: 'rule-only'
        };
        return;
    }

    var memoryDevReports = [];
    var memoryDevReportSeq = 0;
    var MAX_MEMORY_REPORTS = 10;

    function getHarness() {
        return global.ZDOSOperationCenterEmployeeAiDevHarness || null;
    }

    function getShadowAdapter() {
        return global.ZDOSOperationCenterAiShadowAdapter || null;
    }

    function resolveSignalId(record) {
        if (!record) return null;
        if (record.pipelineRecord && record.pipelineRecord.primary) {
            return record.pipelineRecord.primary.id || null;
        }
        if (record.ruleCopilotDisplay && record.ruleCopilotDisplay.signalId) {
            return record.ruleCopilotDisplay.signalId;
        }
        if (record.pipelineResult && record.pipelineResult.copilotMessage &&
            record.pipelineResult.copilotMessage.signalId) {
            return record.pipelineResult.copilotMessage.signalId;
        }
        return null;
    }

    function resolveRuleCopilotOutput(record) {
        if (record && record.ruleCopilotDisplay) {
            return Object.assign({}, record.ruleCopilotDisplay);
        }
        if (record && record.pipelineRecord && record.pipelineRecord.ruleCopilot) {
            return Object.assign({}, record.pipelineRecord.ruleCopilot);
        }
        return null;
    }

    function resolveAiOutput(record) {
        if (record && record.pipelineRecord && record.pipelineRecord.aiOutput) {
            return Object.assign({}, record.pipelineRecord.aiOutput);
        }
        return null;
    }

    function resolveValidatorResult(record) {
        if (record && record.pipelineRecord && record.pipelineRecord.validatorResult) {
            return Object.assign({}, record.pipelineRecord.validatorResult);
        }
        return null;
    }

    function buildEvaluationResult(record) {
        var Shadow = getShadowAdapter();
        var aiOutput = resolveAiOutput(record);
        var validatorResult = resolveValidatorResult(record);
        var ruleCopilot = resolveRuleCopilotOutput(record);
        var primary = record && record.pipelineRecord ? record.pipelineRecord.primary : null;
        var pr = record && record.pipelineResult ? record.pipelineResult : {};

        if (Shadow && typeof Shadow.runEvaluation === 'function' && aiOutput && validatorResult) {
            var shadowEval = Shadow.runEvaluation(
                aiOutput,
                ruleCopilot,
                validatorResult,
                primary
            );
            var overall = 'pass';
            if (pr.fallback || pr.source === 'rule' || !validatorResult.pass) {
                overall = pr.skipped ? 'skipped' : 'fail';
            } else if (shadowEval.safety === 'fail' || shadowEval.signalFidelity === 'fail') {
                overall = 'fail';
            }
            return {
                overall: overall,
                accuracy: shadowEval.accuracy,
                signalFidelity: shadowEval.signalFidelity,
                safety: shadowEval.safety,
                usefulness: shadowEval.usefulness,
                notes: shadowEval.notes,
                displaySurface: 'rule-only'
            };
        }

        var pass = !!(validatorResult && validatorResult.pass && !pr.fallback &&
            pr.source === 'employee-ai-dev');
        return {
            overall: pr.skipped ? 'skipped' : (pass ? 'pass' : 'fail'),
            accuracy: pass ? 'pass' : 'fail',
            signalFidelity: pass ? 'pass' : 'na',
            safety: validatorResult && validatorResult.pass ? 'pass' : 'fail',
            usefulness: pass ? 'pass' : 'na',
            notes: [pr.reason || 'no_shadow_evaluator'],
            displaySurface: 'rule-only'
        };
    }

    function normalizeHarnessRecord(record) {
        var evaluationResult = buildEvaluationResult(record);
        var validatorResult = resolveValidatorResult(record);
        var passFail = evaluationResult.overall === 'pass' ? 'pass' : 'fail';
        if (evaluationResult.overall === 'skipped') {
            passFail = 'skipped';
        }

        return {
            harnessRecordId: record.id,
            createdAt: record.createdAt,
            scenarioId: record.snapshotMeta && record.snapshotMeta.scenarioId
                ? record.snapshotMeta.scenarioId
                : null,
            snapshotSource: record.snapshotMeta && record.snapshotMeta.source
                ? record.snapshotMeta.source
                : null,
            signalId: resolveSignalId(record),
            ruleCopilotOutput: resolveRuleCopilotOutput(record),
            aiOutput: resolveAiOutput(record),
            validatorResult: validatorResult,
            evaluationResult: evaluationResult,
            passFail: passFail,
            displaySurface: 'rule-only',
            uiApply: false,
            pipelineSource: record.pipelineResult && record.pipelineResult.source,
            fallback: !!(record.pipelineResult && record.pipelineResult.fallback),
            shadowComparison: record.shadowComparison || null
        };
    }

    function readHarnessEvalRows() {
        var Harness = getHarness();
        if (!Harness || typeof Harness.getHarnessRecords !== 'function') {
            return [];
        }
        return Harness.getHarnessRecords().map(normalizeHarnessRecord);
    }

    function applyFilters(rows, filters) {
        filters = filters || {};
        var out = rows.slice();

        if (filters.passFail && filters.passFail !== 'all') {
            out = out.filter(function (row) {
                return row.passFail === filters.passFail;
            });
        }

        if (filters.scenarioId) {
            var sid = String(filters.scenarioId);
            out = out.filter(function (row) {
                return row.scenarioId === sid;
            });
        }

        if (filters.signalId) {
            var sig = String(filters.signalId);
            out = out.filter(function (row) {
                return row.signalId === sig;
            });
        }

        return out;
    }

    function listScenarioIds() {
        var ids = {};
        readHarnessEvalRows().forEach(function (row) {
            if (row.scenarioId) ids[row.scenarioId] = true;
        });
        return Object.keys(ids).sort();
    }

    function buildSummaryTable(rows) {
        return rows.map(function (row) {
            return {
                harnessRecordId: row.harnessRecordId,
                scenarioId: row.scenarioId || '—',
                signalId: row.signalId || '—',
                passFail: row.passFail,
                validatorPass: row.validatorResult ? row.validatorResult.pass : null,
                evalOverall: row.evaluationResult ? row.evaluationResult.overall : null,
                pipelineSource: row.pipelineSource,
                fallback: row.fallback
            };
        });
    }

    function renderToDevConsole(filters, options) {
        options = options || {};
        var cfg = getEvalConsoleConfig();
        var rows = applyFilters(readHarnessEvalRows(), filters);

        if (typeof console !== 'undefined') {
            if (console.info) {
                console.info(
                    '[ZDOS Employee AI Eval Console]',
                    EVAL_VERSION,
                    'rows:',
                    rows.length,
                    'displaySurface: rule-only'
                );
            }
            if (console.table && rows.length) {
                console.table(buildSummaryTable(rows));
            }
            if (cfg.logVerboseRows || options.verbose) {
                rows.forEach(function (row, idx) {
                    if (console.groupCollapsed) {
                        console.groupCollapsed('Eval row #' + (idx + 1) + ' ' + (row.signalId || ''));
                    }
                    if (console.debug) {
                        console.debug('signalId', row.signalId);
                        console.debug('ruleCopilotOutput', row.ruleCopilotOutput);
                        console.debug('aiOutput', row.aiOutput);
                        console.debug('validatorResult', row.validatorResult);
                        console.debug('evaluationResult', row.evaluationResult);
                    }
                    if (console.groupEnd) console.groupEnd();
                });
            }
        }

        return {
            evalVersion: EVAL_VERSION,
            displaySurface: 'rule-only',
            uiApply: false,
            filters: filters || {},
            rowCount: rows.length,
            rows: rows
        };
    }

    function pushMemoryReport(report) {
        memoryDevReports.push(report);
        while (memoryDevReports.length > MAX_MEMORY_REPORTS) {
            memoryDevReports.shift();
        }
    }

    function exportDevReport(filters) {
        var rows = applyFilters(readHarnessEvalRows(), filters);
        memoryDevReportSeq += 1;
        var report = {
            id: 'emp-ai-dev-report-' + Date.now().toString(36) + '-' + memoryDevReportSeq,
            exportedAt: new Date().toISOString(),
            evalVersion: EVAL_VERSION,
            displaySurface: 'rule-only',
            uiApply: false,
            filters: filters || {},
            summary: {
                total: rows.length,
                pass: rows.filter(function (r) { return r.passFail === 'pass'; }).length,
                fail: rows.filter(function (r) { return r.passFail === 'fail'; }).length,
                skipped: rows.filter(function (r) { return r.passFail === 'skipped'; }).length
            },
            rows: rows
        };
        pushMemoryReport(report);

        if (typeof console !== 'undefined' && console.info) {
            console.info('[ZDOS Employee AI Eval Console] exportDevReport (memory only)', report.id);
        }

        return report;
    }

    function getDevReportsInMemory() {
        return memoryDevReports.slice();
    }

    function getLastDevReport() {
        if (!memoryDevReports.length) return null;
        return memoryDevReports[memoryDevReports.length - 1];
    }

    function clearDevReportsInMemory() {
        memoryDevReports = [];
    }

    var api = {
        EVAL_FLAG_KEY: EVAL_FLAG_KEY,
        EVAL_VERSION: EVAL_VERSION,
        loaded: true,
        displaySurface: 'rule-only',
        isEvaluationConsoleEnabled: isEvaluationConsoleEnabled,
        getEvalConsoleConfig: getEvalConsoleConfig,
        readHarnessEvalRows: readHarnessEvalRows,
        applyFilters: applyFilters,
        listScenarioIds: listScenarioIds,
        renderToDevConsole: renderToDevConsole,
        exportDevReport: exportDevReport,
        getDevReportsInMemory: getDevReportsInMemory,
        getLastDevReport: getLastDevReport,
        clearDevReportsInMemory: clearDevReportsInMemory,
        normalizeHarnessRecord: normalizeHarnessRecord,
        buildEvaluationResult: buildEvaluationResult
    };

    global.ZDOSOperationCenterEmployeeAiEvalConsole = api;

    var bootCfg = getEvalConsoleConfig();
    if (bootCfg.autoRenderOnLoad && typeof console !== 'undefined' && console.info) {
        console.info(
            '[ZDOS Employee AI Eval Console] ready —',
            'ZDOSOperationCenterEmployeeAiEvalConsole.renderToDevConsole()',
            '| exportDevReport()'
        );
        if (readHarnessEvalRows().length) {
            renderToDevConsole({}, { verbose: false });
        }
    }
})(typeof window !== 'undefined' ? window : globalThis);
