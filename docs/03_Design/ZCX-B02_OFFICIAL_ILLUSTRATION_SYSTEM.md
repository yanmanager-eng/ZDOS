# ZCX-B02｜ZDOS Official Illustration System

**Status:** Design Support（規格 only）  
**Workspace:** ZDOS-Next  
**Related:** ZCX-B01 Brand Asset Inventory · ZDL-001 · ZCX-001/002  
**Date:** 2026-08-03  

本文件建立 **AI 絲絲官方 Pose 規範**、命名規則與插圖目錄指南。  

**本輪不做：** 新增／修改／生成任何圖片；不改產品 UI／邏輯；不重新命名既有 Runtime 檔案。

---

## 1. Illustration Standard（總則）

| 項目 | 規範 |
|------|------|
| 角色 | AI 絲絲（官方助手）；與 AI 小天分開管理 |
| 風格 | 企業科技、溫度、可信；對齊 ZCX Corporate Blue-Gray |
| 格式（目標） | PNG · RGBA 透明底（優先） |
| 例外 | 既有 `ai-sisi-welcome.jpg` 維持現狀，未來重製再轉 PNG |
| 色溫 | 與 Brand Primary `#0B4F8C` 協調；禁止霓虹／賽博 Hack 風 |
| 構圖 | 角色完整可讀；預留左側／右側文字安全區（Hero 尤甚） |
| 裁切 | 預設「半身～膝上」；Celebrate／Sleep 可全姿 |
| Runtime 路徑 | 正式接線資產放 `ui/assets/brand/` |
| 庫存／擴充路徑 | `ui/assets/illustrations/`（依 Directory Guide） |
| 候選庫 | `ui/ZDOS Brand Center/` — 非正式路徑，須 curation 後才進正式目錄 |

### 1.1 既有 Runtime（不得改名）

| 現行檔名 | 角色 | 處置 |
|----------|------|------|
| `ui/assets/brand/ai-sisi-hero.png` | Home Hero 專用 | **保留檔名**；視為 Hero 變體 |
| `ui/assets/brand/ai-sisi-welcome.jpg` | Login Welcome | **保留檔名**；對應 Welcome Pose |
| `ui/assets/brand/ai-xiaotian-normal.png` | AI 小天（非絲絲） | 不在本 Pose 表內；另冊管理 |

### 1.2 全域禁止事項

1. 用 Emoji／第三方角色取代絲絲  
2. Brand Center UUID 檔直接當 runtime  
3. 純黑霓虹／過度光暈背景燒進角色檔（應透明）  
4. 遮擋關鍵 UI 文字的構圖（Hero）  
5. 自行重繪／替換既有正式檔而未核准  
6. 將六角金 Z／Product Logo 混充角色插圖  
7. 本規格階段新增或生成圖片檔

---

## 2. Pose Definition（AI 絲絲官方 8 Pose）

### 2.1 Normal

| 欄位 | 定義 |
|------|------|
| **用途** | 預設待命／中性狀態；一般資訊展示 |
| **使用頁面** | Home AI 卡（非緊急）· 通用助手入口 · Empty 前的預設 |
| **目標檔名** | `ai-sisi-normal.png` |
| **尺寸（建議）** | Master 1024×1024 或 1254×1254；UI 顯示 88–140px 高 |
| **建議背景** | 透明；置於 ZCX 企業藍灰／白卡上 |
| **是否透明** | **是（目標）** |
| **是否 Hero 專用** | **否** |
| **禁止事項** | 不可帶強烈情緒手勢；不可警告色道具主導畫面 |
| **現況** | 檔案尚未存在；程式暫以 `ai-sisi-hero.png` 代用（見 B01） |

### 2.2 Welcome

| 欄位 | 定義 |
|------|------|
| **用途** | 歡迎、登入後第一眼親和感 |
| **使用頁面** | Login Gate · Onboarding／首次進入 |
| **目標檔名** | `ai-sisi-welcome.png`（新製） |
| **既有 Runtime** | `ai-sisi-welcome.jpg` — **不得改名**；功能上等價 Welcome |
| **尺寸（建議）** | Master ≥480×480；Login 顯示約 72–120px |
| **建議背景** | 透明（目標）；現行 JPG 無透明，僅用於既有 Login 卡 |
| **是否透明** | 目標 **是**；現行 JPG **否** |
| **是否 Hero 專用** | **否** |
| **禁止事項** | 不可陰鬱／警示表情；不可取代 Product Logo |

### 2.3 Thinking

