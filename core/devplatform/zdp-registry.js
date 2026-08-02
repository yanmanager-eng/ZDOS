/**
 * ZDP-001｜Development Platform — Ticket Registry
 * Source-aligned with docs/04_Roadmap/INNOVATION_BACKLOG.md
 * No invented metrics / fake progress percentages.
 */
(function (global) {
    'use strict';

    var TICKETS = Object.freeze([
        Object.freeze({
            id: 'NEXT-000',
            title: 'Clone ZDOS v1.5.0 as Next baseline',
            status: 'Done',
            bucket: 'completed',
            note: 'Immutable Next baseline'
        }),
        Object.freeze({
            id: 'NEXT-001',
            title: 'Capability Engine v0.1',
            status: 'Done',
            bucket: 'completed',
            note: 'Shell only｜預設關閉'
        }),
        Object.freeze({
            id: 'NEXT-002',
            title: 'Founder Capability（Context + Resolver）',
            status: 'Done',
            bucket: 'completed',
            note: '預設跟隨 Engine 關閉'
        }),
        Object.freeze({
            id: 'NEXT-003',
            title: 'Founder Console v0.1',
            status: 'Implemented｜Founder DEV Test Pending',
            bucket: 'pending_review',
            note: 'Flag 預設關閉｜功能中心條件入口'
        }),
        Object.freeze({
            id: 'NEXT-003A',
            title: 'Founder Console UI Refinement',
            status: 'Implemented｜Founder UI Review Pending',
            bucket: 'pending_review',
            note: '文案／版面／RWD｜不改 Guard／Flag'
        }),
        Object.freeze({
            id: 'ZDP-001',
            title: 'Development Platform MVP',
            status: 'In Development',
            bucket: 'current',
            note: '今日待驗收／最近完成／Founder Review／Build'
        })
    ]);

    function listAll() {
        return TICKETS.slice();
    }

    function listByBucket(bucket) {
        var key = String(bucket || '');
        return TICKETS.filter(function (t) { return t.bucket === key; });
    }

    function getTicket(id) {
        var target = String(id || '');
        for (var i = 0; i < TICKETS.length; i++) {
            if (TICKETS[i].id === target) return TICKETS[i];
        }
        return null;
    }

    global.ZdosDevPlatformRegistry = Object.freeze({
        TICKETS: TICKETS,
        listAll: listAll,
        listByBucket: listByBucket,
        getTicket: getTicket
    });
})(typeof window !== 'undefined' ? window : globalThis);
