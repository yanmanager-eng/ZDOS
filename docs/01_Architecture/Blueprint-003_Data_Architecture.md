# Blueprint-003｜Data Architecture

> ARCH-001｜Architecture Documents  
> 來源：`PROJECT.md` localStorage 表、`CHANGELOG.md`、`supabase/migrations/*`、UI-018／Schedule／ORL 已確認結構  
> 原則：只列已存在的 key、Registry 欄位與 migration 表；不發明未落地的資料表或雲端同步。

---

## 1. 資料平面總覽

ZDOS 目前為 **多平面並存**，非單一資料庫：

```text
┌─────────────────────┐
│  Browser localStorage │  現場營運／排班／能力／部分設定
└──────────┬──────────┘
           │
┌──────────▼──────────┐     ┌──────────────────────┐
│  Google Forms POST   │────▶│  Google 試算表        │
│  (no-cors)           │     │  (既有現場匯入路徑)   │
└─────────────────────┘     └──────────────────────┘

┌─────────────────────┐
│  Supabase            │  Auth + SQL tables + RLS
│  (雲端平面)          │
└─────────────────────┘
```

能力學院分項等級、ORL、排班 Registry 等 **明確不串雲端**（截至 v1.5.0 文件）。

---

## 2. 應用內 Registry／常數（Source of Truth）

| 名稱 | 位置 | 持久化 | 說明 |
|------|------|--------|------|
| `STORE_REGISTRY` | `index.html` | 常數 | 門市主檔 |
| `SHIFT_REGISTRY` | `index.html` | 常數 | 班別分類 M／A／N |
| `SHIFT_TEMPLATE` | `index.html` | 常數 | 門市工時模板 |
| `EMPLOYEE_REGISTRY` | `index.html` | 常數（與帳號同步） | 員工主檔 27 人 |
| `DEFAULT_ACCOUNTS` | `index.html` | 可覆寫於帳號儲存 | 正式登入名單 |
| `ABILITY_MATRIX` | `index.html` | 常數 | 12 項能力框架 |
| `ABILITY_PREREQUISITES` | `index.html` | 常數 | 先修圖 |
| `LEARNING_PATHS` | `index.html` | 常數 | 三條學習路徑 |
| `SCHEDULE_BASELINE_202607` | `index.html` | 首次合併至 LS | Baseline 排班 |
| `VERSION_INFO` | `index.html` | 常數 | 版本公告來源 |
| `ZdosCapabilityTypes`／Registry | `core/capability/*` | 記憶體常數 | Founder capability codes |
| `zdp-registry` | `core/devplatform/*` | 記憶體（對齊 Backlog） | DEV 票據清單 |

---

## 3. localStorage Keys（不可更名）

### 3.1 核心 session／設定（PROJECT 已列）

| Key | 用途 |
|-----|------|
| `shield_is_logged_in` | 登入狀態 |
| `shield_store_type` | 當前店別 |
| `shield_employee_id` | 當前工號 |
| `zdos_current_view` | 目前 View |
| `store_accounts_v48_system` | 員工帳密 |
| `google_form_settings_v31_permanent` | Google Form 配置 |
| `local_sales_records_v22` | 業績歷史 |
| `local_inventory_records_v22` | 庫存歷史 |
| `cover_notice_v31_permanent` | 封面公告 |
| `cover_design_v31_permanent` | 封面外觀 |

### 3.2 排班／人力

| Key | 用途 |
|-----|------|
| `zdos_schedule_registry_v1` | Schedule Registry |
| `zdos_schedule_baseline_202607_applied` | Baseline 是否已套用 |

### 3.3 人員戰力／能力學院

| Key | 用途 |
|-----|------|
| `zdos_personnel_orl_registry_v1` | ORL 戰力等級 |
| `zdos_ability_registry_v1` | 分項能力等級（員工 → abilityId → 0～3） |

### 3.4 公告（CHANGELOG 已列）

| Key | 用途 |
|-----|------|
| `zdos_announcement_read_v1` | 公告已讀狀態 |

### 3.5 版本公告

| Key | 用途 |
|-----|------|
| `zdos_last_seen_version` | 登入前版本公告是否已看過 |

> 其他模組可能另有 key；新增 key 須評估相容性。上表為文件已確認、不可更名之核心集合。

---

## 4. 關鍵本地資料結構

### 4.1 Schedule Registry 筆位

欄位（Feature-009A）：`id`、`employeeId`、`storeId`、`date`、`shiftCode`、`templateId`、`note`、`createdAt`、`updatedAt`。

關聯：

