# M1-001｜Master Employee Registry（MER）規格

| 項目 | 內容 |
|------|------|
| 文件編號 | M1-001 |
| 標題 | Master Employee Registry（MER） |
| 狀態 | Specification Only（僅規格，未實作） |
| 適用系統 | ZDOS（ZhongDong Operating System） |
| 版本基準 | 現行執行版 `index.html`（`VERSION_INFO` = v1.1.0） |
| 撰寫日期 | 2026-07-23 |

---

## 0. 本文件邊界（強制）

本任務 **只定義規格**，明確 **不包含**：

- 修改 `index.html`
- 修改任何 localStorage Key 或現有資料結構寫入邏輯
- 修改登入流程（`handleLoginSubmit` 等）
- 修改任何既有 Feature 行為
- 修改 `supabase/` 或建立 Migration
- 實作 UI／API／CRUD

後續實作必須另開任務，並遵守 `RULES.md`（最高優先）。

---

## 1. MER 的定位

**MER（Master Employee Registry）是 ZDOS 唯一的人員主檔（Single Source of Truth for People）。**

| 面向 | 定義 |
|------|------|
| 是什麼 | 集團層級的「人」主資料登記中心 |
| 不是什麼 | 不是登入系統、不是權限引擎、不是門市排班表、不是業績紀錄 |
| 權威性 | 工號、姓名、在職狀態等「人」的事實，以 MER 為準 |
| 範圍 | 涵蓋所有會進入 ZDOS 生態的人員（含雙店、後勤、管理職） |
| 唯一性 | 一人一筆主檔；不以「門市帳號列」重複建人 |

MER 回答的問題是：

> 「這個人是誰？是否在職？基本身分別為何？」

MER **不**回答：

> 「這個人現在能不能登入？密碼對不對？今天排哪一班？業績過了沒？」

---

## 2. MER 的責任範圍

### 2.1 MER 負責

- 員工主資料的建立、更新、停用（邏輯刪除／狀態變更）
- 工號（Employee ID）唯一性與正規化規則
- 姓名、基本身份標籤、在職狀態
- 與未來 Account Center／Profiles／Memberships 的 **關聯鍵（identity key）**
- 提供給其他模組查詢「人員主檔」的讀取契約（規格層）

### 2.2 MER 不負責

| 項目 | 負責層（未來） |
|------|----------------|
| 密碼驗證、Session、登入持久化 | Auth |
| 帳號啟用／停用登入、帳密管理 UI | Account Center |
| 個人偏好、頭像、顯示設定 | Profiles |
| 門市隸屬、角色、跨店權限 | Memberships |
| 業績申報、核對、現金公式 | 業績模組（既有） |
| 庫存盤點權限判定（現行邏輯） | 既有權限規則 → 未來應對齊 Memberships |
| 排假、班表 | 排假／排班模組（未來） |

**原則：MER 管理員工主資料，不負責登入驗證。**

---

## 3. 與現有 `accounts` 的關係

### 3.1 現況（As-Is）

現行 ZDOS 以單一結構同時承載「人 + 帳 + 店 + 角色」：

- 記憶體／持久化：`state.accounts` ↔ localStorage `store_accounts_v48_system`
- Seed：`DEFAULT_ACCOUNTS` + `syncAccountsFromSeed`
- 現行欄位（概念）：`empId`、`password`、`name`、`store`、`store2`、`role`

此結構同時服務：登入、店別選擇、庫存權限、核對權限、設定頁 CRUD。

### 3.2 目標關係（To-Be）

| 現況概念 | 未來歸屬 |
|----------|----------|
| `empId`、`name`、在職與否 | **MER** |
| `password`、可否登入 | **Auth**（經 Account Center 管理） |
| 顯示名以外的個人設定 | **Profiles** |
| `store` / `store2` / `role` | **Memberships**（一或多筆門市成員資格） |

### 3.3 過渡原則（規格約束）

1. **不得在本階段改名或廢棄** `store_accounts_v48_system`（RULES 禁止改 Key 名稱）。
2. MER 是 **邏輯主檔**；現行 `accounts` 視為 **過渡期的合併視圖（legacy composite view）**。
3. 未來實作遷移時，應從 `accounts` **拆解／對應** 到 MER + Account + Profile + Membership，而非平行再造第二套互相衝突的人員名單。
4. 在 MER 落地前，現場仍以現行 `accounts` 為運作事實來源；本規格不改變現場行為。

```
[現行]  accounts = 人 + 密碼 + 店 + 角色（一包）

[目標]  MER（人）
          └─ Account Center ⇄ Auth（帳／密／登入）
          └─ Profiles（個人檔）
          └─ Memberships（店／角色）
```

---

## 4. 與 Auth 的關係

