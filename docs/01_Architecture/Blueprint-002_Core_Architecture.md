# Blueprint-002｜Core Architecture

> ARCH-001｜Architecture Documents  
> 來源：`RULES.md`、`PROJECT.md`（架構規則段落）、`CHANGELOG.md`、`docs/01_Architecture/NEXT-001_CAPABILITY_ENGINE.md`、現行 `index.html`／`core/`／`ui/` 結構  
> 原則：只描述已確認執行架構與規則；不新增未存在的引擎或服務。

---

## 1. 執行時形態

| 項目 | 現況 |
|------|------|
| 主執行檔 | `index.html`（SPA） |
| Bundler | 無 |
| 框架 | 無 React／Vue；原生 JavaScript |
| UI | Tailwind CSS（CDN）＋專案 CSS（`ui/*.css`） |
| 狀態 | 全局 `state` |
| 渲染 | `renderApp()` 為主要 UI 渲染入口（`innerHTML` 重繪） |
| 腳本型態 | Classic sync `<script>`；Next 模組以 IIFE 掛 `window.*`（非 ES modules） |

次要靜態頁：`maintenance.html` 等。歷史備份檔（如 `index1_0_0.html`）非現行執行入口。

---

## 2. 目錄結構（確認存在）

```text
ZDOS-Next/
├── index.html                 # 主應用
├── maintenance.html
├── RULES.md / PROJECT.md / CHANGELOG.md
├── core/
│   ├── capability/            # NEXT-001～003 Founder Capability 層
│   └── devplatform/           # ZDP-001
├── ui/                        # CSS、維護設定、Operation Center、品牌資產等
├── supabase/                  # migrations / seed / README
├── docs/
│   ├── 00_Project/
│   ├── 01_Architecture/
│   ├── 02_Features/
│   ├── 04_Roadmap/
│   └── PL/
├── data/ / assets/ / scripts/
└── .zdos-local-secrets/       # 本機密鑰（不得提交敏感內容至公開流程）
```

---

## 3. View 路由模型

登入前／登入後由 `state.isLoggedIn` 與 `state.currentView` 驅動。已確認 View 識別包含（非完整列舉每一子狀態）：

| View | 產品意義 |
|------|----------|
| `dashboard` | 今日營運首頁（官方預設） |
| `module` | 業績／庫存功能後台（`activeAppTab`） |
| `review` | 業績核對中心 |
| `announcements`／`announcement-detail`／`announcement-manager` | 公告 |
| `notifications` | 推播中心 |
| `scheduling`／`leaveCenter`／`hrHome`／`workforce`／`schedule-change` | 人力／排班／請假 |
| `accounting`／`reports` | 財務中心 |
| `academy` | 能力學院 |
| `operation-center` | 營運中心 |
| `founder-console` | Founder Console（Next，Flag） |
| `dev-platform` | Development Platform（Next，Flag） |
| `coming-soon` | 尚未開放佔位 |

Workspace Navigation（Architecture-001）：Dashboard 與 Function Workspace 分離；功能頁採統一 Function Header／Workspace 殼。

---

## 4. 核心架構規則（Registries）

以下為強制單一來源規則（見 `RULES.md`）：

### 4.1 Store Registry

- 常數：`STORE_REGISTRY`
- 禁止各模組寫死店別名稱／代碼
- `status: active | coming_soon`
- Helper 例：`getActiveStores()`、`getStoreByCode()`、`isStoreActive()`、`storeHasMobilePay()`、`getStoreGoogleConfig()`

### 4.2 Shift Registry（Rule #003）

- 常數：`SHIFT_REGISTRY`（M／A／N）
- **班別（Category）≠ 工時（Working Time）**
- `timeRange` 僅供分類／篩選／統計；實際上下班由 Schedule／`SHIFT_TEMPLATE` 決定
- Helper 例：`getShiftByCode()`、`classifyShiftByTime()`、`renderShiftSelectOptions()`

### 4.3 Shift Template

- 常數／資料：`SHIFT_TEMPLATE`（門市實際上下班）
- 關聯：`storeId` → Store；`shiftCode` → Shift
- Helper 例：`getShiftTemplatesByStore()`、`getDefaultShiftTemplate()`

### 4.4 Employee Registry

- 常數：`EMPLOYEE_REGISTRY`（與 `DEFAULT_ACCOUNTS` 正式名單同步，27 人）
- 欄位含：`id`、`employeeNo`、`name`、`storeId`、`role`、`status`、`canSchedule`、`canCrossStore`、`sortOrder`
- 跨店排班僅 `canCrossStore = true`；集團首腦 `canSchedule = false`
- 排班清單必須經 `getSchedulableEmployeesForStore()`；儲存前 `validateScheduleAssignment()`

