# Blueprint-001｜Product Architecture

> ARCH-001｜Architecture Documents  
> 來源：現行 ZDOS v1.5.0 已確認產品範圍、`CHANGELOG.md`、`docs/00_Project/DEVELOPMENT_STRATEGY.md`、`docs/04_Roadmap/INNOVATION_BACKLOG.md`  
> 原則：只記錄已存在或已正式定義為 Backlog 的項目；不得將未實作功能寫成現況。

---

## 1. 產品定位

**ZDOS（ZhongDong Operating System）** 是大埔中東集團的門市營運系統。

- 正式版本標示：`VERSION_INFO.version = v1.5.0`
- 執行形態：瀏覽器靜態應用（主檔 `index.html`）
- 使用場景：手機／平板／桌面；門市日常營運回報、排班／請假、能力評核、公告與管理作業

前身為 DAPU OS v6.x；ZDOS 為 v1.x 正式命名。

---

## 2. 雙軌產品策略（已確認）

| 軌道 | 工作區 | 使命 |
|------|--------|------|
| **Production** | `ZDOS/`（正式營運） | 守護今天：Bug／安全／效能／RWD／已核准功能收尾 |
| **Next** | `ZDOS-Next/`（本工作區） | 創造明天：在不破壞 v1.5.0 前提下研發下一代能力 |

### 第一原則

1. Next 初始版本必須與 v1.5.0 一致
2. 所有創新必須可關閉（Feature Flag／Engine 預設關閉）
3. 不可回寫或污染 Production 工作區
4. UI 延續現有 ZDOS 設計語言

準則：**Production 守護今天。Next 創造明天。**

Production 禁止大型新模組、Founder Workspace、Genesis、Knowledge Engine、Decision Engine、全新 UI 架構（見 `DEVELOPMENT_STRATEGY.md`）。

---

## 3. 使用者與角色

### 3.1 現場／帳號角色（產品語意）

系統以員工工號登入，角色分級含（依帳號／雲端角色）：

- 一般員工、資深員工
- 實習幹部、領班／主管
- 店長
- 集團首腦

權限依模組不同（例如庫存、系統設定、排班編輯、能力評核、業績核對）。門市選取規則：

- 單店帳號：登入後直接進入所屬門市
- 雙店 membership（`store` + `store2`）或集團首腦：驗證後可選門市

### 3.2 雲端角色碼（Supabase `profiles.role`）

已定義：`owner`、`manager`、`supervisor`、`trainee_manager`、`senior_staff`、`staff`。

### 3.3 Founder（Next 產品語意，非新 Auth）

Founder 不是另開帳號系統。正式來源映射（已實作 Adapter）：

| 環境 | 來源 | Founder 判定 |
|------|------|--------------|
| Cloud | `profiles.role`／`state.cloudRole` | `owner` |
| Local | 帳號 `role` | `集團首腦` |

禁止以姓名／Email／工號硬編碼推斷 Founder。

---

## 4. 門市產品範圍

門市由 **Store Registry** 統一管理（禁止各模組寫死店別）：

| code | 名稱 | 產品狀態 |
|------|------|----------|
| CH | 中華店 | `active` |
| DG | 東港店 | `active` |
| HJ | 後勁店 | `coming_soon`（選單可見、Toast「尚未開放」、不切換／不載入資料） |

門市功能差異（例如行動支付欄位）由 Registry `features` 驅動，非硬編碼。

---

## 5. 已上線產品模組（v1.5.0）

以下為 CHANGELOG／主程式已確認存在的產品面：

### 5.1 登入與系統殼

- 工號＋密碼登入；登入狀態持久化
- 登入前版本更新公告（`VERSION_INFO`）
- 開場動畫／Boot splash；維護模式閘道（`MAINTENANCE_MODE`）
- Toast、系統 Modal、品牌／封面相關設定

### 5.2 今日營運首頁（Dashboard）

- 登入後官方首頁：`currentView === 'dashboard'`
- 今日待辦、快速入口、功能中心
- 手機首頁與桌面 Dashboard 並存於同一產品

