# M1-002｜MER Schema 設計（定稿）

| 項目 | 內容 |
|------|------|
| 文件編號 | M1-002 |
| 標題 | Master Employee Registry — Schema Design |
| 狀態 | Schema Locked（邏輯 Schema 定稿；未實作） |
| 前置依賴 | M1-001（已確認鎖定） |
| 適用系統 | ZDOS（ZhongDong Operating System） |
| 撰寫日期 | 2026-07-23 |

---

## 0. 本文件邊界（強制）

本任務 **只定稿邏輯 Schema**，明確 **不包含**：

- 修改 `index.html` 或任何執行程式
- 修改 localStorage Key／寫入邏輯
- 修改登入流程或任何既有 Feature
- 撰寫／提交可執行 SQL 檔
- 建立 `supabase/migrations/*`
- 實作 UI／API／CRUD／雙寫

後續實作另開任務，並遵守 `RULES.md`（最高優先）。

### 0.1 本文件定稿依據（評估預設）

依 M1-002 Engineering Assessment 核准範圍：

| 決策 | 定稿 |
|------|------|
| 交付物 | 本文件 |
| 範圍 | **MER 定稿**＋ Auth／Profiles／Memberships **邊界 stub** |
| SQL | **不寫**（僅邏輯 Schema） |
| `status` | `active` / `inactive` / `terminated` |
| `primary_store_hint` | **保留**（提示用，非正式店別權威） |

---

## 1. 設計目標

1. 將 M1-001 的「建議欄位」升級為可實作的 **欄位／約束／關聯定稿**。
2. 以 MER 為人員唯一主檔；密碼、角色、門市不進入 MER。
3. 預留 Auth／Profiles／Memberships 關聯邊界，避免日後各模組自建人員名單。
4. 與現行 legacy `accounts`（`store_accounts_v48_system`）相容敘事清楚，但 **本階段不遷移**。

---

## 2. 邏輯實體關係（ER）

```
                    ┌─────────────────────┐
                    │         MER         │
                    │  master_employees   │
                    └──────────┬──────────┘
                               │ 1
               ┌───────────────┼───────────────┐
               │ 0..1          │ 1             │ 1
               ▼               ▼               ▼ N
        ┌────────────┐  ┌────────────┐  ┌─────────────────┐
        │ auth_users │  │  profiles  │  │   memberships   │
        │  （stub）  │  │  （stub）  │  │    （stub）     │
        └────────────┘  └────────────┘  └─────────────────┘
```

| 關係 | 基數 | 說明 |
|------|------|------|
| MER → Auth | **1 : 0..1** | 可有人尚未開通登入 |
| MER → Profile | **1 : 1** | 開通後應有一筆 Profile（建立時機見 M1-001 §8） |
| MER → Membership | **1 : N** | 一人可有多門市／多段資格 |
| Auth／Profile／Membership → MER | N/1 → 1 | **FK 由子實體持有** `mer_id` |

### 2.1 關聯鍵規則

| 規則 | 定稿 |
|------|------|
| 穩定主鍵 | MER.`id`（UUID）為全域人員穩定鍵 |
| 顯示／輸入鍵 | MER.`employee_code`（工號）；**不可**當永久 FK |
| 子表 FK | `auth_users.mer_id`、`profiles.mer_id`、`memberships.mer_id` → `master_employees.id` |
| 業務模組引用 | 業績／庫存現行存工號字串；未來新增欄位時優先存 `mer_id`，工號僅快照（另開任務，本階段不改 `salesRecords`／`inventoryRecords`） |

---

## 3. MER 主實體定稿：`master_employees`

> 邏輯表名（未來 DB／集合皆可對應此名）。非 SQL。

### 3.1 欄位

