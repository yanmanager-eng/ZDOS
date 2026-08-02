/**
 * NEXT-004A | ZD Academy Capability Core — Capability Registry
 *
 * Static capability framework aligned with UI-018 ABILITY_MATRIX (12 items).
 * Distinct from Founder window.ZdosCapabilityRegistry.
 *
 * Does NOT render UI, write storage, or mutate Production SoT in index.html.
 */
(function (global) {
    'use strict';

    var Schema = global.ZdosAcademyCapabilitySchema;
    if (!Schema) {
        throw new Error('[ZdosAcademyCapabilityRegistry] Schema must load first');
    }

    /**
     * Mirror of UI-018 ABILITY_MATRIX — same ids / categories / copy.
     * Framework SoT for ZD Academy Core (Next). index.html may still hold its own copy until a later migration ticket.
     */
    var CAPABILITY_MATRIX = Object.freeze([
        Object.freeze({
            id: 'core',
            title: '核心職能',
            icon: '🧭',
            blurb: '每位夥伴的門市基本功',
            items: Object.freeze([
                Object.freeze({ id: 'newbie', name: '新人訓練', desc: '到職流程、儀容規範、系統登入與基本作業' }),
                Object.freeze({ id: 'sop', name: '門市 SOP', desc: '開閉店、交接班、現金與設備標準流程' }),
                Object.freeze({ id: 'hygiene', name: '食安衛生', desc: '食品安全、清潔消毒與衛生自主管理' }),
                Object.freeze({ id: 'cashier', name: '收銀作業', desc: '結帳、發票、行動支付與現金核對' })
            ])
        }),
        Object.freeze({
            id: 'pro',
            title: '專業進階',
            icon: '📚',
            blurb: '提升服務品質與客單價',
            items: Object.freeze([
                Object.freeze({ id: 'product', name: '產品知識', desc: '商品組成、特色與常見問答' }),
                Object.freeze({ id: 'sales', name: '銷售技巧', desc: '推薦、加購與客單提升' }),
                Object.freeze({ id: 'service', name: '客訴處理', desc: '客訴應對、情緒安撫與問題升級' }),
                Object.freeze({ id: 'marketing', name: '行銷活動', desc: '檔期活動、集點與會員推廣' })
            ])
        }),
        Object.freeze({
            id: 'mgmt',
            title: '管理發展',
            icon: '📈',
            blurb: '幹部與儲備幹部的養成',
            items: Object.freeze([
                Object.freeze({ id: 'lead', name: '幹部培訓', desc: '領導帶人、教育訓練與帶班' }),
                Object.freeze({ id: 'schedule', name: '排班管理', desc: '班表安排、人力調度與工時掌握' }),
                Object.freeze({ id: 'data', name: '數據判讀', desc: '業績、庫存與報表數據分析' }),
                Object.freeze({ id: 'team', name: '團隊領導', desc: '目標設定、激勵與跨店協作' })
            ])
        })
    ]);

    var boot = Schema.validateMatrix(CAPABILITY_MATRIX);
    if (!boot.ok) {
        throw new Error(
            '[ZdosAcademyCapabilityRegistry] invalid matrix: ' + boot.errors.join('; ')
        );
    }

    var BY_ID = Object.create(null);
    var ALL = [];
    for (var c = 0; c < CAPABILITY_MATRIX.length; c++) {
        var cat = CAPABILITY_MATRIX[c];
        for (var i = 0; i < cat.items.length; i++) {
            var item = cat.items[i];
            var row = Object.freeze({
                id: item.id,
                name: item.name,
                desc: item.desc,
                categoryId: cat.id,
                categoryTitle: cat.title
            });
            BY_ID[item.id] = row;
            ALL.push(row);
        }
    }
    Object.freeze(ALL);

    function listCategories() {
        return CAPABILITY_MATRIX.slice();
    }

    function getCategory(categoryId) {
        var id = String(categoryId || '');
        for (var i = 0; i < CAPABILITY_MATRIX.length; i++) {
            if (CAPABILITY_MATRIX[i].id === id) return CAPABILITY_MATRIX[i];
        }
        return null;
    }

    function getAllCapabilities() {
        return ALL.slice();
    }

    function getCapability(capabilityId) {
        var row = BY_ID[String(capabilityId || '')];
        return row || null;
    }

    function hasCapability(capabilityId) {
        return !!BY_ID[String(capabilityId || '')];
    }

    function listCapabilityIds() {
        return boot.capabilityIds.slice();
    }

    function getMatrix() {
        return CAPABILITY_MATRIX;
    }

    global.ZdosAcademyCapabilityRegistry = Object.freeze({
        CAPABILITY_MATRIX: CAPABILITY_MATRIX,
        listCategories: listCategories,
        getCategory: getCategory,
        getAllCapabilities: getAllCapabilities,
        getCapability: getCapability,
        hasCapability: hasCapability,
        listCapabilityIds: listCapabilityIds,
        getMatrix: getMatrix
    });
})(typeof window !== 'undefined' ? window : globalThis);
