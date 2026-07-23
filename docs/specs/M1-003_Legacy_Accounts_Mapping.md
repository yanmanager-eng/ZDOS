# M1-003｜Legacy Accounts Mapping Specification

| 項目 | 內容 |
|------|------|
| 文件編號 | M1-003 |
| 標題 | Legacy `accounts` → MER／Auth／Profiles／Memberships 對照 |
| 狀態 | Mapping Spec Locked（僅對照規格；未遷移／未實作） |
| 前置依賴 | M1-001（已確認）、M1-002（Schema 定稿） |
| 基準 Branch | 含 M1-001、M1-002 之最新文件基準 |
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
- **執行帳密搬移、密碼雜湊、或建立 Auth 實體**
- 在文件中列出任何帳號的 **真實密碼**

後續遷移／適配另開任務，並遵守 `RULES.md`（最高優先）。

### 0.1 核准決策（本任務）

| 決策 | 定稿 |
|------|------|
| 交付檔名 | `docs/specs/M1-003_Legacy_Accounts_Mapping.md` |
| Branch | `cursor/m1-003-legacy-accounts-mapping` |
| `primary_store_hint` | = legacy `store` |
| 主要 Membership | legacy `store` → 第一筆（主要）Membership |
| 第二 Membership | `store2` 非空且 ≠「無」時建立 |
| legacy `role` | **暫時**映射至每筆 Membership 的 `system_role` |
| `employment_role` vs `system_role` | **必須分開說明**；不得視為永久同一欄位 |
| MER.`status` | 現行有效 seed／帳號 → `active` |
| `OBSOLETE_TEST_EMP_IDS` | **不納入** MER |
| 密碼 | 文件不列出；僅標示為 Auth credential **過渡來源** |
| password 歸屬 | 後續 **不得**進入 MER、Profile 或 Membership |
| 本階段 Auth | **不**搬移帳密、**不**雜湊、**不**建立 Auth |

---

## 1. Legacy 來源定義（As-Is）

### 1.1 持久化 Key（不可更名）

| Key | 用途 |
|-----|------|
| `store_accounts_v48_system` | 員工帳密合併視圖（JSON 陣列） |

RULES：不可修改 localStorage Key 名稱。

### 1.2 執行期結構（單列）

| Legacy 欄位 | 型別（實務） | 說明 |
|-------------|--------------|------|
| `empId` | string | 工號 |
| `password` | string | 明文密碼（現行；本文件不記載值） |
| `name` | string | 姓名 |
| `store` | string | 主門市 |
| `store2` | string | 第二門市；無則為 `"無"` 或空 |
| `role` | string | 現行單一角色字串（系統權限語意為主） |

### 1.3 程式來源（只讀說明）

| 來源 | 說明 |
|------|------|
| `DEFAULT_ACCOUNTS` | Seed 名冊（`index.html`） |
| Seed／password 同步邏輯 | 啟動時與 localStorage 合併（Feature-004 系列） |
| `OBSOLETE_TEST_EMP_IDS` | 廢止測試工號（正規化後比對） |
| `normalizeEmpId` | `trim + toLowerCase` |

### 1.4 廢止測試帳（不納入 MER）

正規化 key：`ddp001`、`ddp0003`、`ddp0010`、`ddp0011`

**規則：** 不建立 MER／Auth／Profile／Membership。

---

## 2. `employment_role` 與 `system_role`（必須分開）

> **定稿原則：兩者不是永久同一欄位，不得在長期架構中合併為單一 `role`。**

| 概念 | 語意 | 本階段來源 | 本階段映射 |
|------|------|------------|------------|
| **`system_role`** | 系統權限／營運功能角色（能否庫存、設定、核對等） | legacy `role` | → 每筆 Membership.`system_role`（**暫時**） |
| **`employment_role`** | 人事／職稱語意（組織職等、任用身分） | **legacy 無獨立欄位** | **不映射**；預留未來欄位，本階段保持未定義／`null` |

### 2.1 為什麼要分開

1. 現行 `accounts.role` 同時被拿來做權限判斷與職稱顯示，造成語意耦合。
2. 未來可能出現「職稱是資深員工，但系統權限臨時等同領班」等需求。
3. M1-002 Membership stub 使用 `role` 為過渡命名；**對照層定稿改以 `system_role` 表達系統角色**，並預留 `employment_role`。

### 2.2 本階段過渡規則

```
legacy.role  ──暫時──►  Membership.system_role   （每一筆 Membership 皆同值）
legacy.（無）──不映射─►  Membership.employment_role = null（或省略）
```

