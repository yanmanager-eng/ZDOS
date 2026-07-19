# ZDOS 更新紀錄

## v1.3.0

### Feature-009A：Schedule Registry（排班建立）✅

- 建立 `SCHEDULE_REGISTRY` 資料結構（`id`、`employeeId`、`storeId`、`date`、`shiftCode`、`templateId`、`note`、`createdAt`、`updatedAt`）
- 持久化：`localStorage` key `zdos_schedule_registry_v1`（不串 Supabase）
- Helper：`getSchedules()`、`getSchedulesByMonth()`、`getSchedule()`、`createSchedule()`、`updateSchedule()`、`deleteSchedule()`、`saveSchedules()`
- 排班中心：點擊日期新增排班（員工來自 `getSchedulableEmployeesForStore`，班別來自 `SHIFT_TEMPLATE`）
- 已有排班：點擊班別可修改或刪除；月曆即時更新、換月資料正常

**驗收：** 新增／修改／刪除排班 · localStorage 保存 · 不刷新即更新 · 依 Registry 取資料 · Console 無 Error

---

## v1.2.9

### Hotfix：排班中心門市過濾 ✅

- 修正 `normalizeStoreIdCode()`，移除錯誤 fallback 字串比對
- `getSchedulingStoreId()` 僅讀登入 session 的 `state.storeType`
- `getSchedulableEmployeesForStore(currentStoreId)` 直接過濾 `EMPLOYEE_REGISTRY`
- 登入時清除 `activeSchedulingEmployeeId`，避免跨 session 殘留
- 東港店（DG）僅 4 位所屬員工 + 顏志添（支援）

---

## v1.2.8

### 排班中心：跨店排班限制 ✅

- 員工清單依**目前登入門市**過濾（`getSchedulableEmployeesForStore`）
- 僅 `canCrossStore = true` 員工可出現於非所屬門市，並標示「支援／原屬門市」
- 一般員工不可跨店排班；店長／集團首腦亦不可繞過 `canCrossStore`
- 新增 `validateScheduleAssignment()`、`saveScheduleAssignment()` 儲存前驗證

**驗收：** 中華店 4 人 + 顏志添跨店支援 · 東港店 4 人 + 顏志添支援 · DG 員工不在 CH 清單 · RWD · Console 無 Error

---

## v1.2.7

### Feature-008F：Shift Template ✅

- 建立 `SHIFT_TEMPLATE` 管理各門市實際上下班時間
- 欄位：`id`、`storeId`、`shiftCode`、`startTime`、`endTime`、`breakMinutes` 等
- 預設：CH-M1 / CH-A1 / CH-N1 / DG-M1（假資料）
- Helper：`getShiftTemplates()`、`getShiftTemplatesByStore()`、`getShiftTemplate()`、`getDefaultShiftTemplate()`
- `storeId` 關聯 `STORE_REGISTRY`；`shiftCode` 關聯 `SHIFT_REGISTRY`
- 尚未修改排班 UI、不串 API／Supabase、無編輯畫面

**驗收：** Template 建立 · Helper · Store/Shift 關聯 · 不影響既有功能 · Console 無 Error

---

## v1.2.6

### Architecture Rule #003：Shift Registry ✅

- 建立 `SHIFT_REGISTRY` 班別分類（M 早班 / A 中班 / N 晚班）
- `timeRange` 僅供排班分類、報表統計、AI 分析、班次篩選
- **班別（Category）≠ 工時（Working Time）**；實際上下班由 Schedule / Shift Template 決定
- 業績班別下拉、Store `shiftCodes` 改讀 Registry；新增 `classifyShiftByTime()` 等 Helper

**驗收：** Registry 建立 · 分類時間窗 · 不綁定工時 · 既有業績申報正常 · RWD

---

## v1.2.5

### Feature-008D：Employee Registry ✅

- 建立 `EMPLOYEE_REGISTRY` 全系統唯一員工主檔（假資料）
- 欄位：`id`、`employeeNo`、`name`、`storeId`（CH/DG/HJ）、`role`、`status`、`canSchedule`、`canCrossStore`、`sortOrder`
- Helper：`getEmployee()`、`getEmployeesByStore()`、`getActiveEmployees()`、`getSchedulableEmployees()`
- 排班中心員工清單改讀 Registry；`storeId` 關聯 `STORE_REGISTRY`
- 尚未串接 Supabase / API；不含新增／編輯／刪除員工 UI

**驗收：** Registry 建立 · Store 關聯 · Helper · 排班中心 · RWD · Console 無 Error

---

## v1.2.4

### Architecture：Store Registry ✅

- 建立 `STORE_REGISTRY` 唯一門市清單（CH / DG / HJ）
- `status: active` 正常使用；`coming_soon` 顯示尚未開放、Toast 提示、不切換資料
- 登入選單、帳號店別、核對中心、業績統計、雲端設定分頁改由 Registry 動態產生
- 禁止各模組寫死店別；新增門市僅需擴充 Registry

**驗收：** Registry 單一來源 · 三店選單 · HJ 提示 · CH/DG 正常 · 架構文件同步

---

## v1.2.3

### Feature-008C：後勁店預留入口 ✅

- 所有店別選單新增「後勁店（HJ）」選項
- 後勁店標示「尚未開放」，點擊僅顯示 Toast 提示
- 不切換店別、不載入資料、不建立假員工／排班資料
- 中華店（CH）與東港店（DG）既有功能維持正常

**驗收：** 三店顯示 · 後勁店提示 · 不切換資料 · CH/DG 正常 · RWD · Console 無 Error

---

## v1.2.2

### Feature-008B：Month Navigation ✅

- 新增 `state.schedule { year, month }` 月份狀態
- 排班中心 Header：`＜ YYYY 年 M 月 ＞` 上一月／下一月
- 新增 `generateCalendar(year, month)` 重新產生月曆
- 支援跨年（12→1、1→12）與閏年天數
- 尚未串接排班資料、localStorage 或 API

**驗收：** Header 年月 · 上一月／下一月 · 跨年 · 閏年 · 月曆重生 · RWD · Console 無 Error

---

## v1.2.1

### Feature-008A：Scheduling Center Layout ✅

- Dashboard 功能中心新增「📅 排班中心」入口
- 新增 Scheduling Center View（Workspace 架構）
- 左側：員工清單（假資料 8 筆）
- 右側：月曆版面（當月 Grid，含今日標記）
- 沿用 Glass UI / Tailwind 風格，Desktop + Mobile RWD
- 尚未串接資料，不影響其他模組

**驗收：** 可進入 · 左右版面 · Desktop · Mobile RWD · Console 無 Error

---

## v1.2.0

### Feature-008：Announcement Center v1.0 ✅

- 首頁新增「📢 公告中心」入口（含未讀 Badge）
- 公告中心：必讀公告、本週重點（橫向最多三張）、最新公告列表
- 公告詳情：分類、標題、發布人、發布時間、完整內容
- 「我已閱讀／標為未讀」切換，本地 `zdos_announcement_read_v1` 持久化
- 內建五筆假資料（行政、人資、庶務、採購、個人）

**驗收：** Home 可進入 · 公告可閱讀 · 已讀可切換 · 手機 RWD · 不影響其他 View

### Architecture-001：Workspace Navigation ✅

- Dashboard 與 Function Workspace 完全分離
- 全站 Function Header 統一
- 所有功能頁採 Workspace 架構
- 保持既有資料與功能不變

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
