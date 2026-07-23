# M1-004｜Migration Adaptation Plan

| 項目 | 內容 |
|------|------|
| 文件編號 | M1-004 |
| 標題 | Migration Adaptation Plan |
| 類型 | Engineering Assessment（**文件 only**） |
| 狀態 | Plan Locked（適配／遷移規劃定稿；**非實作**） |
| 前置依賴 | M1-001、M1-002、M1-003（已鎖定） |
| 適用系統 | ZDOS（ZhongDong Operating System） |
| 撰寫日期 | 2026-07-23 |

---

## 0. 定位與邊界（強制）

### 0.1 本任務是什麼

**M1-004 = Migration Adaptation Plan（工程規劃文件）。**

- 屬於 Engineering Assessment／規劃交付
- **不是** Migration Implementation
- **不是** M1-005（Migration SQL Design／正式遷移執行）

### 0.2 本任務不是什麼（Out of Scope 摘要）

見 **§六 Out of Scope**。本階段 **不得** 修改任何執行程式或儲存行為。

### 0.3 核准決策（已確認）

| 決策 | 定稿 |
|------|------|
| 方案 | **A：文件 only** |
| 交付檔 | `docs/specs/M1-004_Migration_Adaptation_Plan.md` |
| Branch | `cursor/m1-004-migration-adaptation-plan` |
| 過渡期執行期權威 | **`store_accounts_v48_system`（唯一）** |
| MER | **僅目標模型**；未完成 M1-005 前不得改變執行期資料來源 |
| 程式／SQL／Auth／新 Key | **全部禁止** |

### 0.4 RULES 對齊

遵守 `RULES.md`：不改 localStorage Key 名稱、不改登入流程、不改 Google Form、不改 `salesRecords`／`inventoryRecords` 結構、最小 diff、不重構、不整檔重寫。

---

## 一、Migration Phase

> 以下為 **規劃相位**。M1-004 **只定義相位**；標註「實作歸屬」的相位不得在本任務執行。

### Phase 0 — Preparation

| 項目 | 內容 |
|------|------|
| 目的 | 鎖定規格鏈、合併文件真相來源、確認權威與禁區 |
| 實作歸屬 | 文件／治理（可於 M1-004 完成規劃；Merge 屬流程） |
| 產出 | M1-001～004 定稿；Gate Review 條件式通過；權威時間軸確認 |

**前置條件**
- M1-001／M1-002／M1-003 內容已確認
- 團隊同意過渡期唯一權威 = `store_accounts_v48_system`

**驗收條件**
- 本文件（M1-004）已核准鎖定
- Out of Scope 無歧義
- Data Authority Timeline 已書面確認

**可進入下一階段條件**
- Phase 0 驗收全部 Pass
- 無未關閉的 Critical 流程風險（例如規格分叉未處理）— 建議合入含 001～004 之 PR 至 `main`

**中止條件**
- 要求本階段改 `index.html`／搬密碼／建 Auth／新 localStorage Key
- 要求改變執行期資料來源離開 `store_accounts_v48_system`

---

### Phase 1 — MER 建立

| 項目 | 內容 |
|------|------|
| 目的 | 依 M1-002 建立 MER（`master_employees`）目標結構之**設計完備**；執行期仍不切換 |
| 實作歸屬 | **M1-005 及之後**（本階段仅规划） |
| 規劃重點 | UUID 策略、`employee_code`／`employee_code_norm`、`status`、禁止欄位 |

**前置條件**
- Phase 0 Pass
- M1-002 Schema Locked
- 確認不改執行期資料來源

**驗收條件（規劃層）**
- MER 欄位／約束／禁止清單可追溯至 M1-002
- 明確：Phase 1 實作前執行期仍只讀寫 `store_accounts_v48_system`

**可進入下一階段條件**
- MER 建立方案審核通過（另開實作任務）
- 仍維持 legacy 為唯一執行期權威

**中止條件**
- 以 MER 取代執行期讀取（早於 Cutover）
- 將 password／role／store 寫入 MER

---

### Phase 2 — Legacy Mapping