**禁止：** 文件或實作宣稱 `employment_role ≡ system_role` 為永久模型。  
**允許：** 過渡期僅填 `system_role`，待人事欄位規格另開後再補 `employment_role`。

### 2.3 與 M1-002 的關係

- M1-002 Membership stub 欄位名為 `role`。
- 本對照規格將目標欄位定名為 **`system_role`**（語意澄清）。
- 後續修訂 M1-002／Memberships 專規時，應將 stub `role` 對齊為 `system_role`，並新增可空的 `employment_role`（另開任務，**本文件不改 M1-002 本文**）。

---

## 3. 欄位對照總表

| Legacy 欄位 | 目標實體 | 目標欄位 | 轉換規則 |
|-------------|----------|----------|----------|
| `empId` | MER | `employee_code` | 原樣保留官方大小寫 |
| `empId` | MER | `employee_code_norm` | `trim(lower(empId))` |
| `empId` | MER | `id` | **新建 UUID**（非 empId） |
| `name` | MER | `name` | 原樣 |
| （無） | MER | `status` | 現行有效帳 → `active` |
| `store` | MER | `primary_store_hint` | = legacy `store` |
| （無） | MER | `notes` | `null` |
| （無） | MER | `created_at` / `updated_at` | 遷移時刻（未來） |
| `password` | Auth（僅標示） | credential **過渡來源** | 見 §5；**本階段不搬移、不雜湊、不建 Auth** |
| `password` | MER／Profile／Membership | — | **禁止進入** |
| （無） | Profile | （未來） | 本階段不建立 Profile 實體 |
| `store` | Membership | `store_code` | **主要** Membership |
| `store2` | Membership | `store_code` | 非空且 ≠「無」→ 第二筆 |
| `role` | Membership | `system_role` | 暫時映射；每筆 Membership 同值 |
| （無） | Membership | `employment_role` | 不映射（`null`／省略） |
| （無） | Membership | `status` | `active` |
| （無） | Membership | `valid_from` / `valid_to` | `null` |
| （無） | Membership | `mer_id` | = 對應 MER.`id`（未來實作時） |

---

## 4. Membership 轉換規則（定稿）

### 4.1 主要／第二門市

```
主要 Membership：
  store_code = legacy.store
  system_role = legacy.role          // 暫時
  employment_role = null             // 不映射
  status = active

若 store2 非空且 trim(store2) !== "無"：
  第二 Membership：
    store_code = legacy.store2
    system_role = legacy.role        // 暫時（同值）
    employment_role = null
    status = active
```

### 4.2 一人一 MER

- 雙店仍是 **同一** `mer_id`；不依門市拆人。
- `primary_store_hint` 永遠取 legacy `store`（主要門市提示）。

### 4.3 集團首腦

- 對齊現行可選兩店：建立中華店＋東港店兩筆 Membership。
- `system_role = 集團首腦`（暫時）。
- 是否改為全域角色：屬後續 Memberships 專規（不在本文件改寫）。

---

## 5. Password／Auth（本階段禁止實作）

| 項目 | 定稿 |
|------|------|
| 文件 | **不得**列出任何真實密碼 |
| 對照語意 | `password` = Auth credential 的 **過渡來源標示** |
| 本階段 | **不得**執行帳密搬移、雜湊、或 Auth 建立 |
| 禁止歸屬 | password **不得**進入 MER、Profile、Membership |
| 未來 | Auth／Account Center 專規 + RULES「不可修改登入流程」評估後另開 |

對照表中 Auth 欄僅保留「來源標示」，不產生可執行遷移步驟。

---

## 6. Profile（本階段）

| 項目 | 定稿 |
|------|------|
| 本階段 | **不建立** Profile 實體、不搬移資料 |
| 顯示名 | 未來預設取 MER.`name`；`display_name_override` 預留 |
| 與 password | 無關；密碼不得進入 Profile |

---

## 7. 業務模組引用（不改結構）

| 現行欄位 | 規則 |
|----------|------|
| `salesRecords[].employeeId` | 續存工號字串；以 `employee_code_norm` 解析 MER |
| `salesRecords[].reviewBy` | 同上 |
| `inventoryRecords[].employeeId` | 同上 |
| `shield_employee_id` | Key 不可改；值仍為工號 |

RULES：不可修改 `salesRecords`、`inventoryRecords` 結構。

---

## 8. 完整 Seed 列級對照表（不含密碼）

