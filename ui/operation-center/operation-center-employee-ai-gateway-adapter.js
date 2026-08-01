/**
 * UI-003C.5 | Employee AI Dev Gateway Adapter (Mock default — no real LLM key, no deploy)
 */
(function (global) {
    'use strict';

    var GATEWAY_ADAPTER_VERSION = 'ui-003c5-employee-gateway-1.0';
    var DEFAULT_GATEWAY_FUNCTION = 'oc-ai-shadow-gateway';
    var DEFAULT_GATEWAY_TIMEOUT_MS = 12000;
    var REGISTRY_VERSION = '1.0.0';
    var PROMPT_VERSION = 'ui-003b1-prompt-1.0';
    var EMPLOYEE_AI_ROUTE = 'employee-shadow';

    var PROVIDER_MOCK_LOCAL = 'mock-local';
    var PROVIDER_MOCK_GATEWAY = 'mock-gateway';
    var PROVIDER_REAL = 'real';
    var PROVIDER_OFF = 'off';

    var INTENT_BY_SIGNAL = {
        'sales-pending-review': 'open_review_center',
        'sales-missing-today': 'open_sales',
        'unread-notification': 'open_notifications',
        'workforce-no-schedule-today': 'open_scheduling',
        'workforce-leave-today': 'open_scheduling'
    };

    function normalizeProvider(value) {
        var v = String(value || PROVIDER_MOCK_LOCAL).trim().toLowerCase();
        if (v === PROVIDER_OFF || v === 'off') return PROVIDER_OFF;
        if (v === PROVIDER_MOCK_GATEWAY || v === 'mock-gateway' || v === 'gateway') {
            return PROVIDER_MOCK_GATEWAY;
        }
        if (v === PROVIDER_REAL || v === 'real') return PROVIDER_REAL;
        return PROVIDER_MOCK_LOCAL;
    }

    function readSupabaseMetaConfig() {
        if (typeof document === 'undefined') return { url: '', anonKey: '' };
        var url = String(document.querySelector('meta[name="zdos-supabase-url"]') &&
            document.querySelector('meta[name="zdos-supabase-url"]').content || '').trim();
        var anonKey = String(document.querySelector('meta[name="zdos-supabase-anon-key"]') &&
            document.querySelector('meta[name="zdos-supabase-anon-key"]').content || '').trim();
        if (!url || url.toUpperCase() === 'TODO') url = '';
        if (!anonKey || anonKey.toUpperCase() === 'TODO') anonKey = '';
        return { url: url, anonKey: anonKey };
    }

    var lazySupabaseClient = null;

    function getSupabaseClient() {
        var cfg = readSupabaseMetaConfig();
        if (!cfg.url || !cfg.anonKey || typeof global.supabase === 'undefined') return null;
        if (lazySupabaseClient) return lazySupabaseClient;
        lazySupabaseClient = global.supabase.createClient(cfg.url, cfg.anonKey, {
            auth: { persistSession: true, autoRefreshToken: true }
        });
        return lazySupabaseClient;
    }

    function buildGatewayRequestBody(input) {
        return {
            registryVersion: String(input.registryVersion || REGISTRY_VERSION),
            promptVersion: String(input.promptVersion || PROMPT_VERSION),
            signals: Array.isArray(input.signals) ? input.signals : [],
            contextSnapshot: input.contextSnapshot || {},
            permissionScope: input.permissionScope || {},
            meta: {
                aiRoute: EMPLOYEE_AI_ROUTE,
                adapterVersion: GATEWAY_ADAPTER_VERSION
            }
        };
    }

    function mapGatewayPayloadToOutput(data) {
        if (!data || data.ok !== true) return null;
        return {
            summary: String(data.summary || ''),
            reason: String(data.reason || ''),
            suggested_action: data.suggested_action || {
                label: null,
                intent: 'none',
                rationale: ''
            },
            related_signal_id: data.related_signal_id == null ? null : String(data.related_signal_id),
            producer: 'employee-gateway-mock',
            gatewayMeta: data.meta || null,
            adapterVersion: GATEWAY_ADAPTER_VERSION
        };
    }

    function emptyMockOutput() {
        return {
            summary: '目前無主動提醒',
            reason: '系統未偵測到需優先處理的營運事項。',
            suggested_action: {
                label: null,
                intent: 'none',
                rationale: '無 Primary Signal'
            },
            related_signal_id: null,
            producer: 'employee-mock-local',
            adapterVersion: GATEWAY_ADAPTER_VERSION
        };
    }

    function buildLocalMockOutput(primary) {
        if (!primary) return emptyMockOutput();
        var intent = INTENT_BY_SIGNAL[primary.id] || 'none';
        return {
            summary: String(primary.title || primary.name || '營運提醒'),
            reason: String(primary.message || ''),
            suggested_action: {
                label: intent === 'none' ? null : '查看詳情',
                intent: intent,
                rationale: 'Employee AI mock-local（C.5）'
            },
            related_signal_id: primary.id,
            producer: 'employee-mock-local',
            adapterVersion: GATEWAY_ADAPTER_VERSION
        };
    }

    function invokeWithTimeout(promiseFactory, timeoutMs) {
        return new Promise(function (resolve) {
            var settled = false;
            var timer = setTimeout(function () {
                if (settled) return;
                settled = true;
                resolve({
                    ok: false,
                    error: 'gateway_timeout',
                    code: 'timeout',
                    generator: PROVIDER_MOCK_GATEWAY
                });
            }, timeoutMs);

            promiseFactory().then(function (result) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve(result);
            }).catch(function (err) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve({
                    ok: false,
                    error: err && err.message ? err.message : 'gateway_fetch_failed',
                    code: 'gateway_error',
                    generator: PROVIDER_MOCK_GATEWAY
                });
            });
        });
    }

    function invokeMockGateway(input, cfg) {
        var client = getSupabaseClient();
        if (!client || typeof client.functions.invoke !== 'function') {
            return Promise.resolve({
                ok: false,
                error: 'supabase_client_unavailable',
                code: 'gateway_unavailable',
                generator: PROVIDER_MOCK_GATEWAY
            });
        }

        if (cfg.simulateGatewayTimeout) {
            var waitMs = Math.max(1000, cfg.gatewayTimeoutMs || DEFAULT_GATEWAY_TIMEOUT_MS) + 50;
            return invokeWithTimeout(function () {
                return new Promise(function (resolve) {
                    setTimeout(function () {
                        resolve({
                            ok: false,
                            error: 'simulated_gateway_timeout',
                            code: 'timeout',
                            generator: PROVIDER_MOCK_GATEWAY
                        });
                    }, waitMs);
                });
            }, cfg.gatewayTimeoutMs || DEFAULT_GATEWAY_TIMEOUT_MS);
        }

        var body = buildGatewayRequestBody(input);
        var fnName = String(cfg.gatewayFunctionName || DEFAULT_GATEWAY_FUNCTION).trim() ||
            DEFAULT_GATEWAY_FUNCTION;
        var timeoutMs = Math.max(1000, Number(cfg.gatewayTimeoutMs) || DEFAULT_GATEWAY_TIMEOUT_MS);

        return invokeWithTimeout(function () {
            return client.functions.invoke(fnName, { body: body }).then(function (result) {
                if (result.error) {
                    return {
                        ok: false,
                        error: result.error.message || 'gateway_error',
                        code: 'gateway_error',
                        generator: PROVIDER_MOCK_GATEWAY
                    };
                }
                var mapped = mapGatewayPayloadToOutput(result.data);
                if (!mapped) {
                    return {
                        ok: false,
                        error: 'invalid_gateway_response',
                        code: 'schema_error',
                        generator: PROVIDER_MOCK_GATEWAY
                    };
                }
                return {
                    ok: true,
                    output: mapped,
                    generator: PROVIDER_MOCK_GATEWAY
                };
            });
        }, timeoutMs);
    }

    function generateLocalMockProvider(input, primary, cfg) {
        return new Promise(function (resolve) {
            setTimeout(function () {
                if (cfg.simulateProviderError) {
                    resolve({
                        ok: false,
                        error: 'simulated_provider_error',
                        code: 'provider_error',
                        generator: PROVIDER_MOCK_LOCAL
                    });
                    return;
                }
                resolve({
                    ok: true,
                    output: buildLocalMockOutput(primary),
                    generator: PROVIDER_MOCK_LOCAL
                });
            }, 0);
        });
    }

    function generateRealProviderDisabled() {
        return Promise.resolve({
            ok: false,
            error: 'real_provider_disabled_no_api_key',
            code: 'real_provider_disabled',
            generator: PROVIDER_REAL
        });
    }

    function resolveProviderFromConfig(cfg) {
        var provider = normalizeProvider(cfg.employeeAiShadowProvider);
        if (provider === PROVIDER_MOCK_GATEWAY && cfg.employeeAiGatewayInvokeEnabled !== true) {
            return {
                effective: PROVIDER_OFF,
                reason: 'gateway_invoke_disabled'
            };
        }
        return { effective: provider, reason: 'ok' };
    }

    /**
     * Dev Gateway Adapter — provider abstraction (default mock-local).
     */
    function generateEmployeeCopilotOutput(input, primary, cfg) {
        cfg = cfg || {};
        var resolved = resolveProviderFromConfig(cfg);

        if (resolved.effective === PROVIDER_OFF) {
            return Promise.resolve({
                ok: false,
                error: resolved.reason || 'gateway_off',
                code: 'gateway_off',
                generator: 'rule-fallback'
            });
        }

        if (resolved.effective === PROVIDER_REAL) {
            return generateRealProviderDisabled();
        }

        if (resolved.effective === PROVIDER_MOCK_GATEWAY) {
            return invokeMockGateway(input, cfg);
        }

        return generateLocalMockProvider(input, primary, cfg);
    }

    function fetchEmployeeCopilotViaGateway(input, cfg) {
        cfg = Object.assign({
            employeeAiShadowProvider: PROVIDER_MOCK_GATEWAY,
            employeeAiGatewayInvokeEnabled: true
        }, cfg || {});
        return generateEmployeeCopilotOutput(input, pickPrimary(input), cfg);
    }

    function pickPrimary(input) {
        var signals = input && input.signals;
        if (!signals || !signals.length) return null;
        return signals[0];
    }

    function runValidatorHook(aiOutput, input, primary) {
        var Emp = global.ZDOSOperationCenterEmployeeAiAdapter;
        if (Emp && typeof Emp.validateEmployeeAiOutput === 'function') {
            return Emp.validateEmployeeAiOutput(aiOutput, input, primary);
        }
        var Shadow = global.ZDOSOperationCenterAiShadowAdapter;
        if (Shadow && typeof Shadow.validateAiOutput === 'function') {
            return Shadow.validateAiOutput(aiOutput, input, primary);
        }
        return {
            pass: false,
            errors: ['validator_hook_unavailable'],
            warnings: [],
            checks: {}
        };
    }

    global.ZDOSOperationCenterEmployeeAiGatewayAdapter = {
        GATEWAY_ADAPTER_VERSION: GATEWAY_ADAPTER_VERSION,
        EMPLOYEE_AI_ROUTE: EMPLOYEE_AI_ROUTE,
        PROVIDER_MOCK_LOCAL: PROVIDER_MOCK_LOCAL,
        PROVIDER_MOCK_GATEWAY: PROVIDER_MOCK_GATEWAY,
        PROVIDER_REAL: PROVIDER_REAL,
        PROVIDER_OFF: PROVIDER_OFF,
        buildGatewayRequestBody: buildGatewayRequestBody,
        mapGatewayPayloadToOutput: mapGatewayPayloadToOutput,
        generateEmployeeCopilotOutput: generateEmployeeCopilotOutput,
        fetchEmployeeCopilotViaGateway: fetchEmployeeCopilotViaGateway,
        runValidatorHook: runValidatorHook,
        normalizeProvider: normalizeProvider,
        resolveProviderFromConfig: resolveProviderFromConfig
    };
})(typeof window !== 'undefined' ? window : globalThis);
