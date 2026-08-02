/**
 * NEXT-004A | ZD Academy Capability Core — Prerequisite Engine
 *
 * Pure unlock rules aligned with UI-018 ABILITY_PREREQUISITES / ABILITY_UNLOCK_LEVEL.
 * Does NOT render UI, Learning Paths, materials, exams, or write storage.
 */
(function (global) {
    'use strict';

    var Schema = global.ZdosAcademyCapabilitySchema;
    var Registry = global.ZdosAcademyCapabilityRegistry;
    if (!Schema || !Registry) {
        throw new Error(
            '[ZdosAcademyPrerequisiteEngine] Schema and Registry must load first'
        );
    }

    /** First-pass map — identical to UI-018 ABILITY_PREREQUISITES. */
    var PREREQUISITES = Object.freeze({
        newbie: Object.freeze([]),
        sop: Object.freeze(['newbie']),
        hygiene: Object.freeze(['newbie']),
        cashier: Object.freeze(['sop']),
        product: Object.freeze(['newbie']),
        sales: Object.freeze(['product']),
        service: Object.freeze(['sop']),
        marketing: Object.freeze(['product', 'sales']),
        lead: Object.freeze(['sales', 'service']),
        schedule: Object.freeze(['sop']),
        data: Object.freeze(['cashier']),
        team: Object.freeze(['lead'])
    });

    /** Unlock when each prerequisite reaches「已達標」(L2). */
    var UNLOCK_LEVEL = 2;

    function getPrerequisites(capabilityId) {
        var id = String(capabilityId || '');
        var list = PREREQUISITES[id];
        return list ? list.slice() : [];
    }

    function levelOf(levelsByAbilityId, capabilityId) {
        if (!levelsByAbilityId || typeof levelsByAbilityId !== 'object') {
            return Schema.LEVEL_MIN;
        }
        return Schema.normalizeLevel(levelsByAbilityId[String(capabilityId || '')]);
    }

    /**
     * @param {Object<string, number>} levelsByAbilityId employee ability map
     * @param {string} capabilityId
     * @returns {boolean}
     */
    function isUnlocked(levelsByAbilityId, capabilityId) {
        var id = String(capabilityId || '');
        if (!Registry.hasCapability(id)) return false;
        var pre = getPrerequisites(id);
        if (!pre.length) return true;
        for (var i = 0; i < pre.length; i++) {
            if (levelOf(levelsByAbilityId, pre[i]) < UNLOCK_LEVEL) return false;
        }
        return true;
    }

    /**
     * Prerequisites not yet meeting UNLOCK_LEVEL.
     * @returns {{ capabilityId: string, name: string, level: number, required: number }[]}
     */
    function getMissingPrerequisites(levelsByAbilityId, capabilityId) {
        var missing = [];
        var pre = getPrerequisites(capabilityId);
        for (var i = 0; i < pre.length; i++) {
            var pid = pre[i];
            var lv = levelOf(levelsByAbilityId, pid);
            if (lv < UNLOCK_LEVEL) {
                var meta = Registry.getCapability(pid);
                missing.push({
                    capabilityId: pid,
                    name: meta ? meta.name : pid,
                    level: lv,
                    required: UNLOCK_LEVEL
                });
            }
        }
        return missing;
    }

    /**
     * Validate prerequisite graph: every edge target exists; no unknown ids; no self-edge.
     * @returns {{ ok: boolean, errors: string[] }}
     */
    function validateGraph() {
        var errors = [];
        var ids = Registry.listCapabilityIds();
        var known = Object.create(null);
        for (var i = 0; i < ids.length; i++) known[ids[i]] = true;

        var keys = Object.keys(PREREQUISITES);
        for (var k = 0; k < keys.length; k++) {
            var id = keys[k];
            if (!known[id]) {
                errors.push('prerequisite key not in registry: ' + id);
                continue;
            }
            var list = PREREQUISITES[id];
            for (var p = 0; p < list.length; p++) {
                var dep = list[p];
                if (dep === id) {
                    errors.push('self prerequisite: ' + id);
                }
                if (!known[dep]) {
                    errors.push('unknown prerequisite "' + dep + '" for ' + id);
                }
            }
        }

        for (var n = 0; n < ids.length; n++) {
            if (!Object.prototype.hasOwnProperty.call(PREREQUISITES, ids[n])) {
                errors.push('registry capability missing prerequisite entry: ' + ids[n]);
            }
        }

        return { ok: errors.length === 0, errors: errors };
    }

    var graphCheck = validateGraph();
    if (!graphCheck.ok) {
        throw new Error(
            '[ZdosAcademyPrerequisiteEngine] invalid graph: ' +
                graphCheck.errors.join('; ')
        );
    }

    global.ZdosAcademyPrerequisiteEngine = Object.freeze({
        PREREQUISITES: PREREQUISITES,
        UNLOCK_LEVEL: UNLOCK_LEVEL,
        getPrerequisites: getPrerequisites,
        isUnlocked: isUnlocked,
        getMissingPrerequisites: getMissingPrerequisites,
        validateGraph: validateGraph
    });
})(typeof window !== 'undefined' ? window : globalThis);
