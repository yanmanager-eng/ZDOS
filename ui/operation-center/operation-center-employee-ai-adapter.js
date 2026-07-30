/**
 * UI-003C.3 Phase 1 + UI-003C.5 Gateway wiring | Employee AI Adapter (Beta Dev)
 */
(function (global) {
    'use strict';

    var EMPLOYEE_AI_FLAG_KEY = 'zdos_feature_oc_ai_copilot_v1';
    var REGISTRY_VERSION = '1.0.0';
    var PROMPT_VERSION = 'ui-003b1-prompt-1.0';
    var EMPLOYEE_AI_SPEC_VERSION = 'ui-003c1-1.0';
    var AI_LAYER_VERSION = 'ui-003c5-phase1-gateway-1.0';
    var DEFAULT_GATEWAY_TIMEOUT_MS = 12000;
    var DEFAULT_GATEWAY_FUNCTION = 'oc-ai-shadow-gateway';
    var DEFAULT_MAX_DEV_RECORDS = 20;

    var INTENT_BY_SIGNAL = {
        'sales-pending-review': 'open_review_center',
        'sales-missing-today': 'open_sales',
        'unread-notification': 'open_notifications',
        'workforce-no-schedule-today': 'open_scheduling',
        'workforce-leave-today': 'open_scheduling'
    };

    var APPROVAL_DENYLIST = [
        '已批准',
        '已核准',
        'approved',
        '已同意審核'
    ];

    var devRingBuffer = [];
    var recordSeq = 0;

    function safeJsonParse(raw, def) {
        try {
            return raw ? JSON.parse(raw) : def;
        } catch (_) {
            return def;
        }
    }

    function getEmployeeAiFeatureConfig() {
        var def = {
            employeeAiCopilotEnabled: false,
            aiCopilotEnabled: false,
            devLogToConsole: true,
            devMaxRecords: DEFAULT_MAX_DEV_RECORDS,
            simulateGeneratorFailure: false,
            employeeAiShadowProvider: 'mock-local',
            employeeAiGatewayInvokeEnabled: false,
            gatewayFunctionName: DEFAULT_GATEWAY_FUNCTION,
            gatewayTimeoutMs: DEFAULT_GATEWAY_TIMEOUT_MS,
            simulateGatewayTimeout: false,
            simulateProviderError: false
        };
        try {
            if (!global.localStorage) return def;
            var stored = safeJsonParse(global.localStorage.getItem(EMPLOYEE_AI_FLAG_KEY), null);
            if (!stored || typeof stored !== 'object') return def;
            var Gw = global.ZDOSOperationCenterEmployeeAiGatewayAdapter;
            var provider = stored.employeeAiShadowProvider != null
                ? stored.employeeAiShadowProvider
                : (stored.employeeAiGatewayEnabled === true ? 'mock-gateway' : 'mock-local');
            if (Gw && typeof Gw.normalizeProvider === 'function') {
                provider = Gw.normalizeProvider(provider);
            } else if (String(provider).toLowerCase() === 'off') {
                provider = 'off';
            }
            return {
                employeeAiCopilotEnabled: stored.employeeAiCopilotEnabled === true,
                aiCopilotEnabled: stored.aiCopilotEnabled === true,
                devLogToConsole: stored.devLogToConsole !== false,
                devMaxRecords: Number(stored.devMaxRecords) || DEFAULT_MAX_DEV_RECORDS,
                simulateGeneratorFailure: stored.simulateGeneratorFailure === true,
                employeeAiShadowProvider: provider,
                employeeAiGatewayInvokeEnabled: stored.employeeAiGatewayInvokeEnabled === true,
                gatewayFunctionName: String(stored.gatewayFunctionName || DEFAULT_GATEWAY_FUNCTION).trim() ||
                    DEFAULT_GATEWAY_FUNCTION,
                gatewayTimeoutMs: Number(stored.gatewayTimeoutMs) || DEFAULT_GATEWAY_TIMEOUT_MS,
                simulateGatewayTimeout: stored.simulateGatewayTimeout === true,
                simulateProviderError: stored.simulateProviderError === true
            };
        } catch (_) {
            return def;
        }
    }

    /** Kill switch (aiCopilotEnabled) ∧ employee path flag — default both false */
    function isEmployeeAiCopilotEnabled() {
        var cfg = getEmployeeAiFeatureConfig();
        return cfg.employeeAiCopilotEnabled === true && cfg.aiCopilotEnabled === true;
    }

    function pickPrimarySignal(signals) {
        if (!signals || !signals.length) return null;
        if (global.ZDOSOperationCenterSignalProvider &&
            typeof global.ZDOSOperationCenterSignalProvider.pickPrimarySignal === 'function') {
            return global.ZDOSOperationCenterSignalProvider.pickPrimarySignal(signals);
        }
        return signals[0];
    }

    function buildEmployeePermissionScope(ctx, empCfg) {
        return {
            employeeId: String(ctx && ctx.employeeId || ''),
            canReviewSales: !!(ctx && ctx.canReviewSales),
            canUseOperationCenter: !!(ctx && ctx.canUseOperationCenter !== false),
            allowedSignalSources: ['sales', 'notifications', 'workforce'],
            allowedStoreCodes: ctx && ctx.storeCode
                ? [String(ctx.storeCode).trim().toUpperCase()]
                : [],
            supabaseSessionReady: !!(ctx && ctx.supabaseSessionReady),
            employeeAiCopilotEnabled: !!(empCfg && empCfg.employeeAiCopilotEnabled),
            aiCopilotEnabled: !!(empCfg && empCfg.aiCopilotEnabled)
        };
    }

    function buildEmployeeAiInput(data, ctx, meta, empCfg) {
        empCfg = empCfg || getEmployeeAiFeatureConfig();
        var Shadow = global.ZDOSOperationCenterAiShadowAdapter;
        var input;
        if (Shadow && typeof Shadow.buildShadowInput === 'function') {
            input = Shadow.buildShadowInput(data, ctx, meta, {
                aiCopilotShadowEnabled: false,
                includeNonPrimarySignals: false
            });
        } else {
            var signals = Array.isArray(data && data.operationSignals) ? data.operationSignals.slice() : [];
            if (signals.length > 1) {
                var primaryOnly = pickPrimarySignal(signals);
                signals = primaryOnly ? [primaryOnly] : [];
            }
            input = {
                signals: signals,
                contextSnapshot: {},
                permissionScope: buildEmployeePermissionScope(ctx, empCfg),
                contextSnapshotHash: 'employee-ai-no-shadow'
            };
        }
        input.permissionScope = buildEmployeePermissionScope(ctx, empCfg);
        input.registryVersion = String(
            data && data.signalRegistryVersion ||
            (global.ZDOSOperationCenterSignalRegistry &&
                global.ZDOSOperationCenterSignalRegistry.REGISTRY_VERSION) ||
            REGISTRY_VERSION
        );
        input.promptVersion = PROMPT_VERSION;
        return input;
    }

    function isPrimaryAllowedForEmployeeAi(primary, permissionScope) {
        if (!permissionScope || permissionScope.canUseOperationCenter === false) {
            return { allowed: false, reason: 'operation_center_not_allowed' };
        }
        if (!primary) {
            return { allowed: true, reason: 'no_primary' };
        }
        if (primary.id === 'sales-pending-review' && !permissionScope.canReviewSales) {
            return { allowed: false, reason: 'sales_review_forbidden' };
        }
        return { allowed: true, reason: 'ok' };
    }

    function containsApprovalLanguage(text) {
        var t = String(text || '');
        for (var i = 0; i < APPROVAL_DENYLIST.length; i++) {
            if (t.indexOf(APPROVAL_DENYLIST[i]) !== -1) return true;
        }
        return false;
    }

    function validateEmployeeAiOutput(aiOutput, input, primary) {
        var Shadow = global.ZDOSOperationCenterAiShadowAdapter;
        var base = Shadow && typeof Shadow.validateAiOutput === 'function'
            ? Shadow.validateAiOutput(aiOutput, input, primary)
            : {
                pass: false,
                errors: ['shadow_validator_unavailable'],
                warnings: [],
                checks: { schema_valid: false }
            };

        if (!base.pass) {
            return base;
        }

        var blob = String(aiOutput.summary || '') + ' ' + String(aiOutput.reason || '');
        if (containsApprovalLanguage(blob)) {
            return {
                pass: false,
                errors: base.errors.concat(['forbidden approval language']),
                warnings: base.warnings,
                checks: Object.assign({}, base.checks, { no_forbidden_info: false })
            };
        }

        return base;
    }

    function getRuleCopilotFallbackMessage(data) {
        if (data && data.copilotMessage && typeof data.copilotMessage === 'object') {
            return Object.assign({}, data.copilotMessage);
        }
        return {
            label: 'Operation Copilot',
            headline: '目前無主動提醒',
            body: '系統未偵測到需優先處理的營運事項。',
            actionLabel: null,
            empty: true,
            signalId: null,
            registryVersion: REGISTRY_VERSION
        };
    }

    function mapAiOutputToCopilotMessage(aiOutput, registryVersion) {
        if (!aiOutput || typeof aiOutput !== 'object') {
            return getRuleCopilotFallbackMessage(null);
        }
        var action = aiOutput.suggested_action || {};
        var intent = action.intent || 'none';
        var label = action.label;
        if (label == null && intent !== 'none') {
            label = '查看詳情';
        }
        var relatedId = aiOutput.related_signal_id || null;
        return {
            label: 'Operation Copilot',
            headline: String(aiOutput.summary || ''),
            body: String(aiOutput.reason || ''),
            actionLabel: label,
            empty: !relatedId,
            signalId: relatedId,
            registryVersion: registryVersion || REGISTRY_VERSION,
            employeeAiMeta: {
                intent: intent,
                producer: aiOutput.producer || 'employee-ai-dev',
                employeeAiSpecVersion: EMPLOYEE_AI_SPEC_VERSION,
                promptVersion: PROMPT_VERSION
            }
        };
    }

    function deterministicDevStub(primary) {
        if (!primary) {
            return {
                summary: '目前無主動提醒',
                reason: '系統未偵測到需優先處理的營運事項。',
                suggested_action: {
                    label: null,
                    intent: 'none',
                    rationale: '無 Primary Signal'
                },
                related_signal_id: null,
                producer: 'employee-ai-dev-stub'
            };
        }
        var intent = INTENT_BY_SIGNAL[primary.id] || 'none';
        return {
            summary: String(primary.title || primary.name || '營運提醒'),
            reason: String(primary.message || ''),
            suggested_action: {
                label: intent === 'none' ? null : '查看詳情',
                intent: intent,
                rationale: 'Employee AI Phase 1 dev stub（无 Gateway）'
            },
            related_signal_id: primary.id,
            producer: 'employee-ai-dev-stub',
            meta: {
                registryVersion: REGISTRY_VERSION,
                promptVersion: PROMPT_VERSION,
                employeeAiSpecVersion: EMPLOYEE_AI_SPEC_VERSION
            }
        };
    }

    /**
     * Gateway invoke — delegates to C.5 Dev Gateway Adapter (Mock Gateway path).
     */
    function fetchEmployeeCopilotViaGateway(input, cfg) {
        var Gw = global.ZDOSOperationCenterEmployeeAiGatewayAdapter;
        if (!Gw || typeof Gw.fetchEmployeeCopilotViaGateway !== 'function') {
            return Promise.reject({
                ok: false,
                code: 'gateway_adapter_missing',
                message: 'UI-003C.5 gateway adapter not loaded'
            });
        }
        return Gw.fetchEmployeeCopilotViaGateway(input, cfg || getEmployeeAiFeatureConfig());
    }

    function resolveEmployeeGeneratorOutput(input, primary, cfg) {
        if (cfg.simulateGeneratorFailure) {
            return Promise.resolve({
                ok: false,
                error: 'simulated_generator_failure',
                aiOutput: null,
                generator: 'rule-fallback'
            });
        }

        var Gw = global.ZDOSOperationCenterEmployeeAiGatewayAdapter;
        if (!Gw || typeof Gw.generateEmployeeCopilotOutput !== 'function') {
            if (normalizeProviderFallback(cfg) === 'off') {
                return Promise.resolve({
                    ok: false,
                    error: 'gateway_off',
                    generator: 'rule-fallback'
                });
            }
            return Promise.resolve({
                ok: true,
                aiOutput: deterministicDevStub(primary),
                generator: 'employee-ai-dev-stub'
            });
        }

        return Gw.generateEmployeeCopilotOutput(input, primary, cfg).then(function (gen) {
            if (!gen || !gen.ok || !gen.output) {
                return {
                    ok: false,
                    error: gen && gen.error ? gen.error : 'generator_failed',
                    code: gen && gen.code ? gen.code : undefined,
                    generator: gen && gen.generator ? gen.generator : 'rule-fallback'
                };
            }
            return {
                ok: true,
                aiOutput: gen.output,
                generator: gen.generator || 'employee-gateway-mock'
            };
        });
    }

    function normalizeProviderFallback(cfg) {
        var p = String(cfg.employeeAiShadowProvider || 'mock-local').toLowerCase();
        if (p === 'off') return 'off';
        if (p === 'mock-gateway' && cfg.employeeAiGatewayInvokeEnabled !== true) return 'off';
        return p;
    }

    function newRecordId() {
        recordSeq += 1;
        return 'employee-ai-dev-' + Date.now().toString(36) + '-' + recordSeq;
    }

    function pushDevRecord(record, maxRecords) {
        devRingBuffer.push(record);
        while (devRingBuffer.length > maxRecords) {
            devRingBuffer.shift();
        }
    }

    function resolveDevGeneratorOutput(input, primary, cfg) {
        return resolveEmployeeGeneratorOutput(input, primary, cfg);
    }

    /**
     * Dev-only pipeline: never mutates DOM / snapshot; Flag OFF → Rule Copilot reference only.
     */
    function runEmployeeAiDevPipeline(data, ctx, meta) {
        var cfg = getEmployeeAiFeatureConfig();
        var ruleCopilot = getRuleCopilotFallbackMessage(data);

        if (!isEmployeeAiCopilotEnabled()) {
            return Promise.resolve({
                skipped: true,
                source: 'rule',
                uiApply: false,
                copilotMessage: ruleCopilot,
                reason: 'feature_off'
            });
        }

        var input = buildEmployeeAiInput(data, ctx, meta, cfg);
        var primary = pickPrimarySignal(input.signals);
        var permission = isPrimaryAllowedForEmployeeAi(primary, input.permissionScope);

        if (!permission.allowed) {
            return Promise.resolve({
                skipped: false,
                source: 'rule',
                uiApply: false,
                copilotMessage: ruleCopilot,
                reason: permission.reason,
                fallback: true
            });
        }

        return resolveEmployeeGeneratorOutput(input, primary, cfg).then(function (gen) {
            if (!gen || !gen.ok || !gen.aiOutput) {
                return {
                    skipped: false,
                    source: 'rule',
                    uiApply: false,
                    copilotMessage: ruleCopilot,
                    reason: gen && gen.error ? gen.error : 'generator_failed',
                    code: gen && gen.code ? gen.code : undefined,
                    generator: gen && gen.generator ? gen.generator : undefined,
                    fallback: true
                };
            }

            var validatorResult = validateEmployeeAiOutput(gen.aiOutput, input, primary);
            if (!validatorResult.pass) {
                return {
                    skipped: false,
                    source: 'rule',
                    uiApply: false,
                    copilotMessage: ruleCopilot,
                    reason: 'validator_fail',
                    validatorResult: validatorResult,
                    fallback: true
                };
            }

            var candidate = mapAiOutputToCopilotMessage(
                gen.aiOutput,
                input.registryVersion
            );
            var record = {
                id: newRecordId(),
                createdAt: new Date().toISOString(),
                input: input,
                primary: primary,
                aiOutput: gen.aiOutput,
                validatorResult: validatorResult,
                candidateCopilotMessage: candidate,
                ruleCopilot: ruleCopilot,
                generator: gen.generator,
                uiApply: false
            };
            pushDevRecord(record, cfg.devMaxRecords);

            if (cfg.devLogToConsole && typeof console !== 'undefined' && console.debug) {
                console.debug('[ZDOS Employee AI Dev]', record);
            }

            return {
                skipped: false,
                source: gen.generator === 'employee-ai-dev-stub' ||
                    gen.generator === 'employee-mock-local' ||
                    gen.generator === 'mock-local'
                    ? 'employee-ai-dev'
                    : 'employee-ai-gateway',
                uiApply: false,
                copilotMessage: candidate,
                ruleCopilot: ruleCopilot,
                validatorResult: validatorResult,
                recordId: record.id,
                generator: gen.generator,
                fallback: false
            };
        }).catch(function (err) {
            return {
                skipped: false,
                source: 'rule',
                uiApply: false,
                copilotMessage: ruleCopilot,
                reason: err && err.message ? err.message : 'pipeline_error',
                fallback: true
            };
        });
    }

    function getEmployeeAiDevRecords() {
        return devRingBuffer.slice();
    }

    function clearEmployeeAiDevRecords() {
        devRingBuffer = [];
    }

    global.ZDOSOperationCenterEmployeeAiAdapter = {
        EMPLOYEE_AI_FLAG_KEY: EMPLOYEE_AI_FLAG_KEY,
        AI_LAYER_VERSION: AI_LAYER_VERSION,
        PROMPT_VERSION: PROMPT_VERSION,
        EMPLOYEE_AI_SPEC_VERSION: EMPLOYEE_AI_SPEC_VERSION,
        getEmployeeAiFeatureConfig: getEmployeeAiFeatureConfig,
        isEmployeeAiCopilotEnabled: isEmployeeAiCopilotEnabled,
        buildEmployeePermissionScope: buildEmployeePermissionScope,
        buildEmployeeAiInput: buildEmployeeAiInput,
        isPrimaryAllowedForEmployeeAi: isPrimaryAllowedForEmployeeAi,
        validateEmployeeAiOutput: validateEmployeeAiOutput,
        mapAiOutputToCopilotMessage: mapAiOutputToCopilotMessage,
        getRuleCopilotFallbackMessage: getRuleCopilotFallbackMessage,
        deterministicDevStub: deterministicDevStub,
        fetchEmployeeCopilotViaGateway: fetchEmployeeCopilotViaGateway,
        runEmployeeAiDevPipeline: runEmployeeAiDevPipeline,
        getEmployeeAiDevRecords: getEmployeeAiDevRecords,
        clearEmployeeAiDevRecords: clearEmployeeAiDevRecords
    };
})(typeof window !== 'undefined' ? window : globalThis);
