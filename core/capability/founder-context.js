/**
 * NEXT-002 | Founder Capability — Founder Context
 *
 * Builds Capability Engine contexts for Founder capability-group usage.
 * Does NOT infer Founder from name / email / employee no / existing ZDOS roles.
 * Does NOT query Supabase or localStorage.
 * Does NOT mutate profile / membership / Auth.
 */
(function (global) {
    'use strict';

    var Registry = global.ZdosCapabilityRegistry;
    if (!Registry) {
        throw new Error('[ZdosFounderContext] ZdosCapabilityRegistry must load first');
    }

    var FOUNDER_GROUP = Registry.ROLE_GROUP_FOUNDER;

    function uniqStrings(list) {
        var out = [];
        var seen = Object.create(null);
        if (!Array.isArray(list)) return out;
        for (var i = 0; i < list.length; i++) {
            var key = String(list[i] || '').trim().toLowerCase();
            if (!key || seen[key]) continue;
            seen[key] = true;
            out.push(key);
        }
        return out;
    }

    function normalizeExplicitCapabilities(list) {
        var Types = global.ZdosCapabilityTypes;
        var out = [];
        var seen = Object.create(null);
        if (!Array.isArray(list)) return out;
        for (var i = 0; i < list.length; i++) {
            var code = String(list[i] || '').trim().toLowerCase();
            if (!code || seen[code]) continue;
            if (Types && !Types.isKnownCapability(code)) continue;
            seen[code] = true;
            out.push(code);
        }
        return out;
    }

    /**
     * @returns {{ role: string, roles: string[], explicitCapabilities: string[] }}
     */
    function createEmpty() {
        return {
            role: '',
            roles: [],
            explicitCapabilities: []
        };
    }

    /**
     * Explicit Founder capability-group context.
     * Callers must already know this context is for Founder — no identity inference.
     * @param {{ explicitCapabilities?: string[] }} [options]
     */
    function createFounderContext(options) {
        var opts = options && typeof options === 'object' ? options : {};
        return {
            role: FOUNDER_GROUP,
            roles: [FOUNDER_GROUP],
            explicitCapabilities: normalizeExplicitCapabilities(opts.explicitCapabilities)
        };
    }

    /**
     * @param {string} roleGroup
     * @param {{ explicitCapabilities?: string[] }} [options]
     */
    function createFromRoleGroup(roleGroup, options) {
        var group = String(roleGroup || '').trim().toLowerCase();
        var opts = options && typeof options === 'object' ? options : {};
        if (!group) return createEmpty();
        return {
            role: group,
            roles: [group],
            explicitCapabilities: normalizeExplicitCapabilities(opts.explicitCapabilities)
        };
    }

    /**
     * Build engine context from an explicit input bag.
     *
     * Supported keys only:
     * - founder: boolean (true → founder role group)
     * - roleGroup / role: string capability group (not ZDOS account role mapping)
     * - roles: string[]
     * - explicitCapabilities: string[]
     *
     * Ignored for grant decisions (never used to infer Founder):
     * - name, email, employeeNo, empId, userId, cloudRole, accountRole, etc.
     *
     * @param {Object} input
     */
    function create(input) {
        if (!input || typeof input !== 'object') return createEmpty();

        var roles = [];
        var explicit = normalizeExplicitCapabilities(input.explicitCapabilities);

        if (input.founder === true) {
            roles.push(FOUNDER_GROUP);
        }

        var roleGroup = input.roleGroup != null ? input.roleGroup : input.role;
        if (roleGroup != null && String(roleGroup).trim()) {
            roles.push(String(roleGroup).trim().toLowerCase());
        }

        if (Array.isArray(input.roles)) {
            roles = roles.concat(input.roles);
        }

        roles = uniqStrings(roles);
        if (!roles.length && !explicit.length) return createEmpty();

        return {
            role: roles[0] || '',
            roles: roles,
            explicitCapabilities: explicit
        };
    }

    function getRoleGroups(context) {
        if (!context || typeof context !== 'object') return [];
        var roles = [];
        if (context.role) roles.push(context.role);
        if (Array.isArray(context.roles)) roles = roles.concat(context.roles);
        return uniqStrings(roles);
    }

    function isFounderContext(context) {
        var groups = getRoleGroups(context);
        return groups.indexOf(FOUNDER_GROUP) !== -1;
    }

    function toEngineContext(context) {
        if (!context || typeof context !== 'object') return createEmpty();
        var roles = getRoleGroups(context);
        return {
            role: roles[0] || '',
            roles: roles,
            explicitCapabilities: normalizeExplicitCapabilities(context.explicitCapabilities)
        };
    }

    global.ZdosFounderContext = Object.freeze({
        FOUNDER_GROUP: FOUNDER_GROUP,
        createEmpty: createEmpty,
        createFounderContext: createFounderContext,
        createFromRoleGroup: createFromRoleGroup,
        create: create,
        isFounderContext: isFounderContext,
        getRoleGroups: getRoleGroups,
        toEngineContext: toEngineContext
    });
})(typeof window !== 'undefined' ? window : globalThis);
