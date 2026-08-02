/**
 * NEXT-002 | Founder Capability — Capability Resolver
 *
 * Resolves capabilities via Capability Engine + Founder Context.
 * Default engine-off → empty / false (zero product behavior impact).
 * Does not wire into UI, login, Auth, or existing permission flows.
 */
(function (global) {
    'use strict';

    var Engine = global.ZdosCapabilityEngine;
    var FounderContext = global.ZdosFounderContext;
    if (!Engine || !FounderContext) {
        throw new Error('[ZdosCapabilityResolver] Engine and FounderContext must load first');
    }

    function asEngineContext(contextOrInput) {
        if (!contextOrInput || typeof contextOrInput !== 'object') {
            return FounderContext.createEmpty();
        }
        // Already looks like an engine context
        if (
            Object.prototype.hasOwnProperty.call(contextOrInput, 'role') ||
            Object.prototype.hasOwnProperty.call(contextOrInput, 'roles') ||
            Object.prototype.hasOwnProperty.call(contextOrInput, 'explicitCapabilities')
        ) {
            return FounderContext.toEngineContext(contextOrInput);
        }
        return FounderContext.create(contextOrInput);
    }

    /**
     * @param {Object} contextOrInput Founder/engine context or create() input
     * @returns {string[]}
     */
    function resolve(contextOrInput) {
        return Engine.getCapabilities(asEngineContext(contextOrInput));
    }

    /**
     * Convenience: explicit Founder group resolution.
     * @param {{ explicitCapabilities?: string[] }} [options]
     */
    function resolveFounder(options) {
        return Engine.getCapabilities(FounderContext.createFounderContext(options));
    }

    function has(contextOrInput, capability) {
        return Engine.hasCapability(asEngineContext(contextOrInput), capability);
    }

    function hasAny(contextOrInput, capabilities) {
        return Engine.hasAnyCapability(asEngineContext(contextOrInput), capabilities);
    }

    function hasAll(contextOrInput, capabilities) {
        return Engine.hasAllCapabilities(asEngineContext(contextOrInput), capabilities);
    }

    function isEngineEnabled() {
        return Engine.isEnabled();
    }

    global.ZdosCapabilityResolver = Object.freeze({
        resolve: resolve,
        resolveFounder: resolveFounder,
        has: has,
        hasAny: hasAny,
        hasAll: hasAll,
        isEngineEnabled: isEngineEnabled,
        asEngineContext: asEngineContext
    });
})(typeof window !== 'undefined' ? window : globalThis);
