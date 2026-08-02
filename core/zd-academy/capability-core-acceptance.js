/**
 * NEXT-004A | ZD Academy Capability Core — Acceptance (manual)
 * Call: runZdosAcademyCapabilityCoreAcceptance()
 * Does not auto-run. Does not touch UI or Production storage writes.
 */
(function (global) {
    'use strict';

    function runZdosAcademyCapabilityCoreAcceptance() {
        var results = [];
        function check(name, cond, detail) {
            results.push({
                name: name,
                pass: !!cond,
                detail: detail || ''
            });
        }

        var Schema = global.ZdosAcademyCapabilitySchema;
        var Registry = global.ZdosAcademyCapabilityRegistry;
        var Prereq = global.ZdosAcademyPrerequisiteEngine;
        var Version = global.ZdosAcademyVersionEngine;
        var FounderReg = global.ZdosCapabilityRegistry;

        check('schema present', !!Schema);
        check('registry present', !!Registry);
        check('prerequisite present', !!Prereq);
        check('version present', !!Version);

        check(
            'isolated from Founder registry',
            !!Registry && Registry !== FounderReg,
            'Academy Registry must not be Founder ZdosCapabilityRegistry'
        );

        check(
            'storage key unchanged',
            Schema && Schema.EMPLOYEE_ABILITY_STORAGE_KEY === 'zdos_ability_registry_v1'
        );

        var ids = Registry ? Registry.listCapabilityIds() : [];
        check('capability count 12', ids.length === 12, 'count=' + ids.length);
        check('categories 3', Registry && Registry.listCategories().length === 3);
        check('has newbie', Registry && Registry.hasCapability('newbie'));
        check('has team', Registry && Registry.hasCapability('team'));
        check('unknown false', Registry && !Registry.hasCapability('not-a-cap'));

        var matrixOk = Schema && Schema.validateMatrix(Registry.getMatrix());
        check('matrix validates', matrixOk && matrixOk.ok, matrixOk && matrixOk.errors.join('; '));

        check('level clamp', Schema && Schema.normalizeLevel(99) === 3 && Schema.normalizeLevel(-1) === 0);
        check('unlock level 2', Prereq && Prereq.UNLOCK_LEVEL === 2);

        var empty = {};
        check('newbie unlocked at empty', Prereq && Prereq.isUnlocked(empty, 'newbie') === true);
        check('sop locked at empty', Prereq && Prereq.isUnlocked(empty, 'sop') === false);
        check(
            'sop unlocks at newbie L2',
            Prereq && Prereq.isUnlocked({ newbie: 2 }, 'sop') === true
        );
        check(
            'marketing needs product+sales',
            Prereq &&
                Prereq.isUnlocked({ newbie: 2, product: 2, sales: 1 }, 'marketing') === false &&
                Prereq.isUnlocked({ newbie: 2, product: 2, sales: 2 }, 'marketing') === true
        );

        var graph = Prereq && Prereq.validateGraph();
        check('prereq graph ok', graph && graph.ok, graph && graph.errors.join('; '));

        var info = Version && Version.getVersionInfo();
        check(
            'version info',
            info &&
                info.frameworkVersion === '1.0.0' &&
                info.schemaVersion === 1 &&
                info.build === 'NEXT-004A'
        );
        check('schema compatible 1', Version && Version.isSchemaCompatible(1) === true);
        check('schema incompatible 2', Version && Version.isSchemaCompatible(2) === false);
        check(
            'legacy map compatible',
            Version && Version.assessCompatibility(null).ok === true
        );

        var failed = results.filter(function (r) {
            return !r.pass;
        });
        var report = {
            ok: failed.length === 0,
            passed: results.length - failed.length,
            failed: failed.length,
            results: results
        };
        if (typeof console !== 'undefined' && console.log) {
            console.log('[NEXT-004A Acceptance]', report.ok ? 'PASS' : 'FAIL', report);
        }
        return report;
    }

    global.runZdosAcademyCapabilityCoreAcceptance = runZdosAcademyCapabilityCoreAcceptance;
})(typeof window !== 'undefined' ? window : globalThis);
