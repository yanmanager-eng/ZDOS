# ZCX-B01｜ZDOS Brand Asset Inventory

**Status:** Design Support（非主線功能）  
**Workspace:** ZDOS-Next  
**Date:** 2026-08-03  

本文件依**現有專案資產實際盤點**，供 ZCX／ZDL 共用。  
不得把「六角金 Z」誤列為正式產品主 Logo。

---

## 1. 目錄結構（ZCX／ZDL 共用）

| 路徑 | 用途 | 本輪狀態 |
|------|------|----------|
| `ui/assets/brand/` | 正式／線上使用品牌資產 | **既有，已盤點，未覆蓋** |
| `ui/assets/icons/zdl/` | 官方 SVG Icon Set | **新建** |
| `ui/assets/illustrations/` | 插畫／情境圖預留 | **新建（空＋README）** |
| `ui/ZDOS Brand Center/` | 設計源檔／候選素材庫（非 runtime 路徑） | **既有，僅盤點** |
| `ui/assets/brand/ZDOS Brand Center拷貝/` | 備份目錄 | **既有**（含 `ai小天/`、`ＺＤＯＳ絲絲/` 等；非正式 runtime） |

---

## 2. 正式 Runtime 品牌資產（`ui/assets/brand/`）

| 資產 | 路徑 | 格式 | 尺寸 | 透明 | 手機適配 | 正式可用 | 需重製 | 說明 |
|------|------|------|------|------|----------|----------|--------|------|
| **Product Logo（正式產品主 Logo）** | `ui/assets/brand/zdos-product-logo.png` | PNG | 128×128 | 是（RGBA） | 是 | **是** | 可選（更高解析度／去黑底變體） | 電路科技藍 Z；favicon／Boot Splash 主 Logo |
| **Header Mark（六角金 Z）** | `ui/assets/brand/zdos-z-logo.svg` | SVG | viewBox 96×96 | 向量 | 是 | **是（標記用途）** | 否 | **不是**正式產品主 Logo；Login／Mobile Header 標記 |
| **AI 絲絲 Hero** | `ui/assets/brand/ai-sisi-hero.png` | PNG | 1254×1254 | 是 | 是 | **是** | 四態分離待補 | Home Hero 唯一角色圖 |
| **AI 絲絲 Welcome** | `ui/assets/brand/ai-sisi-welcome.jpg` | JPG | 480×480 | 否 | 是 | **是（Login）** | 建議轉 PNG 透明底 | Login Gate welcome figure |
| **AI 小天 Normal** | `ui/assets/brand/ai-xiaotian-normal.png` | PNG | 178×320 | 是 | 是 | **是（Boot fallback）** | 可選高清 | Boot Splash fallback 角色 |
| **Splash / Opening Video** | `ui/assets/brand/345.mp4` | MP4 | ~6.77s / ~3.6MB | n/a | 是 | **是** | 否 | Brand Opening 主路徑 |

### 2.1 Logo 使用規範（摘要）

| 用途 | 應使用 | 禁止 |
|------|--------|------|
| Favicon／App Icon／Splash 主標 | `zdos-product-logo.png` | 六角金 Z 當產品主 Logo |
| Mobile Header 小標記 | `zdos-z-logo.svg`（現行）或後續統一 Product Mark | 隨意替換未核准資產 |
| Login 標記 | 現行 `zdos-z-logo.svg` | ChatGPT 匯出檔名圖 |
| 對外品牌主視覺 | Product Logo（電路 Z） | Neon Demo／第三方 Logo |

**明確聲明：**  
`zdos-z-logo.svg`（六角金 Z，aria-label: *ZhongDong hexagonal gold Z logo*）= **集團／產品標記（Mark）**。  
`zdos-product-logo.png`（電路科技藍 Z）= **正式產品主 Logo**。

---

## 3. AI 絲絲素材盤點

### 3.1 Runtime（正式接線）