| 項目 | 說明 |
|------|------|
| 關係類型 | MER **1 : 0..1** Auth 主體（未來可擴為多憑證，本規格先假設一人一登入主體） |
| 關聯鍵 | 以 MER 的穩定人員 ID（建議內部 UUID）或工號策略關聯；**工號可變更時不可當唯一永久鍵** |
| Auth 職責 | 驗證憑證、建立／撤銷登入狀態、密碼雜湊與憑證生命週期 |
| MER 職責 | 不存密碼、不驗證密碼、不持有 session |
| 現行對照 | 現行明文 `password` + `handleLoginSubmit` 屬 Auth 過渡實作，**尚未拆層** |

**規則：** 沒有 MER 主檔的人，不應建立正式 Auth 帳號（未來強制）。  
**規則：** Auth 失敗不得改寫 MER 主資料。

---

## 5. 與 Profiles 的關係

| 項目 | 說明 |
|------|------|
| 關係類型 | MER **1 : 1** Profile（建議） |
| Profile 內容 | 顯示偏好、通知設定、頭像、封面相關個人化等（非人事主檔） |
| 與 MER 差異 | MER = 人事事實；Profile = 個人化呈現與偏好 |
| 現行對照 | 現行幾乎無獨立 Profile；姓名顯示直接取自 `accounts.name`（屬 MER 欄位） |

**規則：** 改顯示暱稱（若未來有）進 Profile；改法定／人事姓名進 MER。  
**規則：** Profile 刪除不得刪除 MER；MER 停用可隱藏 Profile。

---

## 6. 與 Memberships 的關係

| 項目 | 說明 |
|------|------|
| 關係類型 | MER **1 : N** Membership |
| Membership 內容 | 門市（中華店／東港店／未來新店）、角色、生效區間、狀態 |
| 取代現行 | `store` + `store2` + `role` 的扁平欄位 |
| 雙店帳號 | 以兩筆（或多筆）Membership 表達，而非 `store2` 特例欄 |
| 集團首腦 | 以特殊 Membership 或全域角色標誌表達（實作任務另定；本規格只要求「不靠第二姓名冊」） |

**規則：** 權限判定（庫存、設定、核對）未來應讀 Memberships，不應再發明平行角色表。  
**規則：** 同一人在同一門市同一時段，角色不得衝突（唯一性規則於實作任務細定）。

---

## 7. 與業績、排假等模組的關係

### 7.1 業績模組（既有）

| 項目 | 規格 |
|------|------|
| 寫入業績時 | 以「填寫人」關聯到人員；現行使用 `employeeId`（工號字串） |
| 核對流程 | `reviewBy` 現行存工號；未來應可解析回 MER |
| MER 責任 | 提供穩定身份解析（工號 → 人員主檔） |
| MER 不責任 | 不存營收、不存審核狀態、不改 `salesRecords` 結構（RULES 禁止本階段改動；未來若擴欄位需另開評估） |

### 7.2 庫存模組（既有）

- 盤點紀錄含 `employeeId`；同樣只關聯身份，不把庫存資料放進 MER。

### 7.3 排假／排班（未來）

- 排假、班表、出勤皆 **引用 MER 人員 ID**。
- 班別、店別、代理人屬排假模組＋Memberships，不屬 MER 主檔欄位。

### 7.4 共通原則

> 業務模組只 **引用** MER，不 **複製** 完整人事檔（避免姓名漂移）。  
> 允許快照顯示名作歷史可讀性，但身份鍵必須可回溯 MER。

---

## 8. 未來資料流

規格指定之目標資料流（由上而下依賴）：

```
MER
 ↓
Account Center
 ↓
Auth
 ↓
Profiles
 ↓
Memberships
```

### 8.1 語意說明

| 階段 | 意義 |
|------|------|
| **MER** | 先有「人」 |
| **Account Center** | 為該人開立／管理「可登入帳號」作業入口（管理層，非驗證引擎） |
| **Auth** | 實際憑證與登入驗證 |
| **Profiles** | 帳號建立後補齊個人檔 |
| **Memberships** | 綁定門市與角色後，才具備營運權限 |

### 8.2 建議開通順序（單一人）

1. 於 MER 建立主檔（在職）
2. Account Center 開通帳號
3. Auth 設定憑證
4. 建立／初始化 Profile
5. 指派 Memberships（店＋角色）
6. 才允許進入業績／庫存／核對等營運功能

### 8.3 停用順序（建議）

1. 撤銷或停用 Memberships（失去營運權限）
2. 停用 Auth（無法登入）
3. MER 標為離職／停用（主檔保留供歷史關聯）
4. Profile 可保留或封存

---

## 9. 建議資料欄位（僅規格，不寫 SQL）

> 以下為邏輯欄位。型別為概念型別。**本文件不產出 SQL／Migration 檔。**

### 9.1 MER 主檔（建議）

