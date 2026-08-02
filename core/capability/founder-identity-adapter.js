/**
 * NEXT-003 | Founder Identity Adapter
 *
 * Maps official ZDOS role SoT → Founder Capability Context.
 *
 * Official Founder role sources (do not invent):
 * - Cloud profiles.role === 'owner'  (via cloudRole / cloudProfile.role)
 * - Local account role === '集團首腦' (ROLE_OPTIONS / normalizeAccountRole)
 *
 * Does NOT:
 * - infer from name / email / employeeNo
 * - hardcode accounts
 * - write DB / localStorage / profile / membership
 * - control UI
 */
(function (global) {
    'use strict';

    var FounderContext = global.ZdosFounderContext;
    if (!FounderContext) {
        throw new Error('[ZdosFounderIdentityAdapter] ZdosFounderContext must load first');
    }

    /** Cloud Auth role code used by profiles.role / state.cloudRole */
    var OFFICIAL_CLOUD_FOUNDER_ROLES = Object.freeze(['owner']);

    /** Local account role label after normalizeAccountRole */
    var OFFICIAL_ACCOUNT_FOUNDER_ROLES = Object.freeze(['集團首腦']);

    function normalizeCloudRole(value) {
        return String(value || '').trim();
    }

    function normalizeAccountRoleLabel(value) {
        return String(value || '').trim();
    }

    /**
     * @param {{ cloudRole?: string, accountRole?: string, roles?: string[] }} roleSource
     */
    function isOfficialFounderRole(roleSource) {
        var src = roleSource && typeof roleSource === 'object' ? roleSource : {};
        var cloudRole = normalizeCloudRole(src.cloudRole);
        if (cloudRole && OFFICIAL_CLOUD_FOUNDER_ROLES.indexOf(cloudRole) !== -1) {
            return true;
        }
        var accountRole = normalizeAccountRoleLabel(src.accountRole);
        if (accountRole && OFFICIAL_ACCOUNT_FOUNDER_ROLES.indexOf(accountRole) !== -1) {
            return true;
        }
        return false;
    }

    /**
     * @param {{ cloudRole?: string, accountRole?: string, roles?: string[] }} roleSource
     * @returns {{ role: string, roles: string[], explicitCapabilities: string[] }}
     */
    function toFounderContext(roleSource) {
        if (!isOfficialFounderRole(roleSource)) {
            return FounderContext.createEmpty();
        }
        return FounderContext.createFounderContext();
    }

    /**
     * Resolve capabilities for a role source via Capability Resolver.
     * Engine-off → [].
     */
    function resolveCapabilities(roleSource) {
        var Resolver = global.ZdosCapabilityResolver;
        if (!Resolver) return [];
        return Resolver.resolve(toFounderContext(roleSource));
    }

    function hasFounderCapability(roleSource) {
        var Resolver = global.ZdosCapabilityResolver;
        if (!Resolver) return false;
        return Resolver.has(toFounderContext(roleSource), 'founder');
    }

    global.ZdosFounderIdentityAdapter = Object.freeze({
        OFFICIAL_CLOUD_FOUNDER_ROLES: OFFICIAL_CLOUD_FOUNDER_ROLES,
        OFFICIAL_ACCOUNT_FOUNDER_ROLES: OFFICIAL_ACCOUNT_FOUNDER_ROLES,
        isOfficialFounderRole: isOfficialFounderRole,
        toFounderContext: toFounderContext,
        resolveCapabilities: resolveCapabilities,
        hasFounderCapability: hasFounderCapability
    });
})(typeof window !== 'undefined' ? window : globalThis);
