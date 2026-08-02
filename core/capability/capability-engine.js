/**
 * NEXT-001 | Capability Engine v0.1 — Query API shell
 *
 * window.ZdosCapabilityEngine
 *
 * Default: DISABLED → empty / false results (zero behavior impact).
 * Does not replace Auth, roles, membership, UUID, or RLS.
 * Does not wire into UI / home / routing / centers.
 */
(function (global) {
    'use strict';

    var Types = global.ZdosCapabilityTypes;
    var Registry = global.ZdosCapabilityRegistry;
    if (!Types || !Registry) {
        throw new Error('[ZdosCapabilityEngine] Types and Registry must load first');
    }

    /** In-memory only. Never writes existing ZDOS localStorage keys. */
    var enabledForDev = false;

    function isLocalDevHost() {
        try {
            var loc = global.location;
            if (!loc) return false;
            var protocol = String(loc.protocol || '');
            if (protocol === 'file:') return true;
            var host = String(loc.hostname || '').toLowerCase();
            return host === 'localhost' || host === '127.0.0.1' || host === '::1';
        } catch (_) {
            return false;
        }
    }

    function isEnabled() {
        return enabledForDev === true;
    }

    /**
     * Dev / test toggle only. Memory flag — no persistent storage.
     * Rejected outside local hosts so Production / Beta stay inert even if called.
     */
    function setEnabledForDev(value) {
        if (!isLocalDevHost()) {
            return false;
        }
        enabledForDev = value === true;
        return enabledForDev;
    }

    function collectRoleGroups(context) {
        var groups = [];
        var seen = Object.create(null);
        function push(role) {
            var key = String(role || '').trim().toLowerCase();
            if (!key || seen[key]) return;
            seen[key] = true;
            groups.push(key);
        }
        if (!context || typeof context !== 'object') return groups;
        push(context.role);
        var roles = context.roles;
        if (Array.isArray(roles)) {
            for (var i = 0; i < roles.length; i++) push(roles[i]);
        }
        return groups;
    }

    function normalizeExplicitCapabilities(list) {
        var out = [];
        var seen = Object.create(null);
        if (!Array.isArray(list)) return out;
        for (var i = 0; i < list.length; i++) {
            var code = String(list[i] || '').trim().toLowerCase();
            if (!code || seen[code]) continue;
            if (!Types.isKnownCapability(code)) continue;
            seen[code] = true;
            out.push(code);
        }
        return out;
    }

    /**
     * @param {{ role?: string, roles?: string[], explicitCapabilities?: string[] }} context
     * @returns {string[]}
     */
    function getCapabilities(context) {
        if (!isEnabled()) return [];

        var set = Object.create(null);
        var groups = collectRoleGroups(context);
        for (var i = 0; i < groups.length; i++) {
            var caps = Registry.getCapabilitiesForRoleGroup(groups[i]);
            for (var j = 0; j < caps.length; j++) set[caps[j]] = true;
        }

        var explicit = normalizeExplicitCapabilities(
            context && context.explicitCapabilities
        );
        for (var k = 0; k < explicit.length; k++) set[explicit[k]] = true;

        var known = Types.listCapabilities();
        var result = [];
        for (var n = 0; n < known.length; n++) {
            if (set[known[n]]) result.push(known[n]);
        }
        return result;
    }

    function hasCapability(context, capability) {
        if (!isEnabled()) return false;
        var code = String(capability || '').trim().toLowerCase();
        if (!Types.isKnownCapability(code)) return false;
        var caps = getCapabilities(context);
        return caps.indexOf(code) !== -1;
    }

    function hasAnyCapability(context, capabilities) {
        if (!isEnabled()) return false;
        if (!Array.isArray(capabilities) || capabilities.length === 0) return false;
        for (var i = 0; i < capabilities.length; i++) {
            if (hasCapability(context, capabilities[i])) return true;
        }
        return false;
    }

    function hasAllCapabilities(context, capabilities) {
        if (!isEnabled()) return false;
        if (!Array.isArray(capabilities) || capabilities.length === 0) return false;
        for (var i = 0; i < capabilities.length; i++) {
            if (!hasCapability(context, capabilities[i])) return false;
        }
        return true;
    }

    global.ZdosCapabilityEngine = Object.freeze({
        getCapabilities: getCapabilities,
        hasCapability: hasCapability,
        hasAnyCapability: hasAnyCapability,
        hasAllCapabilities: hasAllCapabilities,
        isEnabled: isEnabled,
        setEnabledForDev: setEnabledForDev
    });
})(typeof window !== 'undefined' ? window : globalThis);
