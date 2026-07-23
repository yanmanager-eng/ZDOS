# M1-003｜Legacy Accounts Mapping Specification

| 項目 | 內容 |
|------|------|
| 文件編號 | M1-003 |
| 標題 | Legacy `accounts` → MER／Auth／Profiles／Memberships 對照 |
| 狀態 | Mapping Spec Locked（僅對照規格；未遷移／未實作） |
| 前置依賴 | M1-001（已確認）、M1-002（Schema 定稿） |
| 適用系統 | ZDOS（ZhongDong Operating System） |
| 撰寫日期 | 2026-07-23 |

---

## 0. 本文件邊界（強制）

本任務 **只定義對照規格**，明確 **不包含**：

- 修改 `index.html` 或任何執行程式
- 修改 localStorage Key 名稱或寫入邏輯
- 修改登入流程、Google Form、業績／庫存結構
- 撰寫可執行 SQL／建立 Migration
- 實作雙寫、適配層、Account Center UI
- 在文件中列出任何帳號的 **明文密碼值**

後續遷移／適配另開任務，並遵守 `RULES.md`（最高優先）。

### 0.1 核准預設（M1-003 Engineering Assessment）

| 決策 | 定稿 |
|------|------|
| 交付物 | 本文件 |
| `primary_store_hint` | = legacy `store` |
| 雙店 Membership | `store` 一列＋`store2`（非「無」）一列；`role` 兩列相同 |
| MER.`status` | 現用／seed 帳 → `active` |
| 廢止測試帳 | **不進入** MER |
| 密碼 | 只描述映射目標，**不列出密碼值** |
| Seed 列舉 | 附工號／姓名／店／角色（不含密碼） |

---

## 1. Legacy 來源定義（As-Is）

### 1.1 持久化 Key（不可更名）

| Key | 用途 |
|-----|------|
| `store_accounts_v48_system` | 員工帳密合併視圖（JSON 陣列） |

RULES：不可修改 localStorage Key 名稱。

### 1.2 執行期結構（單列）

現行每一筆 `accounts[]` 元素概念欄位：

| Legacy 欄位 | 型別（實務） | 說明 |
|-------------|--------------|------|
| `empId` | string | 工號 |
| `password` | string | 明文密碼（現行） |
| `name` | string | 姓名 |
| `store` | string | 主門市 |
| `store2` | string | 第二門市；無則為 `"無"` 或空 |
| `role` | string | 單一角色（套用至可登入門市） |

### 1.3 程式來源（只讀說明）

| 來源 | 說明 |
|------|------|
| `DEFAULT_ACCOUNTS` | Seed 名冊（`index.html`） |
| `syncAccountsFromSeed`／password seed 同步 | 啟動時與 localStorage 合併／覆寫策略（Feature-004 系列） |
| `OBSOLETE_TEST_EMP_IDS` | 廢止測試工號集合（正規化後比對） |
| `normalizeEmpId` | `trim + toLowerCase` |

本文件不修改上述行為。

### 1.4 廢止測試帳（不映射進 MER）

現行集合（正規化 key）：

- `ddp001`
- `ddp0003`
- `ddp0010`
- `ddp0011`

**映射規則：** 遷移／匯入時 **丟棄**，不建立 `master_employees`／Auth／Profile／Membership。

---

## 2. 欄位對照總表