### 4.5 Schedule Registry

- 持久化：`zdos_schedule_registry_v1`
- CRUD Helper：`getSchedules()`、`createSchedule()`、`updateSchedule()`、`deleteSchedule()` 等
- `storeId` 以排班中心目前選取門市（`getSchedulingViewStoreId()`）為準
- Baseline：`SCHEDULE_BASELINE_202607` 首次合併；**不是 Import Tool**

---

## 5. 能力學院核心邏輯（UI-018，應用內）

位於 `index.html`（非獨立 `core/` 套件）：

| 元件 | 說明 |
|------|------|
| `ABILITY_MATRIX` | 12 項能力靜態定義（唯一框架來源） |
| 等級 0～3 | 未評核／學習中／已達標／精通 |
| `ABILITY_PREREQUISITES` | 先修關聯；解鎖門檻 `ABILITY_UNLOCK_LEVEL = 2` |
| `LEARNING_PATHS` | 三條路徑：新人啟航／服務進階／儲備幹部 |
| Helper | `isAbilityUnlocked()`、`getLearningPathProgress()`、`setEmployeeAbilityLevels()` 等 |

與 ORL（`zdos_personnel_orl_registry_v1`，等級 1～5）並存：ORL 總體、能力分項。

---

## 6. Next Capability 層（Founder，獨立於 UI-018）

```text
window.ZdosCapabilityTypes
        ↓
window.ZdosCapabilityRegistry
        ↓
window.ZdosCapabilityEngine
        ↓
window.ZdosFounderContext  +  window.ZdosCapabilityResolver
        ↓
window.ZdosFounderIdentityAdapter  →  Founder Console / ZDP
```

| 全域 | 職責 |
|------|------|
| `ZdosCapabilityTypes` | 不可變 capability codes：`founder`、`founder_insight`、`ai_brief`、`roadmap`、`system_health` |
| `ZdosCapabilityRegistry` | role-group → capability 集合（v0.1 僅 `founder` 組） |
| `ZdosCapabilityEngine` | 查詢／開關；**預設關閉**；`setEnabledForDev` 僅 memory、localhost／file |
| `ZdosFounderContext`／`ZdosCapabilityResolver` | 解析是否具備能力 |
| `ZdosFounderIdentityAdapter` | 正式角色 → Founder Context（無硬編碼帳號） |
| Founder Console／ZDP | Flag + Guard；不改寫既有角色權限結果 |

**非目標（NEXT-001 已載明）：** 新 Auth、新角色系統、取代現有 membership／RLS／中心權限。

注意：此層「Capability」語意＝Founder Layer 功能開關；與 UI-018「能力學院」分項能力是不同概念，不得混用同一資料模型。

---

## 7. 認證與權限執行路徑

1. **Local 帳號路徑**：`store_accounts`／預設帳號＋`shield_*` session keys  
2. **Supabase Auth 路徑**：雲端登入與 `profiles`／membership（開場可與 Auth 並行載入）  
3. **模組權限**：各功能以既有 helper／角色判斷（例：庫存特權、排班編輯、`canManageEmployeeAbility`）  
4. **Next Guard**：Flag ∧ Engine ∧ Founder 角色 ∧ `founder` capability  

不得在未核准前提下以 Founder Capability 取代現場 RBAC。

---

## 8. 外部整合邊界

| 整合 | 用途 | 架構約束 |
|------|------|----------|
| Google Forms | 業績／庫存上傳 | URL／entry ID 不可擅自修改；`fetch` `no-cors` |
| Supabase | Auth、雲端表、RLS | migrations 於 `supabase/migrations/` |
| BarcodeDetector | 庫存掃描 | 瀏覽器能力；有 fallback |

---

## 9. 硬性開發約束（Core）

摘自 `RULES.md`：

1. 不可修改 localStorage Key 名稱  
2. 不可修改 Google Form URL 與 entry ID  
3. 不可修改登入流程核心  
4. 不可修改中華店／東港店現金公式  
5. 不可修改 `salesRecords`、`inventoryRecords` 結構  
6. 最小化 diff；禁止整檔重寫 `index.html`  
7. 優先改現有程式，不無故重構  
8. Registry／排班跨店／Baseline 規則必須遵守  

---

## 10. 本文件不涵蓋

- 未實作的 Knowledge／Decision／Genesis／Workflow AI／Enterprise OS 內部設計  
- 獨立「Capability Core」套件（若未來另開票號，不得與本文件混淆為已存在）  

---

*ARCH-001｜Blueprint-002 Core Architecture · 對齊現行執行架構*