| 項目 | 內容 |
|------|------|
| 目的 | 依 M1-003 完成 legacy → MER／Memberships 對照之**可執行映射規格就緒** |
| 實作歸屬 | 對照已由 M1-003 鎖定；映射**執行**屬 M1-005+ |
| 規劃重點 | `store` 主要 Membership、`store2` 第二筆、`system_role` 暫時映射、`employment_role` 不映射、廢止帳排除 |

**前置條件**
- Phase 0～1 規劃通過
- M1-003 Mapping Locked

**驗收條件（規劃層）**
- Seed 27 列對照可作為未來匯入清單
- Membership 計量規則（30 列）已確認
- 密碼不在映射產物中

**可進入下一階段條件**
- 映射規則無未決議 Critical 歧義
- Q1 權威策略維持本文件定稿（legacy 執行期權威）

**中止條件**
- 要求映射時建立 Auth／搬密碼
- 要求修改業績／庫存結構以寫入 `mer_id`（未另開 RULES 評估）

---

### Phase 3 — Migration

| 項目 | 內容 |
|------|------|
| 目的 | 將對照結果落實為目標儲存中的 MER／Memberships 資料（正式遷移） |
| 實作歸屬 | **M1-005（Migration SQL Design／實作）及核准後之實作任務** |
| 本文件定位 | 只定義閘門；**不寫 SQL、不執行遷移** |

**前置條件**
- Phase 0～2 Pass
- 專用實作任務與 RULES 評估已核准
- 完整備份策略就緒（沿用系統 JSON 備份能力）

**驗收條件（未來實作時）**
- MER／Memberships 資料與 M1-003 對照一致（計量可核對）
- 執行期讀寫在 Cutover 前仍指向 legacy
- 無 Auth／密碼雜湊夾帶（除非另開 Auth 專規且核准）

**可進入下一階段條件**
- 遷移產物可重複核對
- Validation 環境／清單就緒

**中止條件**
- 遷移中發現執行期已被切換
- 資料與 Seed／現場 accounts 嚴重不一致且無法解釋
- 出現密碼寫入 MER／Profile／Membership

---

### Phase 4 — Validation

| 項目 | 內容 |
|------|------|
| 目的 | 在不切換權威的前提下，驗證遷移產物與回歸清單 |
| 實作歸屬 | M1-006 準備／專用驗證任務 |
| 驗證焦點 | 登入、選店、庫存權限、核對權限、設定 CRUD、業績關聯工號解析 |

**前置條件**
- Phase 3 產物存在且可讀（未來）
- 執行期權威仍為 `store_accounts_v48_system`

**驗收條件**
- Go／No-Go Checklist（本 Phase）全綠
- 與 legacy 行為對照：登入結果、店別選項、角色權限無回歸
- 備份可還原演練通過（至少一次）

**可進入下一階段條件**
- Validation Pass
- Cutover 計畫與 Rollback 演練紀錄齊備

**中止條件**
- 任一核心流程回歸失敗
- 無法自備份還原
- 發現執行期資料來源已被擅自變更

---

### Phase 5 — Cutover

| 項目 | 內容 |
|------|------|
| 目的 | 將執行期權威自 Legacy Accounts 切至 MER（目標模型） |
| 實作歸屬 | **M1-006 及獨立核准** |
| 硬性約束 | **未完成 M1-005 前不得 Cutover**；M1-004 禁止執行 |

**前置條件**
- Phase 4 Pass
- M1-005 完成且核准
- 產品／工程書面 Go

**驗收條件**
- 執行期讀寫改以 MER（及 Memberships）為人員權威
- legacy key 處理策略（保留唯讀／雙寫結束）已文件化並執行
- 回歸清單再跑一輪 Pass

**可進入下一階段條件**
- Cutover 穩定觀察期通過（時長另定）
- Rollback 窗口內未觸發中止

**中止條件**
- 登入／權限／業績回報中斷（P0）
- 人員解析失敗導致營運不可用
- → 立即進入 Phase 6

---

### Phase 6 — Rollback

| 項目 | 內容 |
|------|------|
| 目的 | 任一階段失敗時回復至已知可營運狀態 |
| 實作歸屬 | 與 Cutover／Migration 實作任務綁定；**本文件定義原則** |
| 原則 | 回復執行期權威至 `store_accounts_v48_system`；不依賴 SQL |

