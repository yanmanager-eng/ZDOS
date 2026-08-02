# NEXT-003｜Founder Console v0.1

## 目標

在現有 ZDOS v1.5.0 UI／操作架構中，新增創辦人專屬 Console v0.1（工作台），供後續 Founder Layer 使用。

## 非目標

- 第二套 ZDOS／新首頁
- 新 Auth、新角色系統
- 修改一般員工／幹部／店長既有畫面與權限結果
- 外部 AI、假營運數據、假 Bug 數、假進度百分比
- Production／Beta 自動開啟

## 身分解析

正式角色來源（不得用姓名／Email／工號硬編碼）：

| 環境 | SoT | Founder 判定 |
|------|-----|--------------|
| Cloud | `profiles.role`／`state.cloudRole` | `owner` |
| Local | 帳號 `role`（`normalizeAccountRole`） | `集團首腦` |

Adapter：`window.ZdosFounderIdentityAdapter`  
→ 轉為 Founder Context → `ZdosCapabilityResolver`

## Capability 依賴

- NEXT-001 `ZdosCapabilityEngine`（必須啟用）
- NEXT-002 `ZdosFounderContext`／`ZdosCapabilityResolver`
- 必須具備 capability：`founder`

## Feature Flag

- 名稱：`ZDOS_FOUNDER_CONSOLE`
- 預設：`false`
- 持久化：無（memory only）
- 不寫入既有 localStorage key
- 不出現在一般設定 UI

## UI 結構

- 入口：功能中心卡片（桌面）／快捷入口（手機，條件渲染）
- 文案：創辦人工作台（Founder Console）
- 頁面：沿用 `zdos-workspace` Header + 返回 + 四張卡片
  1. Development
  2. System Health
  3. Operation
  4. AI Brief

## Guard

- `canAccessFounderConsole()`
- `openFounderConsole()`
- `renderFounderConsole()`
- `renderApp` 對 `currentView === 'founder-console'` 二次 Guard

條件：Flag ON ∧ Engine ON ∧ 正式 Founder 角色 ∧ `founder` capability

## DEV 測試方式

僅 localhost／127.0.0.1／file:

```js
ZdosFounderConsoleDev.enable()
ZdosFounderConsoleDev.status()
ZdosFounderConsoleDev.openWithTestContext()
ZdosFounderConsoleDev.disable()
```

Acceptance（手動呼叫，不自動執行）：

```js
runZdosFounderConsoleAcceptance()
```

## Acceptance

見 `runZdosFounderConsoleAcceptance()`：旗標、入口、Guard、四卡內容、返回／重渲染、RWD class、還原。

## Rollback

1. 關閉 `ZDOS_FOUNDER_CONSOLE`（`ZdosFounderConsoleDev.disable()`）
2. 移除入口條件渲染與 `founder-console` view 分支
3. 移除 `founder-identity-adapter.js`／`founder-console.js` 與 script 引用
4. 還原 Backlog 狀態  
不影響 NEXT-001／002、Auth、Supabase、RLS、localStorage、Production。

## 後續版本

- 接入真實進度／Bug Registry／營運讀模組
- AI Brief 實作（NEXT-004 方向）
- Founder Insight

## UI Refinement NEXT-003A

### 視覺原則

- 延續 ZDOS v1.5.0 企業藍灰與現有 workspace／home card 語言
- 不使用黑色駭客風、霓虹、獨立側欄、第二套 Navbar
- Founder Console 看起來像原本就有的一個中心
- 樣式集中於 `ui/founder-console.css`，僅 scope 於 `[data-zdos-founder-console-page]`

### 文案調整

- Header：創辦人工作台 ＋ Founder Control Center
- 頂部：今日創辦人簡報（不顯示 v0.1）
- Development／System Health 改中文欄位與狀態
- Operation 標題：營運概況
- 底部小字：Build NEXT-003A

### RWD

- 手機單欄；桌機兩列雙卡（Development／AI Brief 較寬）
- 驗證 390／768／1280，無水平溢出

### 未接入資料

- 開發進度、Bug Registry、營運資料、AI Brief 皆顯示「尚未接入／後續啟用」

### 禁止假資料

- 不得填假百分比、假 Bug 數、假營收／人數、假 AI 分析

### Rollback

1. 還原 `core/capability/founder-console.js` 渲染字串與版面
2. 移除 `ui/founder-console.css` 與 `index.html` 的 stylesheet 引用
3. 還原 Backlog NEXT-003A 狀態  
不影響 Guard／Flag／Adapter／Engine／Production
