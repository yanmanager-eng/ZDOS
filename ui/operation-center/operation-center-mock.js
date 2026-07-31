/**
 * UI-002 Phase 1 | Operation Center mock data (no business / localStorage writes)
 */
(function (global) {
    'use strict';

    global.operationCenterMockData = {
        operationStatus: {
            level: 'warn',
            message: '今日需注意人力安排'
        },
        copilotMessage: {
            label: 'Operation Copilot',
            headline: '東港店人力缺口',
            body: '今天東港店少一位人力。建議安排跨店支援，優先聯繫可跨店幹部。',
            actionLabel: '查看建議安排'
        },
        kpiCards: [
            { id: 'sales', label: '今日業績', value: 'NT$ 128,400', meta: '示範資料 · Mock' },
            { id: 'attendance', label: '今日出勤', value: '14 / 15', meta: '示範資料 · Mock' },
            { id: 'approvals', label: '待簽核', value: '3', meta: '排假 2 · 其他 1' },
            { id: 'notifications', label: '未讀通知', value: '5', meta: '2 則需今日處理' }
        ],
        focusItems: [
            { id: 'focus-1', text: '新人考核', tag: '今日' },
            { id: 'focus-2', text: '月底盤點', tag: '截止' },
            { id: 'focus-3', text: '排假審核', tag: '待辦' }
        ],
        quickActions: [
            { id: 'leave', label: '排假', icon: '📅', action: 'scheduling' },
            { id: 'sales', label: '業績', icon: '📈', action: 'sales' },
            { id: 'academy', label: '能力學院', icon: '🎓', action: 'placeholder' },
            { id: 'reports', label: '報表', icon: '📊', action: 'reports' }
        ],
        timeline: [
            { time: '09:55', event: '阿泰完成打卡' },
            { time: '10:30', event: '第一筆業績' },
            { time: '11:40', event: '新人完成學科' },
            { time: '13:20', event: '完成盤點' }
        ]
    };
})(typeof window !== 'undefined' ? window : globalThis);