- `employeeId` → `EMPLOYEE_REGISTRY`
- `storeId` → `STORE_REGISTRY`
- `shiftCode` → `SHIFT_REGISTRY`
- 工時 → `SHIFT_TEMPLATE`

### 4.2 Ability Registry 映射

```text
zdos_ability_registry_v1 = {
  [employeeId]: {
    [abilityId]: 0 | 1 | 2 | 3
  }
}
```

`abilityId` 必須屬於 `ABILITY_MATRIX`（例：`newbie`、`sop`、`hygiene`、`cashier`、`product`、`sales`、`service`、`marketing`、`lead`、`schedule`、`data`、`team`）。

先修解鎖（應用邏輯，非獨立 DB）：

- 表：`ABILITY_PREREQUISITES`
- 門檻：先修能力等級 ≥ `ABILITY_UNLOCK_LEVEL`（2＝已達標）

### 4.3 ORL

- 等級 1～5（培育級～戰略級）
- 儲存：`zdos_personnel_orl_registry_v1`
- 與能力分項分離

### 4.4 業績本地紀錄

- Key：`local_sales_records_v22`
- 結構受 `RULES.md` 保護，不可破壞相容性
- 審核欄位（核對中心）：含 `status`、`reviewBy`、`reviewAt`、`reviewRemark` 等（Feature-005B）

### 4.5 庫存本地紀錄

- Key：`local_inventory_records_v22`
- 結構受保護

---

## 5. Supabase 資料架構（migrations 已建立）

路徑：`supabase/migrations/`。下列表均 `ENABLE ROW LEVEL SECURITY`（政策見 RLS migration）。

| Migration | Table | 用途摘要 |
|-----------|-------|----------|
| `…002` | `public.stores` | 門市：`code`、`name`、`is_active` |
| `…003` | `public.profiles` | 使用者：`employee_no`、`display_name`、`role`、`default_store_id`、`is_active`；FK → `auth.users` |
| `…004` | `public.user_store_memberships` | 使用者↔門市；`is_primary`、`is_active`；UNIQUE(`user_id`,`store_id`) |
| `…005` | `public.sales_reports` | 雲端業績：店／日／班、金額欄位、`status`（draft／submitted／approved／rejected／cancelled）、送審／核准 |
| `…006` | `public.inventory_products` | 庫存品項主檔 |
| `…007` | `public.inventory_reports` | 庫存回報單頭 |
| `…008` | `public.inventory_report_items` | 庫存回報明細 |
| `…009` | `public.notifications` | 通知 |
| `…010` | `public.audit_logs` | 稽核 |
| `…40001` | RLS policies | 初始列級政策 |
| `…recover_employee_no` | Feature | 工號相關修復／功能 migration |

### 5.1 `profiles.role` 允許值

`owner`｜`manager`｜`supervisor`｜`trainee_manager`｜`senior_staff`｜`staff`

### 5.2 `sales_reports` 狀態

`draft`｜`submitted`｜`approved`｜`rejected`｜`cancelled`  
同一店／日／班在非 `cancelled` 狀態下唯一（partial unique index）。

---

## 6. Next 層資料（非持久化／不寫既有 key）

| 項目 | 儲存 |
|------|------|
| Capability Engine 啟用狀態 | memory；DEV 開關不寫既有 LS key |
| `ZDOS_FOUNDER_CONSOLE` | memory，預設 false |
| `ZDOS_DEV_PLATFORM` | memory，預設 false |
| ZDP Founder Review 決策 | memory only |
| Founder Test Context | DEV memory |

---

## 7. 資料邊界與禁止事項

1. **禁止更名**已上線 localStorage Key  
2. **禁止**未評估即新增／遷移破壞現場裝置資料  
3. **禁止**將 UI-018 能力等級或 ORL  silently 改寫為雲端唯一來源（現況為本地）  
4. **禁止**把 Innovation Backlog 中未建表的引擎（Knowledge／Decision／Genesis 等）寫成已有 schema  
5. Google Form entry 與試算表欄位綁定，視為外部 schema，不可擅自改 ID  
6. Baseline Schedule 僅更新內嵌陣列與 version，不另建 CSV／Excel 匯入 UI 作為架構路徑  

---

## 8. 與產品／核心架構的對應

| 文件 | 職責 |
|------|------|
| Blueprint-001 | 產品範圍與雙軌 |
| Blueprint-002 | 執行時、Registry、Capability 層、約束 |
| Blueprint-003（本文件） | Key、結構、Supabase 表、資料平面 |

---

*ARCH-001｜Blueprint-003 Data Architecture · 對齊已確認資料平面*
