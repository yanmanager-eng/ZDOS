/**
 * NEXT-001 | Capability Engine v0.1 — Capability Types
 * Immutable capability codes for future Founder Layer.
 * Not Auth. Not a replacement for existing roles / membership / RLS.
 */
(function (global) {
    'use strict';

    var CAPABILITY_TYPES = Object.freeze({
        FOUNDER: 'founder',
        FOUNDER_INSIGHT: 'founder_insight',
        AI_BRIEF: 'ai_brief',
        ROADMAP: 'roadmap',
        SYSTEM_HEALTH: 'system_health'
    });

    var ALL = Object.freeze([
        CAPABILITY_TYPES.FOUNDER,
        CAPABILITY_TYPES.FOUNDER_INSIGHT,
        CAPABILITY_TYPES.AI_BRIEF,
        CAPABILITY_TYPES.ROADMAP,
        CAPABILITY_TYPES.SYSTEM_HEALTH
    ]);

    var ALL_SET = Object.freeze(
        ALL.reduce(function (acc, code) {
            acc[code] = true;
            return acc;
        }, Object.create(null))
    );

    function isKnownCapability(code) {
        return !!ALL_SET[String(code || '')];
    }

    function listCapabilities() {
        return ALL.slice();
    }

    global.ZdosCapabilityTypes = Object.freeze({
        CAPABILITY_TYPES: CAPABILITY_TYPES,
        ALL: ALL,
        isKnownCapability: isKnownCapability,
        listCapabilities: listCapabilities
    });
})(typeof window !== 'undefined' ? window : globalThis);
