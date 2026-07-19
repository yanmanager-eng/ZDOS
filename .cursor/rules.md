# ZDOS Cursor Rules

你是 ZDOS 專案的資深前端工程師。修改前先閱讀 `PROJECT.md`、`RULES.md`、`BUGLIST.md`。

## 專案概要

- 單檔 SPA：`index.html`（v1.0.3 Beta），原生 JS + Tailwind CDN，無後端
- 核心：`state` + `renderApp()` + `saveState()` + Google Form POST
- 詳細架構見 `PROJECT.md`

## ZDOS 原則

ZDOS 是營運系統。

任何新功能都必須符合：

「每天真的有人會使用。」

如果只是炫技、
增加複雜度、
降低現場效率，

請提出風險，
建議延後，
不要直接開發。

## 硬性禁止

1. 不可修改 localStorage Key 名稱
2. 不可修改 Google Form URL 與 entry ID
3. 不可修改登入流程（`handleLoginSubmit` 核心邏輯）
4. 不可修改中華店／東港店現金公式
5. 不可修改 `salesRecords`、`inventoryRecords` 結構
6. 不可重新生成整個 `index.html`
7. **Store Registry**：店別相關 UI 必須讀取 `STORE_REGISTRY`（`index.html`）；禁止寫死店別。新增門市只擴充 Registry 一筆。

## Store Registry（Architecture Rule）

**唯一來源：** `index.html` 內 `STORE_REGISTRY`

| code | name | status |
|------|------|--------|
| CH | 中華店 | active |
| DG | 東港店 | active |
| HJ | 後勁店 | coming_soon |

- **active** → 可登入、可選、可載入資料
- **coming_soon** → 選單顯示「尚未開放」；點擊 Toast；不切換、不建功能

**必用 Helper（勿重複實作）：** `getActiveStores()`、`renderStoreSelectOptions()`、`renderLoginStorePickerButtons()`、`isStoreActive()`、`getComingSoonToast()`、`storeHasMobilePay()` 等

詳見 `PROJECT.md` § Store Registry。

## Shift Registry（Architecture Rule #003）

**唯一來源：** `index.html` → `SHIFT_REGISTRY`

| code | name | 分類 timeRange（非工時） |
|------|------|-------------------------|
| M | 早班 | 10:00 ~ 14:59 |
| A | 中班 | 15:00 ~ 21:59 |
| N | 晚班 | 22:00 ~ 翌日 09:59 |

**核心原則：班別（Category）≠ 工時（Working Time）**

- `timeRange` 僅供：排班分類、報表、AI 分析、班次篩選
- 實際上下班（例：早班 10:30~19:30）由 **Schedule** 或 **Shift Template** 決定
- 禁止將 `timeRange` 當作打卡或排班工時

**必用 Helper：** `getShiftByCode()`、`classifyShiftByTime()`、`renderShiftSelectOptions()`、`getStoreShiftCodes()`

## 開發方式

- 修改前先唯讀分析；最小 diff；優先改現有程式，不重構
- 每次修改列出 Diff，並說明影響範圍（View、角色、雲端、localStorage）
- 修改後檢查 JavaScript 語法（尤其 `renderApp()` template literal 內變數作用域）
- 若可能造成白屏，**先停止並提出方案**，不要直接改

## 先理解，再修改

如果需求不明確：

禁止自行猜測。

必須先提出分析與修改方案。

等待確認後才能開始修改。

## 不得直接修改

收到需求後：

第一步必須先完成分析。

分析至少包含：

- 修改原因
- 影響函式
- 是否影響 renderApp()
- 是否影響 localStorage
- 是否影響 Google Form
- 是否需要重構
- 預估修改行數

等待確認後才能開始修改。

## Engineering Assessment

收到任何需求後，不得直接修改。

請依照以下格式回答：

### 一、需求理解
用一句話說明你理解的需求。

### 二、修改原因
為什麼需要修改。

### 三、影響範圍
- 修改函式
- renderApp
- localStorage
- Google Form
- UI

### 四、風險
Low / Medium / High

### 五、是否需要重構
Yes / No

若 Yes，停止並提出方案。

### 六、預估修改
- 修改檔案
- 修改函式
- 預估修改行數

### 七、建議
是否建議現在修改。

完成評估後等待確認。

## 系統思維

修改任何功能時，不得只考慮目前需求。

必須評估：

1. 是否影響其他模組。
2. 是否影響未來擴充。
3. 是否增加程式耦合。
4. 是否符合 PROJECT.md 的長期架構。

若有更好的架構方案：

先提出。

不要直接修改。

等待確認後再實作。

## 禁止大型重構

除非明確收到：

「允許重構」

否則：

- 不得重新生成 index.html
- 不得重寫 renderApp()
- 不得重新整理 state
- 不得修改超過 100 行程式
- 每次修改應以最小 Diff 為原則
- 優先修改現有程式，而非重寫

## 高風險區（動前必讀）

| 區域 | 風險 |
|------|------|
| `renderApp()` View 路由 | 變數未宣告 → ReferenceError 白屏 |
| `handleDirectUploadRecord()` | formData key 對應 Google Sheets |
| `saveState()` | 漏寫 → 資料遺失 |
| `shield_*` keys | 登入持久化失效 |

## Bug 與發版

- **P0**（白屏、核心中斷）：立即 Hotfix，更新 `CHANGELOG.md`
- **P1~P3**：累積 5 個再批次發布，更新 `BUGLIST.md`
- 現行待修見 `BUGLIST.md`

## 修改 `index.html` 檢查清單

- [ ] 符合 `RULES.md` 全部 15 條
- [ ] 只改必要行數
- [ ] 新變數在 `renderApp()` 正確作用域宣告（參考第 477 行 `hasInventoryPrivilege` 模式）
- [ ] 未動禁止項目
- [ ] 已提供 Diff 與影響範圍

## 文件同步

發版或修 Bug 後更新：

- `CHANGELOG.md` — 更新紀錄
- `BUGLIST.md` — Bug 狀態

# 修改完成後的回報格式

每次完成修改後，請固定依照以下格式回報：

1. Engineering Assessment（若本次有）
2. Diff Summary（修改摘要）
3. Modified Files（修改檔案）
4. Modified Functions（修改函式）
5. Risk Assessment（Low / Medium / High）
6. Test Checklist（建議測試項目）

回報請精簡，不重複說明。
