# ZDOS 專案說明（AI 工程師用）

> 本文件供 AI 工程師在接手 ZDOS 專案時快速建立上下文。  
> 使用者操作手冊不在此範圍。修改程式前請一併閱讀 `RULES.md`。

---

## 1. ZDOS 是什麼

**ZDOS（ZhongDong Operating System）** 是大埔中東集團的門市營運回報系統，目前版本 **v1.0.2**。

- **形式：** 單檔 HTML 應用（`index.html`），無後端、無 bundler
- **部署：** 以靜態檔案開啟或托管即可（手機／平板／桌面瀏覽器）
- **資料流：** 門市填寫表單 → POST 至 Google Forms → 匯入 Google 試算表
- **本地持久化：** 全部資料存於瀏覽器 `localStorage`
- **支援店別：** 中華店、東港店（規格略有差異）

前身為 DAPU OS v6.x 系列；ZDOS 為 v1.x 重新命名的正式版。

---

## 2. 系統目前有哪些功能

### 登入與權限
- 員工編號 + 密碼登入，選擇「中華店」或「東港店」
- 登入狀態持久化（刷新／滑掉不踢回）
- 角色分級：資深員工～領班、店長、集團首腦等
- 店長／集團首腦可進入系統設定；店長／集團首腦可進入庫存模組

### 今日營運首頁（Dashboard）
- 登入後預設畫面（`currentView === 'dashboard'`）
- 今日待辦進度（業績回報、庫存盤點）
- 快速入口：業績回報、庫存盤點、功能中心

### 業績申報（`activeAppTab === 'sales'`）
- 日期、班別、帳多、營收、支出、即時試算實收現金
- 中華店額外欄位：Linepay、TWQR、Apple Pay
- 一鍵 POST 上傳 Google Form
- 本地歷史明細、「✏️ 修改」叫回表單、刪除紀錄
- 同日期＋同班別＋同店覆寫邏輯

### 庫存盤點叫貨（`activeAppTab === 'inventory'`）
- 條碼／品項、現場庫存、追加叫貨
- 相機條碼掃描（`BarcodeDetector`）+ 模擬盤點面板 fallback
- 本地暫存 → 批次上傳庫存 Google Form

### 系統設定（店長／集團首腦）
- Google 試算表對接（雙店業績 + 庫存 entry ID）
- 員工帳密 CRUD（含工號塗改）
- 完整備份／還原（JSON dump 全 localStorage）

### 其他
- Toast 通知、更新公告 Modal（HTML 存在，顯示邏輯待補）
- 封面公告跑馬燈／靜態文字

---

## 3. 系統架構

### 檔案結構

```
ZDOS/
├── index.html          # 正式版（唯一執行檔）
├── index1_0_1.html     # v1.0.1 備份
├── index1_0_0.html     # v1.0.0 備份
├── RULES.md            # 開發規範（強制遵守）
├── CHANGELOG.md        # 更新紀錄
├── BUGLIST.md          # Bug 清單
└── PROJECT.md          # 本文件
```

### 技術棧

| 層 | 技術 |
|---|---|
| UI | Tailwind CSS（CDN） |
| 邏輯 | 原生 JavaScript（單一 `<script>`） |
| 狀態 | 全局 `state` 物件 |
| 持久化 | `localStorage`（經 `saveState()` 統一寫入） |
| 渲染 | `renderApp()` 全量 `innerHTML` 重繪（SPA） |
| 雲端 | Google Forms `POST`（`mode: 'no-cors'`） |

### View 路由

```
isLoggedIn === false  →  VIEW A：登入頁
isLoggedIn === true
  currentView === 'dashboard'  →  VIEW B：今日首頁
  currentView === 'module'     →  VIEW C：功能後台
                                   ├── activeAppTab: sales（業績）
                                   └── activeAppTab: inventory（庫存）
```

### 核心函式（修改前必讀）

| 函式 | 職責 |
|---|---|
| `renderApp()` | 唯一 UI 渲染入口 |
| `state` | 全局資料模型 |
| `saveState()` | localStorage 寫入唯一出口 |
| `handleLoginSubmit()` | 登入 + 店別權限 |
| `handleDirectUploadRecord()` | 業績上傳 + 本地紀錄 |
| `handleUploadInventoryToCloud()` | 庫存批次上傳 |
| `calculateLiveNetProfit()` | 中華／東港現金試算 |
| `updateModalContent()` | 系統設定 Modal |

### localStorage Keys（不可更名）

| Key | 用途 |
|---|---|
| `shield_is_logged_in` | 登入狀態 |
| `shield_store_type` | 當前店別 |
| `shield_employee_id` | 當前工號 |
| `zdos_current_view` | dashboard / module |
| `store_accounts_v48_system` | 員工帳密 |
| `google_form_settings_v31_permanent` | Google Form 配置 |
| `local_sales_records_v22` | 業績歷史 |
| `local_inventory_records_v22` | 庫存歷史 |
| `cover_notice_v31_permanent` | 封面公告 |
| `cover_design_v31_permanent` | 封面外觀 |