| 欄位 | 邏輯型別 | 必填 | 預設 | 說明 |
|------|----------|------|------|------|
| `id` | UUID | 是 | 產生時指派 | 內部穩定主鍵；永不複用 |
| `employee_code` | string(32) | 是 | — | 工號（如 `CDP0003`）；官方大小寫原樣儲存 |
| `employee_code_norm` | string(32) | 是 | 由 `employee_code` 正規化寫入 | 小寫＋trim；僅供唯一比對與索引 |
| `name` | string(80) | 是 | — | 人事／系統顯示姓名 |
| `status` | enum | 是 | `active` | 見 §3.2 |
| `primary_store_hint` | string(32) \| null | 否 | `null` | 提示用門市；**非正式隸屬權威**（權威在 Memberships） |
| `notes` | string(500) \| null | 否 | `null` | 內部備註 |
| `created_at` | datetime (ISO-8601) | 是 | 建立時刻 | |
| `updated_at` | datetime (ISO-8601) | 是 | 建立／更新時刻 | |
| `created_by` | UUID \| string \| null | 否 | `null` | 操作者（可為 MER id 或系統標記） |
| `updated_by` | UUID \| string \| null | 否 | `null` | 操作者 |

### 3.2 `status` 枚舉（定稿）

| 值 | 語意 | 典型用途 |
|----|------|----------|
| `active` | 在職可用 | 可開通 Auth／Membership |
| `inactive` | 停用（保留主檔） | 暫停營運身分，主檔仍在 |
| `terminated` | 離職／終止 | 歷史關聯保留；不應新開 Membership |

**狀態規則（定稿）：**

- `terminated` 不得新建 Auth 憑證或新 Membership。
- `inactive` 應停用 Auth 登入（由 Auth／Account Center 執行，非 MER 職責）。
- MER **不**因狀態變更而實體刪除列（禁止硬刪導致歷史斷鏈）。

### 3.3 工號正規化（定稿）

對齊現行 `normalizeEmpId` 精神：

1. `employee_code_norm = trim(lower(employee_code))`
2. 空字串非法
3. 寫入／變更 `employee_code` 時必須同步重算 `employee_code_norm`
4. 變更工號：**不得**變更 `id`
5. 歷史業績以舊工號字串存在時，相容策略屬 **M1-003／遷移任務**，不在本 Schema 改業務表

### 3.4 明確禁止出現在 MER 的欄位

| 禁止欄位 | 歸屬 |
|----------|------|
| `password` / 密碼雜湊 | Auth |
| `role` | Memberships |
| `store` / `store2` | Memberships |
| Session／登入旗標 | Auth |
| 營收／審核／排假欄位 | 各業務模組 |
| 主題／頭像／通知偏好 | Profiles |

---

## 4. 唯一約束與索引（邏輯定稿）

### 4.1 唯一約束

| 名稱（邏輯） | 欄位 | 說明 |
|--------------|------|------|
| `pk_master_employees` | `id` | 主鍵 |
| `uq_master_employees_code_norm` | `employee_code_norm` | 全系統工號唯一（大小寫不敏感） |

### 4.2 建議索引

| 名稱（邏輯） | 欄位 | 用途 |
|--------------|------|------|
| `ix_master_employees_status` | `status` | 篩選在職／停用 |
| `ix_master_employees_name` | `name` | 管理端搜尋（可選） |
| `ix_master_employees_updated_at` | `updated_at` | 同步／稽核（可選） |

### 4.3 檢查約束（邏輯）

| 規則 | 說明 |
|------|------|
| `employee_code` 長度 1..32 | |
| `name` 長度 1..80 | |
| `status ∈ {active, inactive, terminated}` | |
| `primary_store_hint` 若有值 | 建議為已知店別代碼／名稱；**本階段不強制 FK 到店別主檔**（店別主檔尚未定稿） |

---

## 5. 邊界 Stub：Auth／Profiles／Memberships

> 僅定關聯與最小欄位，便于 ER 完整；**詳細規格另開文件**。本階段不實作。

### 5.1 `auth_users`（stub）

| 欄位 | 邏輯型別 | 必填 | 說明 |
|------|----------|------|------|
| `id` | UUID | 是 | Auth 主鍵 |
| `mer_id` | UUID | 是 | FK → `master_employees.id`（**唯一**：一人最多一組登入主體） |
| `login_enabled` | boolean | 是 | 是否允許登入 |
| `credential_ref` | string \| null | 否 | 憑證存放參考（未來雜湊／外部 IdP）；**不在 MER** |
| `created_at` / `updated_at` | datetime | 是 | |

**唯一：** `uq_auth_users_mer_id (mer_id)`

### 5.2 `profiles`（stub）