來源：現行 `DEFAULT_ACCOUNTS`（**27** 筆）。  
說明：`system_role` 暫自 legacy `role`；`employment_role` 一律不映射。

| # | employee_code | name | store | store2 | legacy role | MER.status | primary_store_hint | Memberships（store_code × system_role） | employment_role |
|---|---------------|------|-------|--------|-------------|------------|--------------------|------------------------------------------|-----------------|
| 1 | 1 | 集團首腦 | 中華店 | 東港店 | 集團首腦 | active | 中華店 | 中華店×集團首腦；東港店×集團首腦 | （不映射） |
| 2 | DDP0001 | 顏志添 | 中華店 | 東港店 | 店長 | active | 中華店 | 中華店×店長；東港店×店長 | （不映射） |
| 3 | DDP0002 | 林泰宇 | 東港店 | 無 | 資深員工 | active | 東港店 | 東港店×資深員工 | （不映射） |
| 4 | DDP0004 | 郭志勇 | 東港店 | 無 | 一般員工 | active | 東港店 | 東港店×一般員工 | （不映射） |
| 5 | DDP0005 | 林育琪 | 東港店 | 無 | 一般員工 | active | 東港店 | 東港店×一般員工 | （不映射） |
| 6 | DDP0006 | 林文明 | 東港店 | 無 | 資深員工 | active | 東港店 | 東港店×資深員工 | （不映射） |
| 7 | DDP0007 | 蔡語晴 | 東港店 | 無 | 資深員工 | active | 東港店 | 東港店×資深員工 | （不映射） |
| 8 | DDPT0009 | 蔡博安 | 東港店 | 無 | 一般員工 | active | 東港店 | 東港店×一般員工 | （不映射） |
| 9 | DDPT0010 | 蕭雍哲 | 東港店 | 無 | 一般員工 | active | 東港店 | 東港店×一般員工 | （不映射） |
| 10 | DDP0011 | 蔡依珊 | 東港店 | 無 | 資深員工 | active | 東港店 | 東港店×資深員工 | （不映射） |
| 11 | DDP0012 | 許堤尹 | 東港店 | 無 | 一般員工 | active | 東港店 | 東港店×一般員工 | （不映射） |
| 12 | DDPT0013 | 李彥宇 | 東港店 | 無 | 一般員工 | active | 東港店 | 東港店×一般員工 | （不映射） |
| 13 | DDP0014 | 林展宇 | 東港店 | 無 | 一般員工 | active | 東港店 | 東港店×一般員工 | （不映射） |
| 14 | DDP0015 | 高禹瑄 | 中華店 | 無 | 一般員工 | active | 中華店 | 中華店×一般員工 | （不映射） |
| 15 | DDP0016 | 謝柔珍 | 中華店 | 無 | 一般員工 | active | 中華店 | 中華店×一般員工 | （不映射） |
| 16 | DDP0017 | 郭家豪 | 中華店 | 東港店 | 秘書 | active | 中華店 | 中華店×秘書；東港店×秘書 | （不映射） |
| 17 | DDP0018 | 伍志威 | 東港店 | 無 | 一般員工 | active | 東港店 | 東港店×一般員工 | （不映射） |
| 18 | CDP0003 | 楊政霖 | 中華店 | 無 | 領班 | active | 中華店 | 中華店×領班 | （不映射） |
| 19 | CDP0013 | 張言吉 | 中華店 | 無 | 一般員工 | active | 中華店 | 中華店×一般員工 | （不映射） |
| 20 | CDP0004 | 詹勝瑀 | 中華店 | 無 | 一般員工 | active | 中華店 | 中華店×一般員工 | （不映射） |
| 21 | CDP0005 | 陳禹蓁 | 中華店 | 無 | 領班 | active | 中華店 | 中華店×領班 | （不映射） |
| 22 | CDP0007 | 許家傑 | 中華店 | 無 | 一般員工 | active | 中華店 | 中華店×一般員工 | （不映射） |
| 23 | CDP0010 | 高子懿 | 中華店 | 無 | 實習幹部 | active | 中華店 | 中華店×實習幹部 | （不映射） |
| 24 | CDP0011 | 張弘洋 | 中華店 | 無 | 領班 | active | 中華店 | 中華店×領班 | （不映射） |
| 25 | CDP0012 | 李宜峯 | 中華店 | 無 | 一般員工 | active | 中華店 | 中華店×一般員工 | （不映射） |
| 26 | CDP0015 | 張岷賦 | 中華店 | 無 | 一般員工 | active | 中華店 | 中華店×一般員工 | （不映射） |
| 27 | CDP0016 | 陳立科 | 中華店 | 無 | 一般員工 | active | 中華店 | 中華店×一般員工 | （不映射） |

