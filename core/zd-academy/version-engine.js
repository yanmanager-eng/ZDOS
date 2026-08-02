/**
 * NEXT-004A | ZD Academy Capability Core — Capability Version Engine
 *
 * Tracks Academy capability framework / schema version (memory constants).
 * Aligns with UI-018 matrix as framework v1.0.0 / schemaVersion 1.
 *
 * Does NOT:
 * - invent or rename Production localStorage keys
 * - migrate cloud data
 * - render UI
 */
(function (global) {
    'use strict';

    var Schema = global.ZdosAcademyCapabilitySchema;
    var Registry = global.ZdosAcademyCapabilityRegistry;
    if (!Schema || !Registry) {
        throw new Error(
            '[ZdosAcademyVersionEngine] Schema and Registry must load first'
        );
    }

    var FRAMEWORK_ID = 'zd_academy_capability';
    /** Capability framework version — UI-018 12-item matrix baseline. */
    var FRAMEWORK_VERSION = '1.0.0';
    /** Integer schema revision for shape compatibility checks. */
    var SCHEMA_VERSION = 1;
    var BUILD = 'NEXT-004A';

    /**
     * @param {number|string} schemaVersion
     * @returns {boolean}
     */
    function isSchemaCompatible(schemaVersion) {
        var n = Number(schemaVersion);
        if (!isFinite(n)) return false;
        return Math.floor(n) === SCHEMA_VERSION;
    }

    /**
     * Compare semver-like major.minor.patch (framework versions used here).
     * @returns {-1|0|1|null}
     */
    function compareFrameworkVersion(a, b) {
        function parts(v) {
            var s = String(v || '').trim().replace(/^v/i, '');
            var bits = s.split('.');
            if (bits.length < 1) return null;
            var out = [];
            for (var i = 0; i < 3; i++) {
                var n = Number(bits[i] == null ? 0 : bits[i]);
                if (!isFinite(n)) return null;
                out.push(n);
            }
            return out;
        }
        var pa = parts(a);
        var pb = parts(b);
        if (!pa || !pb) return null;
        for (var i = 0; i < 3; i++) {
            if (pa[i] < pb[i]) return -1;
            if (pa[i] > pb[i]) return 1;
        }
        return 0;
    }

    function getVersionInfo() {
        return {
            frameworkId: FRAMEWORK_ID,
            frameworkVersion: FRAMEWORK_VERSION,
            schemaVersion: SCHEMA_VERSION,
            build: BUILD,
            capabilityCount: Registry.listCapabilityIds().length,
            categoryCount: Registry.listCategories().length,
            levelMin: Schema.LEVEL_MIN,
            levelMax: Schema.LEVEL_MAX,
            employeeAbilityStorageKey: Schema.EMPLOYEE_ABILITY_STORAGE_KEY,
            unlockLevel: global.ZdosAcademyPrerequisiteEngine
                ? global.ZdosAcademyPrerequisiteEngine.UNLOCK_LEVEL
                : null
        };
    }

    /**
     * Describe whether a stored payload metadata is usable with current core.
     * Payload may include optional { schemaVersion, frameworkVersion }.
     * Employee maps without metadata are treated as legacy UI-018 (compatible).
     */
    function assessCompatibility(meta) {
        if (meta == null || typeof meta !== 'object') {
            return {
                ok: true,
                legacy: true,
                reason: 'no metadata — treat as UI-018 legacy map'
            };
        }
        if (meta.schemaVersion != null && !isSchemaCompatible(meta.schemaVersion)) {
            return {
                ok: false,
                legacy: false,
                reason: 'schemaVersion mismatch'
            };
        }
        if (meta.frameworkVersion != null) {
            var cmp = compareFrameworkVersion(meta.frameworkVersion, FRAMEWORK_VERSION);
            if (cmp === null) {
                return { ok: false, legacy: false, reason: 'invalid frameworkVersion' };
            }
            if (cmp > 0) {
                return {
                    ok: false,
                    legacy: false,
                    reason: 'payload framework newer than core'
                };
            }
        }
        return { ok: true, legacy: false, reason: 'compatible' };
    }

    global.ZdosAcademyVersionEngine = Object.freeze({
        FRAMEWORK_ID: FRAMEWORK_ID,
        FRAMEWORK_VERSION: FRAMEWORK_VERSION,
        SCHEMA_VERSION: SCHEMA_VERSION,
        BUILD: BUILD,
        isSchemaCompatible: isSchemaCompatible,
        compareFrameworkVersion: compareFrameworkVersion,
        getVersionInfo: getVersionInfo,
        assessCompatibility: assessCompatibility
    });
})(typeof window !== 'undefined' ? window : globalThis);