| Legacy 欄位 | 目標實體 | 目標欄位 | 轉換規則 |
|-------------|----------|----------|----------|
| `empId` | MER | `employee_code` | 原樣保留官方大小寫 |
| `empId` | MER | `employee_code_norm` | `trim(lower(empId))` |
| `empId` | MER | `id` | **新建 UUID**（非 empId）；一人一 UUID，工號變更不改 `id` |
| `name` | MER | `name` | 原樣 |
| （無） | MER | `status` | 固定 `active`（現用帳）；廢止帳不建列 |
| `store` | MER | `primary_store_hint` | 等於 legacy `store` |
| （無） | MER | `notes` | `null` |
| （無） | MER | `created_at` / `updated_at` | 遷移時刻或系統時刻 |
| （無） | MER | `created_by` / `updated_by` | `null` 或 `"legacy-migration"` |
| `password` | Auth | `credential_ref`／過渡憑證欄 | **過渡期**可指向「仍由 legacy 驗證」或日後雜湊；本規格不定雜湊演算法 |
| （無） | Auth | `login_enabled` | `true`（現用帳） |
| （無） | Auth | `mer_id` | = 對應 MER.`id` |
| （無） | Auth | `id` | 新建 UUID |
| （無） | Profile | `mer_id` | = MER.`id`（1:1） |
| （無） | Profile | `display_name_override` | `null`（顯示用 MER.`name`） |
| （無） | Profile | `preferences_json` | `null` |
| `store` | Membership | `store_code` | 第一筆 Membership |
| `store2` | Membership | `store_code` | 若非空且 ≠ `"無"` → 第二筆 |
| `role` | Membership | `role` | 每一筆 Membership 皆寫入 **同一** `role` |
| （無） | Membership | `status` | `active` |
| （無） | Membership | `valid_from` / `valid_to` | `null`（過渡期視為持續有效） |
| （無） | Membership | `mer_id` | = MER.`id` |

---

## 3. 轉換規則（定稿）

### 3.1 一人一 MER

- 每一筆有效 legacy account → **恰好一筆** `master_employees`。
- 不以門市拆人；雙店仍是同一 `mer_id`。

### 3.2 `store2` 與 Membership 拆列

```
若 store2 為空或 trim(store2) === "無"：
  → Memberships = [ { store_code: store, role, status: active } ]

否則：
  → Memberships = [
      { store_code: store,  role, status: active },
      { store_code: store2, role, status: active }
    ]
```

**禁止：** 把 `store2` 留在 MER 當正式欄位。  
**允許：** `primary_store_hint = store`（僅提示）。

### 3.3 單一 `role` 策略

現行一帳一角色。映射時：

- 該人所有 Membership 列使用 **相同** `role` 字串。
- 不在本階段推導「每店不同角色」。
- `集團首腦`：仍建中華店＋東港店兩筆 Membership（對齊現行可選兩店），`role = 集團首腦`。

### 3.4 Auth 過渡映射（無密碼表）

| 項目 | 規則 |
|------|------|
| 是否建 Auth 列 | 現用帳：是（1:0..1 → 建 1） |
| `login_enabled` | `true` |
| 密碼值 | **文件不記載**；實作時自 `store_accounts_v48_system` 讀取 |
| 雜湊 | 本階段不定；未來 Auth 專規處理 |
| 與登入相容 | 任何切流必須遵守 RULES「不可修改登入流程」核心；適配層另開 M1-004 |

### 3.5 Profile 最小列

每位 MER 建 1 筆 Profile：

- `display_name_override = null`
- UI 顯示名稱 = MER.`name`

### 3.6 手動新增帳（非 seed）

localStorage 中存在、但不在 `DEFAULT_ACCOUNTS` 的帳號（現行 seed 同步會 `preservedManual`）：

| 規則 | 說明 |
|------|------|
| 映射 | 與 seed 帳相同規則進入 MER／Auth／Profile／Memberships |
| 廢止集合 | 若工號落在 `OBSOLETE_TEST_EMP_IDS` → 不映射 |
| 衝突 | 同 `employee_code_norm` 只能一筆 MER |

### 3.7 角色字串相容備註

- Seed 大量使用 `一般員工`，但設定頁 `ROLE_OPTIONS` 未含該值（已知產品落差）。
- **映射時原樣保留** legacy `role` 字串，不在 M1-003 改寫為其他角色。
- 角色枚舉統一屬 Memberships／權限專規，不屬本文件。

---

## 4. 業務模組引用（不改結構）

| 現行欄位 | 位置 | 映射期規則 |
|----------|------|------------|
| `salesRecords[].employeeId` | 業績 | 繼續存工號字串；以 `employee_code_norm` 解析 MER |
| `salesRecords[].reviewBy` | 核對 | 同上 |
| `inventoryRecords[].employeeId` | 庫存 | 同上 |
| `shield_employee_id` | 登入持久化 | Key 名稱不可改；值仍為工號字串 |