---

## 4. 開發原則

完整條文見 `RULES.md`。摘要如下：

1. **修改前先分析** — 讀懂 `renderApp()` 路由與 `state` 再動手
2. **最小化 diff** — 只改必要行數，不重構、不重新生成 `index.html`
3. **優先改現有程式** — 沿用既有函式與命名慣例
4. **每次修改列出 Diff** — 修改前／修改後對照
5. **修改後說明影響範圍** — 哪些 View、哪些角色、是否觸及雲端
6. **修改後檢查 JavaScript 語法** — 避免 template literal 內 ReferenceError
7. **若可能造成白屏，先停止並提出方案** — 不可直接試改

---

## 5. 哪些東西不能修改

以下為 **硬性禁止**（違反可能導致現場資料遺失或雲端對接失效）：

| 項目 | 原因 |
|---|---|
| localStorage Key 名稱 | 現場裝置已有歷史資料 |
| Google Form URL 與 entry ID | 與 Google 試算表欄位綁定 |
| 登入流程（`handleLoginSubmit` 核心邏輯） | 權限與持久化已上線 |
| 中華店／東港店現金公式 | 兩店計算規則不同且已驗證 |
| `salesRecords`、`inventoryRecords` 資料結構 | 本地歷史與備份相容性 |

以下為 **強烈不建議**：

- 整檔重寫或拆分模組（違反 RULES 第 11、12 條）
- 引入 React/Vue 等框架
- 修改 `fetch` 的 `no-cors` 模式（Google Form 限制）
- 未評估即新增 localStorage key

---

## 6. Bug 管理方式

詳見 `BUGLIST.md`。

### 優先級

| 級別 | 定義 | 處理 |
|---|---|---|
| **P0** | 白屏、核心流程中斷 | **立即 Hotfix** |
| **P1~P3** | 次要功能、休眠程式、UX 問題 | **累積 5 個一起發布** |

### 目前狀態（截至 v1.0.2 Hotfix-1）

**已修復：**
- P0：VIEW C `canManage` 作用域白屏 → 改為 `hasInventoryPrivilege`

**待修：**
- 一般員工登入不應顯示分店選擇
- `closeUpdateModal` 未定義
- `tryFallbackTextareaCopy` 未定義

### AI 修 Bug 流程

1. 在 `BUGLIST.md` 確認優先級與是否可動手
2. 唯讀分析 → 提出方案 → 等確認（P0 除外可直修）
3. 最小 diff 修改 `index.html`
4. 列出 Diff + 影響範圍
5. 更新 `CHANGELOG.md`（Hotfix 或批次版本）
6. 更新 `BUGLIST.md` 狀態

---

## 7. 版本管理方式

### 版本號規則

- **主版本：** `v1.0.x`（對應 `index.html` title 與 Dashboard 標示）
- **Hotfix：** `v1.0.x Hotfix-n`（僅修 P0，記錄於 `CHANGELOG.md`）
- **批次更新：** P1~P3 累積 5 項後發 `v1.0.x+1` 或約定子版本

### 備份策略

- 重大修改前：複製 `index.html` → `index1_0_x.html`
- 資料備份：系統內建 `exportFullBackup()` → JSON 檔
- 不依赖 Git 為唯一備份（專案可能無 remote）

### 文件同步義務

每次發版需更新：

| 文件 | 內容 |
|---|---|
| `CHANGELOG.md` | 使用者／管理員可見的更新摘要 |
| `BUGLIST.md` | 已修／待修狀態 |
| `index.html` title | 版本號（若為正式版 bump） |

---

## 8. 未來 Roadmap

以下為規劃方向，**未排程、未實作**。實作前須符合 `RULES.md`。

### 近期（待修清單相關）
- [ ] 登入 UX：一般員工依帳號自動判定店別，不顯示分店按鈕
- [ ] 補齊 `closeUpdateModal`、`tryFallbackTextareaCopy`（或移除死 HTML）
- [ ] 版本更新公告首次顯示邏輯

### 功能擴充
- [ ] 公告中心（Dashboard 已占位「建置中」）
- [ ] 庫存 Google Form 預設配置指引（不改 URL，改 onboarding UX）
- [ ] 封面／外觀設定 UI 接回（`saveDesignSettingsDirect` 已存在）

### 長期（需另開評估，可能觸及 RULES 禁區）
- [ ] 後端 API 取代 Google Form `no-cors` 盲送
- [ ] 密碼雜湊（需 migration 策略，不可直接改 key）
- [ ] 模組化拆分（需明確豁免 RULES 第 11 條）

---

## 附錄：AI 快速檢查清單

修改 `index.html` 前：

- [ ] 已閱讀 `RULES.md`
- [ ] 已確認 Bug 優先級（`BUGLIST.md`）
- [ ] 未觸碰禁止修改項目
- [ ] 修改範圍最小化
- [ ] `renderApp()` 內新變數在使用前已於正確作用域宣告
- [ ] 準備好 Diff 與影響範圍說明

---

*最後更新：v1.0.2 Hotfix-1 · 2026-07-14*
