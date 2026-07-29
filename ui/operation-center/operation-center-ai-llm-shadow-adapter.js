/**
 * UI-003B.5 | LLM Shadow Adapter — Gateway Mock (dev only, no real LLM API key)
 */
(function (global) {
    'use strict';

    var LLM_SHADOW_FLAG_KEY = 'zdos_feature_oc_ai_llm_shadow_v1';
    var ADAPTER_VERSION = 'ui-003b5-llm-shadow-gateway-1.0';
    var DEFAULT_GATEWAY_FUNCTION = 'oc-ai-shadow-gateway';
    var DEFAULT_GATEWAY_TIMEOUT_MS = 12000;
    var REGISTRY_VERSION = '1.0.0';
    var PROMPT_VERSION = 'ui-003b1-prompt-1.0';

    var INTENT_BY_SIGNAL = {
        'sales-pending-review': 'open_review_center',
        'sales-missing-today': 'open_sales',
        'unread-notification': 'open_notifications',
        'workforce-no-schedule-today': 'open_scheduling',
        'workforce-leave-today': 'open_scheduling'
    };

    function safeJsonParse(raw, def) {
        try {
            return raw ? JSON.parse(raw) : def;
        } catch (_) {
            return def;
        }
    }

    function getLlmShadowFeatureConfig() {
        var def = {
            aiCopilotLlmShadowEnabled: false,
            simulateApiError: false,
            useGatewayMock: true,
            useLocalMock: false,
            gatewayFunctionName: DEFAULT_GATEWAY_FUNCTION,
            gatewayTimeoutMs: DEFAULT_GATEWAY_TIMEOUT_MS,
            simulateGatewayTimeout: false
        };
        try {
            if (!global.localStorage) return def;
            var stored = safeJsonParse(global.localStorage.getItem(LLM_SHADOW_FLAG_KEY), null);
            if (!stored || typeof stored !== 'object') return def;
            return {
                aiCopilotLlmShadowEnabled: stored.aiCopilotLlmShadowEnabled === true,
                simulateApiError: stored.simulateApiError === true,
                useGatewayMock: stored.useGatewayMock !== false,
                useLocalMock: stored.useLocalMock === true,
                gatewayFunctionName: String(stored.gatewayFunctionName || DEFAULT_GATEWAY_FUNCTION).trim() ||
                    DEFAULT_GATEWAY_FUNCTION,
                gatewayTimeoutMs: Number(stored.gatewayTimeoutMs) || DEFAULT_GATEWAY_TIMEOUT_MS,
                simulateGatewayTimeout: stored.simulateGatewayTimeout === true
            };
        } catch (_) {
            return def;
        }
    }

    function isLlmShadowAdapterEnabled() {
        return getLlmShadowFeatureConfig().aiCopilotLlmShadowEnabled === true;
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

    function emptyAdapterOutput() {
        return {
            summary: '目前無主動提醒',
            reason: '系統未偵測到需優先處理的營運事項。',
            suggested_action: {
                label: null,
                intent: 'none',
                rationale: '無 Primary Signal'
            },
            related_signal_id: null,
            producer: 'gateway-mock-prototype',
            adapterVersion: ADAPTER_VERSION
        };
    }

    function buildOutputFromPrimary(primary) {
        if (!primary) return emptyAdapterOutput();
        var intent = INTENT_BY_SIGNAL[primary.id] || 'none';
        var message = String(primary.message || '');
        return {
            summary: String(primary.title || '營運提醒'),
            reason: message,
            suggested_action: {
                label: intent === 'none' ? null : '查看詳情',
                intent: intent,
                rationale: 'Local Mock：intent 依 Registry 映射（B.2 fallback）'
            },
            related_signal_id: primary.id,
            producer: 'llm-mock-prototype',
            adapterVersion: ADAPTER_VERSION
        };
    }

    function buildGatewayRequestBody(input) {
        return {
            registryVersion: REGISTRY_VERSION,
            promptVersion: PROMPT_VERSION,
            signals: Array.isArray(input.signals) ? input.signals : [],
            contextSnapshot: input.contextSnapshot || {},
            permissionScope: input.permissionScope || {}
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
            producer: 'gateway-mock-prototype',
            adapterVersion: ADAPTER_VERSION,
            gatewayMeta: data.meta || null
        };
    }

    function invokeGatewayMock(input, cfg) {
        var client = getSupabaseClient();
        if (!client || typeof client.functions.invoke !== 'function') {
            return Promise.resolve({
                ok: false,
                error: 'supabase_client_unavailable',
                code: 'gateway_unavailable'
            });
        }

        var body = buildGatewayRequestBody(input);
        var timeoutMs = Math.max(1000, cfg.gatewayTimeoutMs || DEFAULT_GATEWAY_TIMEOUT_MS);

        if (cfg.simulateGatewayTimeout) {
            return new Promise(function (resolve) {
                setTimeout(function () {
                    resolve({ ok: false, error: 'simulated_gateway_timeout', code: 'timeout' });
                }, timeoutMs + 50);
            });
        }

        var invokePromise = client.functions.invoke(cfg.gatewayFunctionName, { body: body });

        return new Promise(function (resolve) {
            var settled = false;
            var timer = setTimeout(function () {
                if (settled) return;
                settled = true;
                resolve({ ok: false, error: 'gateway_timeout', code: 'timeout' });
            }, timeoutMs);

            invokePromise.then(function (result) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                if (result.error) {
                    resolve({
                        ok: false,
                        error: result.error.message || 'gateway_error',
                        code: 'gateway_error'
                    });
                    return;
                }
                var mapped = mapGatewayPayloadToOutput(result.data);
                if (!mapped) {
                    resolve({
                        ok: false,
                        error: 'invalid_gateway_response',
                        code: 'schema_error'
                    });
                    return;
                }
                resolve({ ok: true, output: mapped });
            }).catch(function (err) {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve({
                    ok: false,
                    error: err && err.message ? err.message : 'gateway_fetch_failed',
                    code: 'gateway_error'
                });
            });
        });
    }

    function generateLocalMock(input, primary, cfg) {
        return new Promise(function (resolve) {
            setTimeout(function () {
                if (cfg.simulateApiError) {
                    resolve({
                        ok: false,
                        error: 'simulated_api_error',
                        code: 'api_error'
                    });
                    return;
                }
                try {
                    if (!primary) {
                        resolve({ ok: true, output: emptyAdapterOutput() });
                        return;
                    }
                    resolve({ ok: true, output: buildOutputFromPrimary(primary) });
                } catch (err) {
                    resolve({
                        ok: false,
                        error: err && err.message ? err.message : 'adapter_error',
                        code: 'schema_error'
                    });
                }
            }, 0);
        });
    }

    /**
     * LLM Adapter Contract — Gateway Mock when enabled; no OpenAI / no API key in browser.
     */
    function generateShadowCopilotOutput(input, primary) {
        var cfg = getLlmShadowFeatureConfig();
        var useGateway = cfg.useGatewayMock === true && cfg.useLocalMock !== true;

        if (useGateway) {
            return invokeGatewayMock(input, cfg);
        }
        return generateLocalMock(input, primary, cfg);
    }

    global.ZDOSOperationCenterAiLlmShadowAdapter = {
        LLM_SHADOW_FLAG_KEY: LLM_SHADOW_FLAG_KEY,
        ADAPTER_VERSION: ADAPTER_VERSION,
        getLlmShadowFeatureConfig: getLlmShadowFeatureConfig,
        isLlmShadowAdapterEnabled: isLlmShadowAdapterEnabled,
        generateShadowCopilotOutput: generateShadowCopilotOutput,
        buildGatewayRequestBody: buildGatewayRequestBody,
        mapGatewayPayloadToOutput: mapGatewayPayloadToOutput
    };
})(typeof window !== 'undefined' ? window : globalThis);