| 欄位 | 定義 |
|------|------|
| **用途** | 分析中、建議生成中、等待運算 |
| **使用頁面** | AI 建議載入 · Academy 學習提示載入 · 輕量 processing |
| **目標檔名** | `ai-sisi-thinking.png` |
| **尺寸（建議）** | Master 1024×1024；UI 88–140px 高 |
| **建議背景** | 透明；可搭配柔和 Brand soft 面 |
| **是否透明** | **是** |
| **是否 Hero 專用** | **否** |
| **禁止事項** | 不可表現為錯誤／當機；不可使用旋轉 Loading GIF 取代角色規範（Loading 另屬 UI） |

### 2.4 Success

| 欄位 | 定義 |
|------|------|
| **用途** | 任務完成、達標、正向回饋 |
| **使用頁面** | 今日任務完成 · 簽核完成回饋 · success-state 空態替代 |
| **目標檔名** | `ai-sisi-success.png` |
| **尺寸（建議）** | Master 1024×1024；UI 88–140px 高 |
| **建議背景** | 透明；狀態色由 UI token（`--zcx-ok`）提供，不燒進圖 |
| **是否透明** | **是** |
| **是否 Hero 專用** | **否** |
| **禁止事項** | 不可過度慶祝（留給 Celebrate）；不可綠底實心方塊當背景 |

### 2.5 Warning

| 欄位 | 定義 |
|------|------|
| **用途** | 需注意、待處理、非阻斷警示 |
| **使用頁面** | 待簽核提醒 · 業績未回報 · warning-state |
| **目標檔名** | `ai-sisi-warning.png` |
| **尺寸（建議）** | Master 1024×1024；UI 88–140px 高 |
| **建議背景** | 透明；UI 使用 `--zcx-warn` 語意，不燒進角色 |
| **是否透明** | **是** |
| **是否 Hero 專用** | **否** |
| **禁止事項** | 不可與 Error 混淆（無崩潰感）；不可血腥／驚嚇表情 |

### 2.6 Error

| 欄位 | 定義 |
|------|------|
| **用途** | 失敗、阻斷、需立即處理 |
| **使用頁面** | 同步失敗 · 權限拒絕輔助說明 · 嚴重狀態卡 |
| **目標檔名** | `ai-sisi-error.png` |
| **尺寸（建議）** | Master 1024×1024；UI 88–140px 高 |
| **建議背景** | 透明；UI 使用 `--zcx-alert` |
| **是否透明** | **是** |
| **是否 Hero 專用** | **否** |
| **禁止事項** | 不可玩笑化嚴重錯誤；不可取代系統錯誤文案 |

### 2.7 Celebrate

| 欄位 | 定義 |
|------|------|
| **用途** | 里程碑、全數完成、特別表彰 |
| **使用頁面** | 全日任務清零 · Academy 里程碑 · 活動結算（未來） |
| **目標檔名** | `ai-sisi-celebrate.png` |
| **尺寸（建議）** | Master 1024×1024（可略高）；UI 100–160px 高 |
| **建議背景** | 透明；彩帶／粒子若需要應極克制且可裁切 |
| **是否透明** | **是** |
| **是否 Hero 專用** | **否**（可短暫出現在 Hero 區，但非 Hero 專屬檔） |
| **禁止事項** | 不可每日常駐；不可廉價貼紙風／Emoji 拼貼 |

### 2.8 Sleep

| 欄位 | 定義 |
|------|------|
| **用途** | 離線、休息時段、無任務、夜間模式提示 |
| **使用頁面** | 無待辦 empty-state · 維護提示輔助 · 非營業時段（未來） |
| **目標檔名** | `ai-sisi-sleep.png` |
| **尺寸（建議）** | Master 1024×1024；UI 88–140px 高 |
| **建議背景** | 透明；避免大面積黑夜燒進圖檔 |
| **是否透明** | **是** |
| **是否 Hero 專用** | **否** |
| **禁止事項** | 不可顯得「系統死亡」；不可用於 Error |

---

## 3. Hero 專用說明

| 項目 | 規範 |
|------|------|
| **現行檔** | `ui/assets/brand/ai-sisi-hero.png`（**不得改名**） |
| **用途** | Mobile Home Corporate Hero 主視覺角色 |
| **是否 Hero 專用** | **是** |
| **尺寸** | 現行 1254×1254 RGBA；顯示約 100–132px 寬（依 ZCX-002） |
| **建議背景** | 透明；置於 `--zcx-hero-home-bg` 企業藍層次上 |
| **與 Normal 關係** | Hero 可為構圖加強版（更大安全區／面向文字側）；Normal 為通用卡用 |
| **禁止** | 白底框；文字被角色遮擋；霓虹描邊燒進檔案 |