詳見 **§四 Rollback Plan**。

**前置條件**
- 觸發中止條件，或人工宣告 Rollback
- 可用備份存在

**驗收條件**
- 執行期權威恢復為 `store_accounts_v48_system`
- 登入與核心營運流程恢復
- 事故與回復步驟已記錄

**可進入下一階段條件**
- 回復後營運穩定
- 根因分析完成後，才允許重新進入失敗所在 Phase（不得跳相）

**中止條件**
- 備份損毀且無法回復 → 升級為事故（超出本文件自動化範圍；需人工救災）

---

## 二、Go / No-Go Checklist（總表）

### Phase 0 — Preparation

| 類型 | 項目 |
|------|------|
| 前置 | M1-001～003 鎖定；權威 = legacy 已書面同意 |
| 驗收 | M1-004 文件鎖定；Out of Scope 清楚 |
| 進入下一階段 | Phase 0 Pass；無 Critical 規格分叉 |
| 中止／No-Go | 要求本階段改程式／改執行期來源 |

### Phase 1 — MER 建立

| 類型 | 項目 |
|------|------|
| 前置 | Phase 0 Pass；M1-002 可用 |
| 驗收 | MER 方案可追溯 Schema；執行期未切換 |
| 進入下一階段 | MER 方案審核通過（實作任務） |
| 中止／No-Go | 早切權威；password／店／角色寫入 MER |

### Phase 2 — Legacy Mapping

| 類型 | 項目 |
|------|------|
| 前置 | M1-003 鎖定；Phase 1 規劃通過 |
| 驗收 | 27 列對照＋Membership 規則確認；無密碼表 |
| 進入下一階段 | 映射無 Critical 歧義 |
| 中止／No-Go | 要求建 Auth／搬密／改業績結構 |

### Phase 3 — Migration

| 類型 | 項目 |
|------|------|
| 前置 | Phase 0～2 Pass；備份就緒；M1-005 任務核准 |
| 驗收 | 產物與對照一致；執行期仍 legacy |
| 進入下一階段 | 可進入 Validation |
| 中止／No-Go | 執行期已切；資料嚴重不一致；密碼污染 MER |

### Phase 4 — Validation

| 類型 | 項目 |
|------|------|
| 前置 | Phase 3 產物就緒；權威仍 legacy |
| 驗收 | 核心回歸 Pass；還原演練 Pass |
| 進入下一階段 | Cutover 書面 Go |
| 中止／No-Go | 核心回歸失敗；無法還原 |

### Phase 5 — Cutover

| 類型 | 項目 |
|------|------|
| 前置 | Phase 4 Pass；M1-005 完成；獨立核准 |
| 驗收 | 權威切至 MER；回歸再 Pass |
| 進入下一階段 | 穩定觀察通過 |
| 中止／No-Go | P0 營運中斷 → Phase 6 |

### Phase 6 — Rollback

| 類型 | 項目 |
|------|------|
| 前置 | 中止觸發或人工宣告 |
| 驗收 | 權威回 legacy；營運恢復 |
| 進入下一階段 | 根因關閉後由 Phase 失敗點重進 |
| 中止／No-Go | 備份不可用 → 事故升級 |

---

## 三、Data Authority Timeline

### 3.1 一句話

**目前：Legacy Accounts 是唯一執行期權威。**  
**未來（Cutover 後）：MER 是人員主檔權威。**  
**M1-004／未完成 M1-005 前：禁止切換。**

### 3.2 權威切換時間軸

```
時間 ──────────────────────────────────────────────────────────────►

[現在 ～ M1-004 ～ M1-005 完成前]
  執行期權威:  store_accounts_v48_system   ★ UNIQUE
  目標模型:    MER (+ Memberships)         （只存在於規格／未來產物）
  Auth:        仍內嵌於 legacy 登入         （不在 M1-004 建立）

[M1-005 遷移產物存在，但未 Cutover]
  執行期權威:  store_accounts_v48_system   ★ 仍 UNIQUE
  影子產物:    MER／Memberships            （驗證用，不服務現場讀寫）

[M1-006 Cutover 成功後]
  執行期權威:  MER                         ★ 切換
  Legacy:      依專規保留／封存／唯讀      （另定；失敗則 Rollback）

[Rollback]
  執行期權威:  store_accounts_v48_system   ★ 恢復
```