RULES：本階段 **不可修改** `salesRecords`、`inventoryRecords` 結構。  
未來若新增 `mer_id` 欄位，需另開評估（不在 M1-003）。

---

## 5. Seed 列級對照（不含密碼）

來源：現行 `DEFAULT_ACCOUNTS`（27 筆）。  
欄位：工號／姓名／legacy 店別／角色／映射後 Memberships。

| # | employee_code | name | store | store2 | role | MER.status | primary_store_hint | Memberships（store_code×role） |
|---|---------------|------|-------|--------|------|------------|--------------------|--------------------------------|
| 1 | 1 | 集團首腦 | 中華店 | 東港店 | 集團首腦 | active | 中華店 | 中華店×集團首腦；東港店×集團首腦 |
| 2 | DDP0001 | 顏志添 | 中華店 | 東港店 | 店長 | active | 中華店 | 中華店×店長；東港店×店長 |
| 3 | DDP0002 | 林泰宇 | 東港店 | 無 | 資深員工 | active | 東港店 | 東港店×資深員工 |
| 4 | DDP0004 | 郭志勇 | 東港店 | 無 | 一般員工 | active | 東港店 | 東港店×一般員工 |
| 5 | DDP0005 | 林育琪 | 東港店 | 無 | 一般員工 | active | 東港店 | 東港店×一般員工 |
| 6 | DDP0006 | 林文明 | 東港店 | 無 | 資深員工 | active | 東港店 | 東港店×資深員工 |
| 7 | DDP0007 | 蔡語晴 | 東港店 | 無 | 資深員工 | active | 東港店 | 東港店×資深員工 |
| 8 | DDPT0009 | 蔡博安 | 東港店 | 無 | 一般員工 | active | 東港店 | 東港店×一般員工 |
| 9 | DDPT0010 | 蕭雍哲 | 東港店 | 無 | 一般員工 | active | 東港店 | 東港店×一般員工 |
| 10 | DDP0011 | 蔡依珊 | 東港店 | 無 | 資深員工 | active | 東港店 | 東港店×資深員工 |
| 11 | DDP0012 | 許堤尹 | 東港店 | 無 | 一般員工 | active | 東港店 | 東港店×一般員工 |
| 12 | DDPT0013 | 李彥宇 | 東港店 | 無 | 一般員工 | active | 東港店 | 東港店×一般員工 |
| 13 | DDP0014 | 林展宇 | 東港店 | 無 | 一般員工 | active | 東港店 | 東港店×一般員工 |
| 14 | DDP0015 | 高禹瑄 | 中華店 | 無 | 一般員工 | active | 中華店 | 中華店×一般員工 |
| 15 | DDP0016 | 謝柔珍 | 中華店 | 無 | 一般員工 | active | 中華店 | 中華店×一般員工 |
| 16 | DDP0017 | 郭家豪 | 中華店 | 東港店 | 秘書 | active | 中華店 | 中華店×秘書；東港店×秘書 |
| 17 | DDP0018 | 伍志威 | 東港店 | 無 | 一般員工 | active | 東港店 | 東港店×一般員工 |
| 18 | CDP0003 | 楊政霖 | 中華店 | 無 | 領班 | active | 中華店 | 中華店×領班 |
| 19 | CDP0013 | 張言吉 | 中華店 | 無 | 一般員工 | active | 中華店 | 中華店×一般員工 |
| 20 | CDP0004 | 詹勝瑀 | 中華店 | 無 | 一般員工 | active | 中華店 | 中華店×一般員工 |
| 21 | CDP0005 | 陳禹蓁 | 中華店 | 無 | 領班 | active | 中華店 | 中華店×領班 |
| 22 | CDP0007 | 許家傑 | 中華店 | 無 | 一般員工 | active | 中華店 | 中華店×一般員工 |
| 23 | CDP0010 | 高子懿 | 中華店 | 無 | 實習幹部 | active | 中華店 | 中華店×實習幹部 |
| 24 | CDP0011 | 張弘洋 | 中華店 | 無 | 領班 | active | 中華店 | 中華店×領班 |
| 25 | CDP0012 | 李宜峯 | 中華店 | 無 | 一般員工 | active | 中華店 | 中華店×一般員工 |
| 26 | CDP0015 | 張岷賦 | 中華店 | 無 | 一般員工 | active | 中華店 | 中華店×一般員工 |
| 27 | CDP0016 | 陳立科 | 中華店 | 無 | 一般員工 | active | 中華店 | 中華店×一般員工 |

