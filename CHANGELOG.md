# ZDOS 更新紀錄

## UI-016A｜班別三段看板

- 今日排班總覽改為班別三段看板（早／中／晚）
- 色點＋姓名＋短時間（10-19），flex wrap 排列
- 保留收合、【今天】、搜尋定位、長按 Sheet、共用 Snapshot 統計
- 未改排班邏輯／資料來源／權限／Supabase

---

## UI-016｜排班中心 Compact Mode（正式版）

- 今日排班總覽改 Compact List（每人一列 40~44px；取消大型資訊卡）
- 早／中／晚班區塊可收合（預設展開）；標題旁顯示人數與已到／未到
- 姓名左側 4px 固定識別色（`getEmployeeColor`）
- 【今天】立即定位；今日日期藍色高亮
- 搜尋姓名／工號立即定位
- 長按 500ms Bottom Sheet；主管可「編輯班表」「幫忙排假」
- 統計共用 Snapshot，不重複掃描班表
- 未改排班邏輯／資料來源／權限／Supabase／班別規則
- 未 Deploy Production

---

## v1.1.0

### Feature-005B：業績核對中心 🔒 Locked

- Dashboard 新增「待核對」入口（中華店／東港店筆數）
- 業績核對中心：僅顯示 pending，支援核對完成／退回修改
- 業績審核欄位：status、reviewBy、reviewAt、reviewRemark
- 核對權限：集團首腦、店長、領班、實習幹部

**驗收：** 權限 · 待核對筆數 · 核對／退回 · 回歸測試 — 全部 PASS

---

## v1.0.3 Beta

### Feature-003：登入前版本更新公告 ✅

- 恢復 `#update-modal`，內容改由 `VERSION_INFO` 動態產生
- 登入前若 `zdos_last_seen_version !== VERSION_INFO.version` 自動顯示
- 按「我知道了，開始登入」關閉並寫入 `zdos_last_seen_version`
- 同版本僅提醒一次；版本變更後再次顯示

### Feature-002：版本中心 ✅

- Dashboard 功能中心新增「版本資訊」卡片（店長／集團首腦可見）
- 顯示版本號、更新日期、最近更新摘要（`VERSION_INFO` 常數，與本文件同步）
- Dashboard Header／Footer 版本統一為 v1.0.3 Beta

### Feature-001：登入流程優化 ✅

- 登入頁改為工號、密碼、登入（移除分店按鈕）
- 先驗證帳密，再依帳號自動登入或選店
- 一般員工（單店）直接登入，不詢問門市
- 雙店帳號或集團首腦驗證後選擇門市
- `shield_*` 不變；Google Form 不變

**驗收：** 一般員工直接登入 · 雙店才選門市 · 集團首腦可選門市 · shield_* 不變 · Google Form 不變

**負責：** ChatGPT 需求設計 · Cursor 程式修改 · 小天 測試

---

## v1.0.2
- 初版正式系統

## v1.0.2 Hotfix-1
- 修正 VIEW C canManage 作用域造成白屏
- 改為 hasInventoryPrivilege
- 不影響登入
- 不影響 Google Form
- 不影響 localStorage