### 5.3 業績與庫存

- **業績申報**（`module` + `sales`）：班別、營收／支出、店別差異欄位、Google Form 上傳、本地歷史
- **庫存盤點叫貨**（`module` + `inventory`）：條碼／盤點、批次上傳 Google Form
- **業績核對中心**（`review`）：待核對／完成／退回（Feature-005B）

### 5.4 公告與推播

- **公告中心**（`announcements`／詳情）
- **公告管理中心**（`announcement-manager`）
- **推播中心**（`notifications`）

### 5.5 人力／排班／請假

- **排班中心**（Scheduling Center；班別看板 UI-016）
- **請假／排假中心**（UI-017 等）
- **人力中心／班表異動**（`workforce`／`hrHome`／`schedule-change` 等 View）
- 代班／換班審核流程（v1.5.0 變更列有相關修正）

### 5.6 財務中心

- View：`accounting`／`reports`（產品標題：財務中心）

### 5.7 能力學院（UI-018）

- View：`academy`
- 能力框架 12 項（三大分類）
- 個人能力總覽、團隊評核
- Skill Map、Learning Path（rule-based）
- 與 **ORL 戰力等級**整合（ORL＝總體；能力＝分項）
- **不串雲端**；等級存 localStorage

### 5.8 系統設定／版本

- 店長／集團首腦：Google Form 設定、員工帳密、完整備份還原
- 版本中心／版本資訊（`VERSION_INFO`）

### 5.9 營運中心（Operation Center）

- View：`operation-center`
- 以 Feature Flag／整合腳本掛載（`ui/operation-center/`）；非強制取代官方 Dashboard

---

## 6. Next 產品層（僅已實作者）

下列存在於 **ZDOS-Next**，預設關閉，不影響未開旗標之一般使用者：

| 代號 | 產品 | 狀態 | 入口／Flag |
|------|------|------|------------|
| NEXT-001 | Capability Engine v0.1 | Done（Shell） | Engine 預設關閉 |
| NEXT-002 | Founder Context + Resolver | Done | 跟隨 Engine |
| NEXT-003／003A | Founder Console（創辦人工作台） | Implemented | Flag `ZDOS_FOUNDER_CONSOLE`；View `founder-console` |
| ZDP-001 | Development Platform MVP | Implemented | Flag `ZDOS_DEV_PLATFORM`；View `dev-platform` |

Founder Console 卡片文案：Development、System Health、Operation、AI Brief（工作台區塊；**不代表**各區塊背後引擎皆已實作）。

---

## 7. 明確非現況（Backlog／禁止誤寫為已上線）

| 代號 | 名稱 | 狀態 |
|------|------|------|
| NEXT-004 | Founder Insight | Backlog |
| NEXT-005 | AI Brief（獨立引擎） | Backlog |
| NEXT-006 | Knowledge Engine | Backlog |
| NEXT-007 | Decision Engine | Backlog |
| NEXT-008 | Genesis | Backlog |
| NEXT-009 | Workflow AI | Backlog |
| NEXT-010 | Enterprise OS | Backlog |

不得在產品架構中將上述描述為已交付能力。

---

## 8. 產品資料出口（使用者可見行為）

1. **本地**：瀏覽器 `localStorage`（現場歷史、排班、能力等級等）
2. **Google Forms → 試算表**：業績／庫存等既有上傳路徑（`no-cors` POST）
3. **Supabase（雲端）**：Auth、profiles、membership、部分營運／通知表（見 Blueprint-003）；與本地雙軌並存，非一次取代全部本地 key

---

## 9. 產品不變契約（摘要）

- 不更名既有 localStorage Key
- 不擅自改 Google Form URL／entry ID
- 不破壞登入核心流程與雙店現金公式
- 不破壞 `salesRecords`／`inventoryRecords` 結構相容性

詳見 `RULES.md` 與 Blueprint-002／003。

---

*ARCH-001｜Blueprint-001 Product Architecture · 對齊 ZDOS v1.5.0 已確認範圍*