### 3.3 對照圖

```
目前:
  Legacy Accounts (store_accounts_v48_system)
       ↓
  登入／權限／設定 CRUD／現場營運

未來（Cutover 後）:
  MER
       ↓
  Account Center → Auth → Profiles → Memberships
       ↓
  登入／權限／營運
```

### 3.4 過渡期硬規則

1. 未完成 M1-005 前，**不得**改變任何執行期資料來源。  
2. MER **不得**在過渡期被程式當作讀寫權威。  
3. 不得新增第二個執行期人員 Key 與 legacy 並行權威（避免雙寫衝突）；雙寫若未來需要，必須另開評估且不得在 M1-004 執行。

---

## 四、Rollback Plan

> **不得寫 SQL。** 回復以既有瀏覽器／系統備份與執行期權威切回為原則。

### 4.1 觸發條件

- 任一 Phase 中止條件成立
- Cutover 後出現 P0（白屏、無法登入、核心回報中斷）
- 驗證發現資料污染（密碼進入 MER 等）

### 4.2 回復步驟（原則）

1. **立即停止**繼續遷移／切流操作。  
2. **恢復執行期權威**至 `store_accounts_v48_system`（若已切換則切回；若尚未切換則確認未曾改來源）。  
3. 使用系統既有 **完整備份 JSON 還原**（`exportFullBackup`／`restoreFullBackup` 能力）回復裝置狀態（若該裝置在遷移中被改動）。  
4. 確認登入、選店、業績、庫存、設定等核心路徑恢復。  
5. 記錄失敗 Phase、時間、影響範圍、是否已還原。  
6. **禁止**以「修補 SQL／重建表」作為 M1-004 文件內的回復手段（本階段無 SQL）。

### 4.3 回復成功定義

- 現場以 legacy accounts 可正常登入與營運
- localStorage Key 名稱未被改名
- 無半切換狀態（一部分讀 MER、一部分讀 legacy）

### 4.4 回復後重進規則

- 必須從失敗 Phase 的前置條件重新滿足後再進入
- 不得跳過 Validation 直接 Cutover

---

## 五、Risk Register

### Critical

| ID | 風險 | 說明 | 緩解（規劃層） |
|----|------|------|----------------|
| C1 | 過早切換執行期權威 | 未完成 M1-005／Validation 就讀 MER | 時間軸硬鎖；M1-004 禁實作 |
| C2 | 改登入核心導致現場無法上班 | 觸犯 RULES 第 3 條 | 登入列為 Out of Scope |
| C3 | 備份缺失導致無法 Rollback | Cutover 失敗無法回復 | Phase 3／4 強制備份與還原演練 |

### High

| ID | 風險 | 說明 | 緩解 |
|----|------|------|------|
| H1 | Seed 同步覆寫現場帳密／角色 | Q1 衝突 | 過渡期權威固定 legacy；實作前另決 |
| H2 | 密碼進入 MER／Membership | 違 M1-003 | Out of Scope；驗收檢查 |
| H3 | 規格分叉（多 PR 未合 main） | 實作依錯版本 | Gate：先合文件真相來源 |
| H4 | `system_role` vs M1-002 `role` 命名不一致 | 實作歧義 | 進 M1-005 前修訂 Schema 對齊 |

### Medium

| ID | 風險 | 說明 | 緩解 |
|----|------|------|------|
| M1 | `一般員工` ∉ `ROLE_OPTIONS` | 設定 UI 與 seed 不一致 | Memberships／UI 專規 |
| M2 | 工號變更與歷史 `employeeId` | 業績關聯漂移 | 遷移別名策略（後續） |
| M3 | 雙店 role 同值過度簡化 | 未來每店不同權限 | employment／system 分離已預留 |

### Low

| ID | 風險 | 說明 | 緩解 |
|----|------|------|------|
| L1 | `primary_store_hint` 日後廢除成本 | 提示欄非權威 | 文件已標示非正式店別 |
| L2 | 集團首腦雙 Membership 日後改全域 | 模型微調 | Memberships 專規 |