| 檔案 | 使用處 | 狀態 |
|------|--------|------|
| `ai-sisi-hero.png` | Mobile Home Hero | 正式 |
| `ai-sisi-welcome.jpg` | Login Gate | 正式 |
| （註解預留）`ai-sisi-normal/attention/critical/completed.png` | Home AI 四態 | **尚未存在於 brand/**；程式暫全部指向 `ai-sisi-hero.png` |

### 3.2 設計庫（非 runtime）

路徑：`ui/ZDOS Brand Center/ai絲絲/`  

- 含大量候選 PNG（UUID 檔名）與 `_review/contact_sheet_aisisi.png`  
- **不可直接當正式路徑**（檔名不穩定、未 curation）  
- 需重製／挑選後再以穩定檔名放入 `ui/assets/brand/`

### 3.3 禁止

- 不得自行替換正式 `ai-sisi-hero.png`  
- 不得把 Brand Center 候選圖直接寫進產品路徑  
- 不得使用 Emoji 代替角色圖  

---

## 4. AI 小天素材盤點

### 4.1 Runtime

| 檔案 | 使用處 | 狀態 |
|------|--------|------|
| `ai-xiaotian-normal.png` | Boot Splash fallback | 正式 |

### 4.2 設計庫（非 runtime）

路徑：`ui/ZDOS Brand Center/ai小天/`  

- `AI 小天 v1.0 Character Turnaround/`（三視圖候選）  
- `表情包/`（多表情候選＋ `.webloc`）  

狀態：候選庫；未全部 curation；**不可直接當正式產品路徑**。

### 4.3 合體候選

路徑：`ui/ZDOS Brand Center/小天＆絲絲/` — 行銷／情境候選，非正式 runtime。

---

## 5. Hero／Splash／App Icon

| 類型 | 實際資產 | 正式可用 | 備註 |
|------|----------|----------|------|
| Hero 圖（角色） | `ai-sisi-hero.png` | 是 | Home Corporate Hero |
| Splash Video | `345.mp4` | 是 | 創辦人 Opening |
| Splash 靜態 Logo | `zdos-product-logo.png` | 是 | Video 失敗 fallback |
| Splash 角色 fallback | `ai-xiaotian-normal.png` | 是 | 程式 alt 文字曾誤標「絲絲」，資產本身為小天 |
| App Icon／Favicon | `zdos-product-logo.png`（`<link rel="icon">`） | 是 | 128px；建議後續補 180／512 |
| 獨立 App Icon set | — | **否／缺失** | 需重製（apple-touch-icon 等） |

---

## 6. 設計庫其他 Logo 文字

| 資產 | 路徑 | 正式可用 | 備註 |
|------|------|----------|------|
| LOGO 文字圖 | `ui/ZDOS Brand Center/ＬＯＧＯ文字.png` | **否（候選）** | 1536×1024 RGB 無透明；非正式 runtime |
| ChatGPT 匯出圖 | `ui/ZDOS Brand Center/ChatGPT Image …png` | **禁止正式使用** | 檔名／來歷不適合產品路徑 |

---

## 7. Icon System（本輪新增）

路徑：`ui/assets/icons/zdl/`  

規格見：`docs/03_Design/ZDL-006_ICON_SYSTEM.md`

最小集合：home · people · schedule · sales · academy · ai · report · notification · settings · back · chevron-right · check-circle · lock · progress · warning · success

---

## 8. 禁止使用項目

1. 將 **六角金 Z**（`zdos-z-logo.svg`）宣傳為「正式產品主 Logo」  
2. ChatGPT 匯出原始檔名圖進入 runtime  
3. Brand Center UUID 候選圖未 curation 即上線  
4. Emoji 充當官方 Icon／角色  
5. 第三方品牌 Icon／大型 Icon Library  
6. Neon／Demo 臨時 Logo 覆蓋正式 Product Logo  
7. 自行重畫或替換 AI 絲絲正式 Hero  
8. 建立第二套品牌色（沿用 ZCX／ZDL／`--zds-*`）

---

## 9. 後續建議（非本輪執行）

| 優先 | 項目 |
|------|------|
| P1 | AI 絲絲四態 PNG：normal／attention／critical／completed |
| P1 | App Icon 多尺寸（180／192／512） |
| P2 | Product Logo 透明底淺色／深色雙變體 |
| P2 | Welcome 圖 JPG → 透明 PNG |
| P3 | Brand Center 候選 curation → 穩定檔名進 `brand/` |

---

## 10. Production Isolation

- 本盤點與新增僅限 **ZDOS-Next**  
- 未修改 Production（`ZDOS/`）  
- 未覆蓋任何既有 `ui/assets/brand/` 正式檔  