### 5.1 映射計量（依上表）

| 實體 | 預期列數（僅 seed） |
|------|---------------------|
| MER | 27 |
| Auth | 27 |
| Profile | 27 |
| Membership | 27 + 額外雙店列 = **30**（其中 3 人雙店：`1`、`DDP0001`、`DDP0017`） |

驗證：單店 24 人 ×1 + 雙店 3 人 ×2 = 24 + 6 = 30。

---

## 6. 範例展開（概念，無密碼）

### 6.1 單店：`CDP0003` 楊政霖

```
MER: { employee_code: "CDP0003", name: "楊政霖", status: "active", primary_store_hint: "中華店" }
Auth: { mer_id: <MER.id>, login_enabled: true, credential_ref: <from legacy password, not listed> }
Profile: { mer_id: <MER.id>, display_name_override: null }
Memberships: [ { store_code: "中華店", role: "領班", status: "active" } ]
```

### 6.2 雙店：`DDP0001` 顏志添

```
MER: { employee_code: "DDP0001", name: "顏志添", status: "active", primary_store_hint: "中華店" }
Auth: { mer_id: <MER.id>, login_enabled: true, ... }
Profile: { mer_id: <MER.id>, display_name_override: null }
Memberships: [
  { store_code: "中華店", role: "店長", status: "active" },
  { store_code: "東港店", role: "店長", status: "active" }
]
```

---

## 7. 開放問題與風險（供後續任務）

| ID | 議題 | 影響 | 建議歸屬 |
|----|------|------|----------|
| Q1 | Seed 同步 vs MER 權威：誰覆寫誰？ | 高 | M1-004／Account Center |
| Q2 | 明文密碼何時雜湊？如何不改登入核心？ | 高 | Auth 專規＋RULES 評估 |
| Q3 | `一般員工` ∉ `ROLE_OPTIONS` | 中 | Memberships／設定 UI |
| Q4 | 工號變更後歷史 `employeeId` 字串 | 中 | 遷移任務／別名表 |
| Q5 | 集團首腦是否改為全域角色而非雙 Membership | 低 | Memberships 專規 |
| Q6 | `primary_store_hint` 是否在 Memberships 完備後廢除 | 低 | 後續 Schema 修訂 |

---

## 8. 非目標清單

- [ ] 執行遷移或寫入新 storage
- [ ] 修改 `DEFAULT_ACCOUNTS`／seed 同步程式
- [ ] 修改登入／權限判斷
- [ ] SQL／Supabase migration
- [ ] 在文件公布密碼

---

## 9. 完成定義（DoD）

- [x] Legacy 來源與廢止帳規則
- [x] 欄位對照總表
- [x] `store2`／role／Auth／Profile 轉換規則定稿
- [x] Seed 27 列對照（不含密碼）
- [x] 業務引用相容說明（不改結構）
- [x] **未**修改任何程式與儲存行為

---

## 10. 後續任務建議

| 編號 | 內容 |
|------|------|
| M1-004 | 過渡期讀寫適配（若需要；最小 diff；RULES） |
| （另開） | Auth／Memberships／Profiles 專規（含 Q1–Q5） |
| M1-005 | 正式 Migration |
| M1-006 | 切流與回歸 |

---

## 附錄 A｜相關文件

- `docs/specs/M1-001_Master_Employee_Registry.md`
- `docs/specs/M1-002_MER_Schema.md`
- `RULES.md`
- `PROJECT.md`（localStorage Keys）

## 附錄 B｜依賴說明

本文件假設 M1-001／M1-002 已定稿。若於 `main` 尚未合併，合併順序建議：

1. M1-001 + M1-002  
2. 本文件 M1-003  

---

*M1-003 Mapping Spec Locked · 無遷移 · 無 SQL · 不改程式 · 不含密碼表*
