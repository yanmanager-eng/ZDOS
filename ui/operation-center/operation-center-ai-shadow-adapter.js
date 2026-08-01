/**
 * UI-003B | AI Copilot Shadow Pipeline (dev-only, deterministic stub, no LLM)
 */
(function (global) {
    'use strict';

    var SHADOW_FLAG_KEY = 'zdos_feature_oc_ai_shadow_v1';
    var REGISTRY_VERSION = '1.0.0';
    var AI_LAYER_VERSION = 'ui-003b-shadow-1.0';
    var DEFAULT_MAX_RECORDS = 20;

    var INTENT_BY_SIGNAL = {
        'sales-pending-review': 'open_review_center',
        'sales-missing-today': 'open_sales',
        'unread-notification': 'open_notifications',
        'workforce-no-schedule-today': 'open_scheduling',
        'workforce-leave-today': 'open_scheduling'
    };

    var ALLOWED_INTENTS = [
        'open_review_center',
        'open_sales',
        'open_scheduling',
        'open_notifications',
        'none'
    ];

    var LEVEL_ESCALATION_PHRASES = [
        '重大異常',
        '緊急',
        'critical',
        '立即停業',
        'alert'
    ];

    var PII_PATTERNS = [
        /\b09\d{8}\b/,
        /\b\d{2,3}-\d{3,4}-\d{4}\b/,
        /@[a-z0-9.-]+\.[a-z]{2,}/i
    ];

    /** In-memory ring buffer only — no business localStorage, no Supabase */
    var shadowRingBuffer = [];
    var recordSeq = 0;

    function safeJsonParse(raw, def) {
        try {
            return raw ? JSON.parse(raw) : def;
        } catch (_) {
            return def;
        }
    }

    function getShadowFeatureConfig() {
        var def = {
            aiCopilotShadowEnabled: false,
            shadowLogToConsole: true,
            shadowMaxRecords: DEFAULT_MAX_RECORDS,
            includeNonPrimarySignals: false
        };
        try {
            if (!global.localStorage) return def;
            var stored = safeJsonParse(global.localStorage.getItem(SHADOW_FLAG_KEY), null);
            if (!stored || typeof stored !== 'object') return def;
            return {
                aiCopilotShadowEnabled: stored.aiCopilotShadowEnabled === true,
                shadowLogToConsole: stored.shadowLogToConsole !== false,
                shadowMaxRecords: Number(stored.shadowMaxRecords) || DEFAULT_MAX_RECORDS,
                includeNonPrimarySignals: stored.includeNonPrimarySignals === true
            };
        } catch (_) {
            return def;
        }
    }

    function isShadowPipelineEnabled() {
        return getShadowFeatureConfig().aiCopilotShadowEnabled === true;
    }

    function hashString(str) {
        var s = String(str || '');
        var h = 5381;
        for (var i = 0; i < s.length; i++) {
            h = ((h << 5) + h + s.charCodeAt(i)) | 0;
        }
        return 'ctx-' + (h >>> 0).toString(16);
    }

    function newRecordId() {
        recordSeq += 1;
        return 'shadow-' + Date.now().toString(36) + '-' + recordSeq;
    }

    function pickPrimarySignal(signals) {
        if (!signals || !signals.length) return null;
        if (global.ZDOSOperationCenterSignalProvider &&
            typeof global.ZDOSOperationCenterSignalProvider.pickPrimarySignal === 'function') {
            return global.ZDOSOperationCenterSignalProvider.pickPrimarySignal(signals);
        }
        return signals[0];
    }

    function buildContextSnapshot(data, ctx, meta) {
        var cards = data && data.kpiCards ? data.kpiCards : [];
        function cardHint(id) {
            var c = cards.filter(function (k) { return k.id === id; })[0];
            return c ? { empty: !!c.empty, meta: String(c.meta || '') } : { empty: true, meta: '' };
        }
        return {
            businessDate: String(ctx && ctx.businessDate || ''),
            storeLabel: String(ctx && ctx.storeName || ''),
            storeCode: String(ctx && ctx.storeCode || ''),
            operationStatus: data && data.operationStatus ? data.operationStatus : null,
            kpiSummary: {
                sales: cardHint('sales'),
                attendance: cardHint('attendance'),
                approvals: cardHint('approvals'),
                notifications: cardHint('notifications')
            },
            dataSourceHints: {
                salesSource: meta && meta.salesSource || null,
                notificationsSource: meta && meta.notificationsSource || null,
                workforceSource: meta && meta.workforceSource || null
            },
            signalRegistryVersion: data && data.signalRegistryVersion ||
                (global.ZDOSOperationCenterSignalRegistry &&
                    global.ZDOSOperationCenterSignalRegistry.REGISTRY_VERSION) ||
                REGISTRY_VERSION
        };
    }

    function buildPermissionScope(ctx, shadowCfg) {
        return {
            employeeId: String(ctx && ctx.employeeId || ''),
            canReviewSales: !!(ctx && ctx.canReviewSales),
            canUseOperationCenter: true,
            allowedSignalSources: ['sales', 'notifications', 'workforce'],
            allowedStoreCodes: ctx && ctx.storeCode ? [String(ctx.storeCode).trim().toUpperCase()] : [],
            supabaseSessionReady: !!(ctx && ctx.supabaseSessionReady),
            aiCopilotShadowEnabled: !!(shadowCfg && shadowCfg.aiCopilotShadowEnabled)
        };
    }

    function buildShadowInput(data, ctx, meta, shadowCfg) {
        var signals = Array.isArray(data && data.operationSignals) ? data.operationSignals.slice() : [];
        if (!shadowCfg.includeNonPrimarySignals && signals.length > 1) {
            var primary = pickPrimarySignal(signals);
            signals = primary ? [primary] : [];
        }
        var contextSnapshot = buildContextSnapshot(data, ctx, meta);
        return {
            signals: signals,
            contextSnapshot: contextSnapshot,
            permissionScope: buildPermissionScope(ctx, shadowCfg),
            contextSnapshotHash: hashString(JSON.stringify(contextSnapshot))
        };
    }

    function deterministicStub(primary) {
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
                producer: 'deterministic-stub'
            };
        }
        var intent = INTENT_BY_SIGNAL[primary.id] || 'none';
        return {
            summary: String(primary.title || primary.name || '營運提醒'),
            reason: String(primary.message || ''),
            suggested_action: {
                label: intent === 'none' ? null : '查看詳情',
                intent: intent,
                rationale: 'Shadow Stub：依 Signal Registry 映射 intent'
            },
            related_signal_id: primary.id,
            producer: 'deterministic-stub'
        };
    }

    function registryHasSignal(id) {
        if (!id) return false;
        if (global.ZDOSOperationCenterSignalRegistry &&
            typeof global.ZDOSOperationCenterSignalRegistry.getRegistryEntry === 'function') {
            return !!global.ZDOSOperationCenterSignalRegistry.getRegistryEntry(id);
        }
        return INTENT_BY_SIGNAL.hasOwnProperty(id);
    }

    function extractNumbers(text) {
        var found = [];
        var re = /\d+(?:\.\d+)?/g;
        var m;
        while ((m = re.exec(String(text || ''))) !== null) {
            found.push(m[0]);
        }
        return found;
    }

    function numbersAllowedInOutput(nums, input, primary) {
        if (!nums.length) return true;
        var corpus = JSON.stringify(input.signals) + JSON.stringify(input.contextSnapshot);
        if (primary && primary.message) corpus += primary.message;
        return nums.every(function (n) {
            return corpus.indexOf(n) !== -1;
        });
    }

    function containsPii(text) {
        var t = String(text || '');
        for (var i = 0; i < PII_PATTERNS.length; i++) {
            if (PII_PATTERNS[i].test(t)) return true;
        }
        return false;
    }

    function impliesLevelEscalation(text, primaryLevel) {
        if (!primaryLevel || primaryLevel === 'critical') return false;
        var t = String(text || '').toLowerCase();
        if (primaryLevel === 'info') {
            for (var i = 0; i < LEVEL_ESCALATION_PHRASES.length; i++) {
                if (t.indexOf(LEVEL_ESCALATION_PHRASES[i].toLowerCase()) !== -1) return true;
            }
        }
        return false;
    }

    function validateAiOutput(aiOutput, input, primary) {
        var errors = [];
        var warnings = [];
        var checks = {
            signal_exists: true,
            within_input: true,
            no_forbidden_info: true,
            signal_level_unchanged: true,
            schema_valid: true
        };

        if (!aiOutput || typeof aiOutput !== 'object') {
            checks.schema_valid = false;
            errors.push('schema: aiOutput missing');
            return { pass: false, errors: errors, warnings: warnings, checks: checks };
        }

        if (typeof aiOutput.summary !== 'string' || typeof aiOutput.reason !== 'string') {
            checks.schema_valid = false;
            errors.push('schema: summary/reason required strings');
        }
        if (!aiOutput.suggested_action || typeof aiOutput.suggested_action !== 'object') {
            checks.schema_valid = false;
            errors.push('schema: suggested_action required');
        } else if (ALLOWED_INTENTS.indexOf(aiOutput.suggested_action.intent) === -1) {
            checks.schema_valid = false;
            errors.push('schema: invalid intent');
        }

        if (primary && aiOutput.related_signal_id) {
            if (!registryHasSignal(aiOutput.related_signal_id)) {
                checks.signal_exists = false;
                errors.push('related_signal_id not in registry');
            }
            if (aiOutput.related_signal_id !== primary.id) {
                errors.push('related_signal_id !== primary');
            }
        } else if (primary && !aiOutput.related_signal_id) {
            errors.push('missing related_signal_id when primary exists');
        }

        var blob = aiOutput.summary + ' ' + aiOutput.reason;
        var nums = extractNumbers(blob);
        if (!numbersAllowedInOutput(nums, input, primary)) {
            checks.within_input = false;
            errors.push('numeric values not found in input');
        }

        if (containsPii(blob)) {
            checks.no_forbidden_info = false;
            errors.push('possible PII detected');
        }

        if (primary && impliesLevelEscalation(blob, primary.level)) {
            checks.signal_level_unchanged = false;
            errors.push('text implies level escalation');
        }

        if (primary && primary.id === 'sales-pending-review' && !input.permissionScope.canReviewSales) {
            checks.within_input = false;
            errors.push('sales-pending-review without canReviewSales');
        }

        var pass = errors.length === 0 && checks.schema_valid;
        return { pass: pass, errors: errors, warnings: warnings, checks: checks };
    }

    function runEvaluation(aiOutput, ruleBasedCopilot, validatorResult, primary) {
        var notes = [];
        var accuracy = 'pass';
        var signalFidelity = 'pass';
        var safety = validatorResult.pass ? 'pass' : 'fail';
        var usefulness = 'pass';

        if (!primary) {
            return {
                accuracy: 'na',
                signalFidelity: 'na',
                safety: safety,
                usefulness: 'na',
                notes: ['no primary signal']
            };
        }

        if (aiOutput.related_signal_id !== primary.id) {
            signalFidelity = 'fail';
            notes.push('related_signal_id mismatch primary');
        }
        if (ruleBasedCopilot && ruleBasedCopilot.signalId &&
            aiOutput.related_signal_id !== ruleBasedCopilot.signalId) {
            signalFidelity = 'warn';
            notes.push('rule copilot signalId differs from ai related_signal_id');
        }
        if (aiOutput.reason !== primary.message) {
            notes.push('stub reason differs from primary message (expected for paraphrase tests)');
        }
        if (!validatorResult.pass) {
            accuracy = 'fail';
            safety = 'fail';
        }

        return {
            accuracy: accuracy,
            signalFidelity: signalFidelity,
            safety: safety,
            usefulness: usefulness,
            notes: notes
        };
    }

    function pushShadowRecord(record, maxRecords) {
        shadowRingBuffer.push(record);
        while (shadowRingBuffer.length > maxRecords) {
            shadowRingBuffer.shift();
        }
    }

    function buildRuleBasedCopilotRef(data) {
        return data && data.copilotMessage ? {
            headline: data.copilotMessage.headline,
            body: data.copilotMessage.body,
            signalId: data.copilotMessage.signalId || null,
            registryVersion: data.copilotMessage.registryVersion || data.signalRegistryVersion || null
        } : null;
    }

    function attachValidatorToOutput(aiOutput, validatorResult) {
        aiOutput.validator_result = {
            pass: validatorResult.pass,
            errors: validatorResult.errors,
            warnings: validatorResult.warnings,
            checks: validatorResult.checks
        };
        return aiOutput;
    }

    function completeShadowRecord(data, input, primary, aiOutput, cfg) {
        var validatorResult = validateAiOutput(aiOutput, input, primary);
        attachValidatorToOutput(aiOutput, validatorResult);

        var ruleBasedCopilot = buildRuleBasedCopilotRef(data);
        var evaluationResult = runEvaluation(aiOutput, ruleBasedCopilot, validatorResult, primary);

        var record = {
            id: newRecordId(),
            createdAt: new Date().toISOString(),
            inputSignals: input.signals,
            contextSnapshotHash: input.contextSnapshotHash,
            aiOutput: aiOutput,
            ruleBasedCopilot: ruleBasedCopilot,
            validatorResult: validatorResult,
            evaluationResult: evaluationResult
        };

        pushShadowRecord(record, cfg.shadowMaxRecords);

        if (cfg.shadowLogToConsole && typeof console !== 'undefined' && console.debug) {
            console.debug('[ZDOS AI Shadow]', record);
        }

        return record;
    }

    function fallbackStubOutput(primary, reason) {
        var out = deterministicStub(primary);
        out.producer = 'deterministic-stub-llm-fallback';
        out.llmFallbackReason = reason || 'llm_failed';
        return out;
    }

    function resolveGeneratorOutput(input, primary, cfg) {
        var Llm = global.ZDOSOperationCenterAiLlmShadowAdapter;
        var useLlm = Llm && typeof Llm.isLlmShadowAdapterEnabled === 'function' &&
            Llm.isLlmShadowAdapterEnabled();

        if (!useLlm) {
            return Promise.resolve({
                aiOutput: deterministicStub(primary),
                generator: 'deterministic-stub'
            });
        }

        if (typeof Llm.generateShadowCopilotOutput !== 'function') {
            return Promise.resolve({
                aiOutput: fallbackStubOutput(primary, 'llm_adapter_missing'),
                generator: 'fallback-stub'
            });
        }

        return Llm.generateShadowCopilotOutput(input, primary).then(function (gen) {
            if (!gen || !gen.ok || !gen.output) {
                return {
                    aiOutput: fallbackStubOutput(primary, gen && gen.error ? gen.error : 'api_error'),
                    generator: 'fallback-stub'
                };
            }
            var candidate = gen.output;
            var trial = validateAiOutput(candidate, input, primary);
            if (!trial.pass) {
                return {
                    aiOutput: fallbackStubOutput(primary, 'validator_fail'),
                    generator: 'fallback-stub'
                };
            }
            return { aiOutput: candidate, generator: 'llm-gateway-mock' };
        }).catch(function (err) {
            return {
                aiOutput: fallbackStubOutput(primary, err && err.message ? err.message : 'timeout'),
                generator: 'fallback-stub'
            };
        });
    }

    function runShadowPipeline(data, ctx, meta) {
        var cfg = getShadowFeatureConfig();
        if (!cfg.aiCopilotShadowEnabled) {
            return Promise.resolve(null);
        }

        var input = buildShadowInput(data, ctx, meta, cfg);
        var primary = pickPrimarySignal(input.signals);

        return resolveGeneratorOutput(input, primary, cfg).then(function (resolved) {
            if (resolved.aiOutput && resolved.generator) {
                resolved.aiOutput.shadowGenerator = resolved.generator;
            }
            return completeShadowRecord(data, input, primary, resolved.aiOutput, cfg);
        });
    }

    function getShadowRecords() {
        return shadowRingBuffer.slice();
    }

    function clearShadowRecords() {
        shadowRingBuffer = [];
    }

    global.ZDOSOperationCenterAiShadowAdapter = {
        SHADOW_FLAG_KEY: SHADOW_FLAG_KEY,
        AI_LAYER_VERSION: AI_LAYER_VERSION,
        getShadowFeatureConfig: getShadowFeatureConfig,
        isShadowPipelineEnabled: isShadowPipelineEnabled,
        buildShadowInput: buildShadowInput,
        deterministicStub: deterministicStub,
        validateAiOutput: validateAiOutput,
        runEvaluation: runEvaluation,
        runShadowPipeline: runShadowPipeline,
        getShadowRecords: getShadowRecords,
        clearShadowRecords: clearShadowRecords
    };
})(typeof window !== 'undefined' ? window : globalThis);