### 8.1 映射計量（僅 seed、本階段邏輯對照）

| 實體 | 本階段對照結果 |
|------|----------------|
| MER（邏輯列） | 27（active） |
| Membership（邏輯列） | **30**（24 單店 + 3 雙店×2） |
| Auth 實體 | **0**（本階段不建立） |
| Profile 實體 | **0**（本階段不建立） |
| 廢止測試帳 | 0（不納入） |

雙店三人：`1`、`DDP0001`、`DDP0017`。

---

## 9. 範例展開（概念，無密碼）

### 9.1 單店：`CDP0003`

```
MER: {
  employee_code: "CDP0003",
  name: "楊政霖",
  status: "active",
  primary_store_hint: "中華店"
}
Memberships: [
  {
    store_code: "中華店",          // 主要
    system_role: "領班",           // 暫時自 legacy.role
    employment_role: null,         // 不映射
    status: "active"
  }
]
Auth / Profile: 本階段不建立
password: 僅標示為 Auth credential 過渡來源（不搬移、不入 MER／Profile／Membership）
```

### 9.2 雙店：`DDP0001`

```
MER: {
  employee_code: "DDP0001",
  name: "顏志添",
  status: "active",
  primary_store_hint: "中華店"
}
Memberships: [
  { store_code: "中華店", system_role: "店長", employment_role: null, status: "active" },
  { store_code: "東港店", system_role: "店長", employment_role: null, status: "active" }
]
Auth / Profile: 本階段不建立
```

---

## 10. 手動新增帳（非 seed）

| 規則 | 說明 |
|------|------|
| 有效帳 | 同 seed 規則做 **邏輯對照**（MER + Memberships） |
| 廢止集合 | 不納入 MER |
| Auth／密碼 | 同樣：本階段不搬移、不建立 |
| `system_role` | 暫時 = legacy `role` |
| `employment_role` | 不映射 |

---

## 11. 開放問題（後續）

| ID | 議題 | 建議歸屬 |
|----|------|----------|
| Q1 | Seed 同步 vs MER 權威誰覆寫誰 | M1-004／Account Center |
| Q2 | 何時允許建立 Auth／雜湊（且不違 RULES 登入核心） | Auth 專規 |
| Q3 | M1-002 stub `role` → 正式 `system_role` + `employment_role` 修訂 | Schema／Memberships 專規 |
| Q4 | `一般員工` ∉ `ROLE_OPTIONS` | Memberships／設定 UI |
| Q5 | 工號變更與歷史 `employeeId` | 遷移／別名策略 |
| Q6 | 集團首腦改全域角色？ | Memberships 專規 |

---

## 12. 非目標清單

- [ ] 帳密搬移／雜湊／Auth 建立
- [ ] Profile 建立
- [ ] 修改 `index.html`／localStorage／登入
- [ ] SQL／Supabase migration
- [ ] 文件公布密碼
- [ ] 將 `employment_role` 與 `system_role` 永久合併

---

## 13. 完成定義（DoD）

- [x] 交付 `docs/specs/M1-003_Legacy_Accounts_Mapping.md`
- [x] `primary_store_hint`／主要與第二 Membership 規則
- [x] `system_role` 暫時映射＋`employment_role` 分開說明
- [x] 完整 Seed 27 列對照（不含密碼）
- [x] 明確禁止本階段 Auth／密碼實作
- [x] 以含 M1-001、M1-002 之基準建 Branch／Draft PR
- [x] **未**修改任何執行程式

---

## 14. 後續任務建議

| 編號 | 內容 |
|------|------|
| （建議） | 修訂 M1-002 Membership stub：`role` → `system_role`，新增 `employment_role` |
| M1-004 | 過渡期讀寫適配（若需要；最小 diff；RULES） |
| （另開） | Auth／Memberships／Profiles 專規 |
| M1-005／M1-006 | Migration 與切流 |

---

## 附錄 A｜相關文件

- `docs/specs/M1-001_Master_Employee_Registry.md`
- `docs/specs/M1-002_MER_Schema.md`
- `RULES.md`
- `PROJECT.md`

---

*M1-003 Mapping Spec Locked · 無 Auth 建立 · 無密碼表 · 不改程式 · system_role ≠ employment_role*