| 欄位 | 概念型別 | 必填 | 說明 |
|------|----------|------|------|
| `id` | UUID | 是 | 內部穩定主鍵（永不當顯示用） |
| `employee_code` | string | 是 | 工號（如 CDP0003）；可顯示、可變更但需唯一 |
| `name` | string | 是 | 人事／顯示用姓名 |
| `status` | enum | 是 | `active` / `inactive` / `terminated`（枚舉可再調） |
| `primary_store_hint` | string \| null | 否 | 僅提示用；正式店別以 Memberships 為準 |
| `notes` | string \| null | 否 | 內部備註（非給門市公告） |
| `created_at` | datetime | 是 | 建立時間 |
| `updated_at` | datetime | 是 | 更新時間 |
| `created_by` | string \| UUID \| null | 否 | 建立者 |
| `updated_by` | string \| UUID \| null | 否 | 更新者 |

### 9.2 明確不放在 MER 的欄位

| 欄位 | 應歸屬 |
|------|--------|
| `password` | Auth |
| `role` | Memberships |
| `store` / `store2` | Memberships |
| 業績／審核欄位 | 業績模組 |
| 排假區間 | 排假模組 |
| 主題／公告偏好 | Profiles 或系統設定 |

### 9.3 工號規則（規格建議）

- 比對時大小寫不敏感（對齊現行 `normalizeEmpId` 精神）
- 儲存時保留官方大小寫型式
- 唯一約束：`employee_code` 在全系統唯一
- 變更工號必須保留 `id` 不變，並評估歷史 `employeeId` 字串相容策略（另開遷移任務）

---

## 10. Migration 規劃（僅規劃，不建立）

> **本階段不建立任何 migration 檔、不改 Supabase、不改 localStorage。**

### 10.1 階段規劃

| 階段 | 名稱 | 內容 | 狀態 |
|------|------|------|------|
| M1-001 | 規格 | 本文件 | **進行中／本任務交付** |
| M1-002 | Schema 設計 | 欄位定稿、關聯圖、索引與唯一約束定稿 | 未開始 |
| M1-003 | 資料對照表 | `accounts` → MER／Auth／Profile／Membership 欄位對照 | 未開始 |
| M1-004 | 雙寫或讀取適配（若需要） | 過渡期相容現行 `store_accounts_v48_system` | 未開始 |
| M1-005 | 正式 Migration | DB／雲端或本地結構落地 | 未開始 |
| M1-006 | 切流與回歸 | 登入／權限／業績關聯回歸；遵守 RULES | 未開始 |

### 10.2 遷移風險預告（供後續任務）

- RULES：不可改 localStorage Key 名稱 → 遷移須相容 `store_accounts_v48_system`
- RULES：不可改登入流程核心 → Auth 拆層須最小 diff、可回滾
- Seed 同步（`syncAccountsFromSeed`）與 MER 權威來源可能衝突 → 必須先定「誰覆寫誰」
- 歷史業績／庫存以工號字串關聯 → 工號變更策略要先定

### 10.3 明確不做（本文件）

- 不寫 `.sql`
- 不建立 `supabase/migrations/*`
- 不新增 localStorage key
- 不修改 `DEFAULT_ACCOUNTS`

---

## 11. 開發順序建議

建議嚴格由規格 → 對照 → 相容 → 落地，避免一次重構（違反 RULES 最小 diff／禁止整檔重寫）：

1. **鎖定本規格（M1-001）** — 產品／工程確認 MER 邊界  
2. **產出對照表（M1-003）** — 每一現有 `accounts` 欄位映射到未來四層  
3. **定稿 Schema（M1-002）** — 仍可不碰 `index.html`  
4. **Account Center 規格** — 管理流程（開通／停用／重置）  
5. **Auth 規格** — 與現行登入相容方案（RULES 第 3 條）  
6. **Profiles／Memberships 規格** — 再實作權限對齊（庫存／設定／核對）  
7. **最小 diff 實作** — 優先適配層，禁止重寫整個 `index.html`  
8. **Migration 與切流** — 可回滾、可備份（沿用系統備份能力）

### 11.1 本任務完成定義（DoD）

- [x] 產出 `docs/specs/M1-001_Master_Employee_Registry.md`
- [x] 定義 MER 定位與責任
- [x] 定義與 accounts／Auth／Profiles／Memberships／業務模組關係
- [x] 定義未來資料流與建議欄位
- [x] 僅規劃 Migration，不建立
- [x] **未**修改任何程式與執行行為

---

## 附錄 A｜詞彙

| 詞 | 定義 |
|----|------|
| MER | Master Employee Registry，人員主檔 |
| Account Center | 帳號生命週期管理入口（未來） |
| Auth | 驗證與憑證層（未來；現行內嵌於 `index.html`） |
| Profile | 個人化資料層（未來） |
| Membership | 門市成員資格＋角色（未來） |
| Legacy accounts | 現行 `store_accounts_v48_system` 合併視圖 |

## 附錄 B｜相關文件

- `RULES.md` — 開發最高約束
- `PROJECT.md` — 系統現況說明
- `CHANGELOG.md` / `BUGLIST.md` — 版本與缺陷
- `docs/PL/PL-001-Cloud-Architecture.md` — 雲端架構占位
- `docs/PL/PL-002-Database-Schema.md` — DB Schema 占位

---

*M1-001 Specification Only · 不實作 · 不遷移 · 不改程式*