程式中歷史別名（attention／critical／completed）屬舊四態命名；**新官方 Pose 以本文件 8 Pose 為準**。遷移時再對照，不在本輪改 code。

| 舊（程式註解） | 建議對照 |
|----------------|----------|
| normal | Normal |
| attention | Warning 或 Thinking（依文案） |
| critical | Error |
| completed | Success 或 Celebrate |

---

## 4. Naming Rule（Illustration Naming Rule）

### 4.1 AI 絲絲 Pose

```
ai-sisi-{pose}.{ext}
```

| Pose key | 目標檔名 |
|----------|----------|
| normal | `ai-sisi-normal.png` |
| welcome | `ai-sisi-welcome.png`（新製）；現行 `ai-sisi-welcome.jpg` 保留 |
| thinking | `ai-sisi-thinking.png` |
| success | `ai-sisi-success.png` |
| warning | `ai-sisi-warning.png` |
| error | `ai-sisi-error.png` |
| celebrate | `ai-sisi-celebrate.png` |
| sleep | `ai-sisi-sleep.png` |
| hero（特例） | `ai-sisi-hero.png`（既有，Hero 專用） |

規則：

- 全小寫 · kebab-case · 前綴 `ai-sisi-`  
- 一 Pose 一主檔；不加 `v2`／日期於正式名  
- 候選稿用 `_wip`／Brand Center，不得進 runtime 名  
- **禁止**重新命名既有正式 Runtime 檔

### 4.2 其他插圖（未來）

```
{domain}-{purpose}[-variant].png
```

例：`academy-empty.png` · `founder-brief.png` · `hr-empty-state.png`

---

## 5. Illustration Directory Guide

### 5.1 根目錄

```
ui/assets/illustrations/
├── README.md                 ← 本指南入口
├── hero/                     ← Hero 情境擴充（非正式改名 brand/hero）
├── academy/
├── founder/
├── ai/                       ← 絲絲／小天 curation 中繼（進 brand 前）
├── empty-state/
├── success-state/
└── warning-state/
```

### 5.2 路徑職責

| 目錄 | 用途 | 是否 Runtime |
|------|------|----------------|
| `ui/assets/brand/` | **唯一**正式接線品牌／角色檔 | **是** |
| `ui/assets/illustrations/ai/` | Pose 候選／審核通過待搬運 | 否 |
| `ui/assets/illustrations/hero/` | Hero 構圖變體草稿 | 否 |
| `ui/assets/illustrations/academy/` | 學院情境插圖 | 否→核准後可引用 |
| `ui/assets/illustrations/founder/` | Founder 情境插圖 | 否→核准後可引用 |
| `ui/assets/illustrations/empty-state/` | 空態插圖 | 否→核准後可引用 |
| `ui/assets/illustrations/success-state/` | 成功態插圖 | 否→核准後可引用 |
| `ui/assets/illustrations/warning-state/` | 警示態插圖 | 否→核准後可引用 |

**原則：** 產品 `index.html`／模組應優先引用 `ui/assets/brand/` 穩定檔名；`illustrations/` 為設計與中繼，避免 UUID 直連。

### 5.3 晉升流程（未來執行，非本輪）

1. Brand Center 候選 → curation  
2. 放入 `illustrations/ai/` 並用官方命名  
3. Founder 驗收  
4. 複製／發布至 `ui/assets/brand/`（**不改既有正式檔名**）  
5. 產品輪次再改引用（另開任務）

---

## 6. Future Expansion

| 優先 | 項目 |
|------|------|
| P0 | 補齊 8 Pose PNG（透明）進 `brand/` 或經 illustrations 晉升 |
| P0 | Welcome JPG → 透明 PNG 重製（新檔名 `ai-sisi-welcome.png`，舊 JPG 保留至遷移完成） |
| P1 | Home 脫離「全態共用 hero」；依狀態切 Normal／Warning／Success… |
| P1 | empty-state／success-state／warning-state 非角色插圖 |
| P2 | Academy／Founder 專屬情境插圖 |
| P2 | AI 小天 Pose 表（另文件，不與絲絲混名） |

---

## 7. Compliance

| 檢查 | 本輪 |
|------|------|
| 僅規格／目錄指南 | ✅ |
| 未新增／修改／生成圖片 | ✅ |
| 未改名既有 Runtime | ✅ |
| 未改 index.html／Home／Academy／Logic | ✅ |

---

## 8. References

- `docs/03_Design/ZCX-B01_BRAND_ASSET_INVENTORY.md`  
- `docs/03_Design/ZDL-006_ICON_SYSTEM.md`  
- `ui/assets/illustrations/README.md`  
