/**
 * NEXT-004A | ZD Academy Capability Core — Capability Schema
 *
 * Defines the shape of Academy (UI-018) capability data.
 * Distinct from Founder Layer window.ZdosCapabilityTypes / Registry / Engine.
 *
 * Does NOT:
 * - render UI / materials / exams / practical tests
 * - write localStorage
 * - replace Founder Capability Engine
 */
(function (global) {
    'use strict';

    var LEVEL_MIN = 0;
    var LEVEL_MAX = 3;

    var LEVEL_DEFINITIONS = Object.freeze([
        Object.freeze({ level: 0, name: '未評核', short: '未評', tone: 'slate' }),
        Object.freeze({ level: 1, name: '學習中', short: 'L1', tone: 'amber' }),
        Object.freeze({ level: 2, name: '已達標', short: 'L2', tone: 'sky' }),
        Object.freeze({ level: 3, name: '精通', short: 'L3', tone: 'emerald' })
    ]);

    /** Existing Production key — referenced only; never renamed by this module. */
    var EMPLOYEE_ABILITY_STORAGE_KEY = 'zdos_ability_registry_v1';

    function normalizeLevel(value) {
        var n = Number(value);
        if (!isFinite(n)) return LEVEL_MIN;
        var rounded = Math.round(n);
        if (rounded < LEVEL_MIN) return LEVEL_MIN;
        if (rounded > LEVEL_MAX) return LEVEL_MAX;
        return rounded;
    }

    function getLevelDefinition(level) {
        var lv = normalizeLevel(level);
        for (var i = 0; i < LEVEL_DEFINITIONS.length; i++) {
            if (LEVEL_DEFINITIONS[i].level === lv) return LEVEL_DEFINITIONS[i];
        }
        return LEVEL_DEFINITIONS[0];
    }

    function isNonEmptyString(v) {
        return typeof v === 'string' && v.trim().length > 0;
    }

    /**
     * Validate one capability item definition.
     * @returns {{ ok: boolean, errors: string[] }}
     */
    function validateCapabilityItem(item) {
        var errors = [];
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            return { ok: false, errors: ['item must be an object'] };
        }
        if (!isNonEmptyString(item.id)) errors.push('item.id required');
        if (!isNonEmptyString(item.name)) errors.push('item.name required');
        if (item.desc != null && typeof item.desc !== 'string') {
            errors.push('item.desc must be string when present');
        }
        return { ok: errors.length === 0, errors: errors };
    }

    /**
     * Validate one category (ABILITY_MATRIX row shape).
     * @returns {{ ok: boolean, errors: string[] }}
     */
    function validateCategory(category) {
        var errors = [];
        if (!category || typeof category !== 'object' || Array.isArray(category)) {
            return { ok: false, errors: ['category must be an object'] };
        }
        if (!isNonEmptyString(category.id)) errors.push('category.id required');
        if (!isNonEmptyString(category.title)) errors.push('category.title required');
        if (!Array.isArray(category.items) || category.items.length === 0) {
            errors.push('category.items must be a non-empty array');
            return { ok: false, errors: errors };
        }
        for (var i = 0; i < category.items.length; i++) {
            var r = validateCapabilityItem(category.items[i]);
            if (!r.ok) {
                for (var j = 0; j < r.errors.length; j++) {
                    errors.push('items[' + i + ']: ' + r.errors[j]);
                }
            }
        }
        return { ok: errors.length === 0, errors: errors };
    }

    /**
     * Validate full matrix (categories[]).
     * @returns {{ ok: boolean, errors: string[], capabilityIds: string[] }}
     */
    function validateMatrix(matrix) {
        var errors = [];
        var capabilityIds = [];
        var seen = Object.create(null);
        if (!Array.isArray(matrix) || matrix.length === 0) {
            return { ok: false, errors: ['matrix must be a non-empty array'], capabilityIds: [] };
        }
        for (var c = 0; c < matrix.length; c++) {
            var cat = matrix[c];
            var cr = validateCategory(cat);
            if (!cr.ok) {
                for (var e = 0; e < cr.errors.length; e++) {
                    errors.push('categories[' + c + ']: ' + cr.errors[e]);
                }
                continue;
            }
            if (seen['cat:' + cat.id]) {
                errors.push('duplicate category.id: ' + cat.id);
            }
            seen['cat:' + cat.id] = true;
            for (var i = 0; i < cat.items.length; i++) {
                var id = String(cat.items[i].id);
                if (seen['cap:' + id]) {
                    errors.push('duplicate capability id: ' + id);
                } else {
                    seen['cap:' + id] = true;
                    capabilityIds.push(id);
                }
            }
        }
        return { ok: errors.length === 0, errors: errors, capabilityIds: capabilityIds };
    }

    /**
     * Normalize employee ability map: only known ids kept; levels clamped 0–3.
     * Pure — does not read/write storage.
     */
    function normalizeEmployeeAbilityMap(rawMap, knownIds) {
        var out = Object.create(null);
        if (!rawMap || typeof rawMap !== 'object' || Array.isArray(rawMap)) return out;
        var allow = null;
        if (Array.isArray(knownIds) && knownIds.length) {
            allow = Object.create(null);
            for (var i = 0; i < knownIds.length; i++) allow[String(knownIds[i])] = true;
        }
        var keys = Object.keys(rawMap);
        for (var k = 0; k < keys.length; k++) {
            var id = keys[k];
            if (allow && !allow[id]) continue;
            out[id] = normalizeLevel(rawMap[id]);
        }
        return out;
    }

    global.ZdosAcademyCapabilitySchema = Object.freeze({
        LEVEL_MIN: LEVEL_MIN,
        LEVEL_MAX: LEVEL_MAX,
        LEVEL_DEFINITIONS: LEVEL_DEFINITIONS,
        EMPLOYEE_ABILITY_STORAGE_KEY: EMPLOYEE_ABILITY_STORAGE_KEY,
        normalizeLevel: normalizeLevel,
        getLevelDefinition: getLevelDefinition,
        validateCapabilityItem: validateCapabilityItem,
        validateCategory: validateCategory,
        validateMatrix: validateMatrix,
        normalizeEmployeeAbilityMap: normalizeEmployeeAbilityMap
    });
})(typeof window !== 'undefined' ? window : globalThis);