| 欄位 | 邏輯型別 | 必填 | 說明 |
|------|----------|------|------|
| `id` | UUID | 是 | |
| `mer_id` | UUID | 是 | FK → MER（**唯一** 1:1） |
| `display_name_override` | string \| null | 否 | 若空則顯示 MER.`name` |
| `preferences_json` | object \| null | 否 | 通知／UI 偏好等 |
| `created_at` / `updated_at` | datetime | 是 | |

**唯一：** `uq_profiles_mer_id (mer_id)`

### 5.3 `memberships`（stub）

| 欄位 | 邏輯型別 | 必填 | 說明 |
|------|----------|------|------|
| `id` | UUID | 是 | |
| `mer_id` | UUID | 是 | FK → MER |
| `store_code` | string(32) | 是 | 如 `中華店`／`東港店`（過渡期可沿用現行字串） |
| `role` | string(32) | 是 | 如 `領班`、`店長`、`集團首腦` |
| `status` | enum | 是 | 建議 `active` / `ended` |
| `valid_from` | datetime \| null | 否 | 生效起 |
| `valid_to` | datetime \| null | 否 | 生效迄 |
| `created_at` / `updated_at` | datetime | 是 | |

**唯一（邏輯建議）：**

- 同一 `mer_id` + `store_code` + 重疊有效期間，不得有兩筆 `active` 衝突角色（細部演算法於 Memberships 專規定稿）。
- 過渡期最小唯一：`uq_memberships_mer_store_active` 方向先記錄於專規；本 stub 先要求 **查詢以 (mer_id, store_code, status) 為主路徑**。

**索引建議：** `ix_memberships_mer_id`、`ix_memberships_store_role`

### 5.4 資料流（重申 M1-001）

```
MER → Account Center → Auth → Profiles → Memberships
```

開通／停用順序以 M1-001 §8 為準；Schema 不定義 UI。

---

## 6. 與 legacy `accounts` 的對應備註（不遷移）

現行合併視圖欄位（`store_accounts_v48_system`）：

| Legacy 欄位 | Schema 歸屬 |
|-------------|-------------|
| `empId` | MER.`employee_code`（＋ `employee_code_norm`） |
| `name` | MER.`name` |
| （無顯式狀態） | MER.`status`（遷移時預設 `active`） |
| `password` | Auth stub |
| `store` / `store2` | Memberships（多列） |
| `role` | Memberships.`role` |

**約束重申：**

- 不得改名／廢棄 `store_accounts_v48_system`（RULES）。
- 本文件 **不** 改變現場讀寫行為。
- 完整列級對照表屬 **M1-003**。

---

## 7. 非目標清單

- [ ] 可執行 SQL / Migration
- [ ] Supabase 實表
- [ ] `index.html` 適配層
- [ ] 雙寫／切流
- [ ] Account Center UI
- [ ] 修改登入、Google Form、業績／庫存結構

---

## 8. 完成定義（DoD）

- [x] MER 欄位／型別／預設／枚舉定稿
- [x] 唯一約束與索引定稿
- [x] ER 與 FK 持有方定稿
- [x] Auth／Profiles／Memberships 邊界 stub
- [x] 與 legacy accounts 對應方向說明（詳細對照留給 M1-003）
- [x] **未**修改任何程式與儲存行為

---

## 9. 後續任務建議

| 編號 | 內容 |
|------|------|
| M1-003 | `accounts` → MER／Auth／Profile／Membership **列級對照表** |
| （另開） | Memberships／Auth／Profiles 專規 |
| M1-004 | 過渡期讀寫適配（若需要；最小 diff） |
| M1-005 | 正式 Migration（另評估 RULES） |
| M1-006 | 切流與回歸 |

---

## 附錄 A｜邏輯實體一覽

| 邏輯名 | 角色 | 本文件完整度 |
|--------|------|----------------|
| `master_employees` | MER 主檔 | **定稿** |
| `auth_users` | 登入主體 | stub |
| `profiles` | 個人檔 | stub |
| `memberships` | 門市＋角色 | stub |

## 附錄 B｜相關文件

- `docs/specs/M1-001_Master_Employee_Registry.md`
- `RULES.md`
- `PROJECT.md`
- `docs/PL/PL-002-Database-Schema.md`（占位；未來可對齊本定稿）

---

*M1-002 Schema Locked · 無 SQL · 無 Migration · 不改程式*