---

## 六、Out of Scope

下列 **皆不屬於 M1-004**（不得在本任務或以本文件為藉口執行）：

| 類別 | 明確排除 |
|------|----------|
| Auth | 建立 Auth User、Session、登入主體 |
| Password | 搬移、匯出表、文件列出路碼 |
| Hash | 任何密碼雜湊／加密改造 |
| SQL | 撰寫或提交 SQL |
| Migration Implementation | 執行資料遷移、切流腳本 |
| Supabase | 建 Table、Policy、Migration 檔 |
| Feature | 修改任何既有功能行為 |
| UI | 任何畫面／設定頁改版 |
| 程式 | `index.html`、JavaScript |
| 儲存 | 修改 localStorage 內容邏輯、新增 Key、改 Key 名 |
| 登入／權限 | `handleLoginSubmit`、庫存／核對／設定權限判斷 |

---

## 七、與 M1-001／002／003 的符合性

| 規格 | 符合性 | 說明 |
|------|--------|------|
| M1-001 | **符合** | MER 為目標主檔；不負責登入；資料流順序維持；過渡期 legacy 為運作事實 |
| M1-002 | **符合（規劃）** | 相位依 Schema 建立 MER；本文件不改 Schema 正文；命名對齊債（`role`→`system_role`）列為進 M1-005 前建議 |
| M1-003 | **符合** | 映射規則沿用；不建 Auth；不搬密；`system_role`／`employment_role` 分離；廢止帳不納入 |

---

## 八、是否具備進入 M1-005（Migration SQL Design）的條件

### 8.1 目前結論：**條件式尚未具備（Conditional Not Ready）**

M1-004 文件完成後，**規格規劃層**已可支持啟動 **M1-005 的 Engineering Assessment**；  
但 **直接開始 M1-005 SQL Design／實作** 仍建議滿足以下閘門：

| # | 進入 M1-005 建議閘門 | 現況 |
|---|----------------------|------|
| 1 | M1-001～004 已成 `main` 真相來源 | Draft PR 階段（視合併而定） |
| 2 | 過渡期權威 = legacy 已鎖定 | **是**（本文件） |
| 3 | 明確 M1-005 仍不得在完成前切執行期來源 | **是** |
| 4 | Schema 命名對齊（`system_role`／`employment_role`） | **建議先做**（H4） |
| 5 | Auth／Password／Hash 仍排除在 M1-005 第一刀之外（或另開專規） | **需在 M1-005 EA 重申** |
| 6 | 獨立 M1-005 Engineering Assessment 並經核准 | **未做** |

**因此：M1-004 完成 ≠ 自動授權 M1-005 實作。**  
下一步應為：**M1-005 Engineering Assessment（含是否允許 SQL Design 文件 only）**，而非直接寫 SQL／改程式。

---

## 九、完成定義（DoD）

- [x] 交付 `docs/specs/M1-004_Migration_Adaptation_Plan.md`
- [x] Phase 0～6 定義完成
- [x] 每 Phase 含前置／驗收／進入下一階段／中止條件
- [x] Data Authority Timeline
- [x] Rollback Plan（無 SQL）
- [x] Risk Register（Critical～Low）
- [x] Out of Scope 明確
- [x] **未**修改任何程式與執行期資料來源

---

## 附錄 A｜相關文件

- `docs/specs/M1-001_Master_Employee_Registry.md`
- `docs/specs/M1-002_MER_Schema.md`
- `docs/specs/M1-003_Legacy_Accounts_Mapping.md`
- `RULES.md`

## 附錄 B｜詞彙

| 詞 | 定義 |
|----|------|
| 執行期權威 | 現場程式實際讀寫以營運的人員資料來源 |
| 目標模型 | MER 等未來權威結構（規格／未來產物） |
| Cutover | 執行期權威切換動作（M1-006） |
| M1-005 | Migration SQL Design／正式遷移（另開） |

---

*M1-004 Adaptation Plan Locked · 文件 only · 非實作 · 執行期權威 = store_accounts_v48_system*
