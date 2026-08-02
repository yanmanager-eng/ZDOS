/**
 * NEXT-001 | Capability Engine v0.1 — Capability Registry
 * Read-only role-group → capability set mapping.
 *
 * Does NOT:
 * - query Supabase / localStorage
 * - mutate profile / membership
 * - infer Founder from name / email / employee no
 */
(function (global) {
    'use strict';

    var Types = global.ZdosCapabilityTypes;
    if (!Types) {
        throw new Error('[ZdosCapabilityRegistry] ZdosCapabilityTypes must load first');
    }

    var T = Types.CAPABILITY_TYPES;

    /** Capability group id for Founder Layer callers — not an existing ZDOS account role. */
    var ROLE_GROUP_FOUNDER = 'founder';

    var FOUNDER_CAPABILITIES = Object.freeze([
        T.FOUNDER,
        T.FOUNDER_INSIGHT,
        T.AI_BRIEF,
        T.ROADMAP,
        T.SYSTEM_HEALTH
    ]);

    /**
     * Role / capability-group → capability codes.
     * Only the Founder group is defined in v0.1.
     * Existing ZDOS roles (集團首腦 / owner / manager / …) are intentionally absent.
     */
    var ROLE_GROUP_CAPABILITIES = Object.freeze({
        founder: FOUNDER_CAPABILITIES
    });

    function normalizeRoleGroup(role) {
        return String(role || '').trim().toLowerCase();
    }

    function getCapabilitiesForRoleGroup(roleGroup) {
        var key = normalizeRoleGroup(roleGroup);
        var list = ROLE_GROUP_CAPABILITIES[key];
        return list ? list.slice() : [];
    }

    function listRoleGroups() {
        return Object.keys(ROLE_GROUP_CAPABILITIES).slice();
    }

    function hasRoleGroup(roleGroup) {
        return Object.prototype.hasOwnProperty.call(
            ROLE_GROUP_CAPABILITIES,
            normalizeRoleGroup(roleGroup)
        );
    }

    global.ZdosCapabilityRegistry = Object.freeze({
        ROLE_GROUP_FOUNDER: ROLE_GROUP_FOUNDER,
        FOUNDER_CAPABILITIES: FOUNDER_CAPABILITIES,
        ROLE_GROUP_CAPABILITIES: ROLE_GROUP_CAPABILITIES,
        getCapabilitiesForRoleGroup: getCapabilitiesForRoleGroup,
        listRoleGroups: listRoleGroups,
        hasRoleGroup: hasRoleGroup
    });
})(typeof window !== 'undefined' ? window : globalThis);
