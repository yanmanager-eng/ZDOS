# ZDL-006｜ZDOS Icon System

**Status:** Design Support  
**Related:** ZDL-001 Design Language · ZCX-B01 Brand Asset Support  
**Path:** `ui/assets/icons/zdl/`

---

## 1. 目標

提供 ZDOS 官方最小 SVG Icon Set，供 Home／Academy／Founder／HR／排班／業績等中心共用。  
本階段**只建立資產與規範**，不改產品功能邏輯、不強制替換既有 inline SVG。

---

## 2. 基礎規格

| 項目 | 規格 |
|------|------|
| ViewBox | `0 0 24 24`（全套一致） |
| 預設繪製尺寸 | 20×20（列表／Nav）· 24×24（標準）· 28×28（強調） |
| Stroke | `1.8` |
| Cap / Join | `round` / `round` |
| Fill | 預設 `none`（線框圓角風格） |
| Color | `stroke="currentColor"` — 由父層 CSS 控制 |
| 風格 | 圓角、企業科技、低裝飾 |
| 格式 | 純 SVG XML；無 script／無 base64／無外部依賴 |

---

## 3. 顏色規則

| 情境 | 顏色 |
|------|------|
| Inactive（Bottom Nav／次要） | `--zcx-text-muted` / `#8494A7` |
| Active／Brand | `--zcx-brand-primary` / `#0B4F8C` |
| On light surface | 繼承文字色或 Brand |
| On dark workspace | `#E2E8F0` 或 Brand Sky（克制使用） |
| Success | `--zcx-ok` / `#147A45` |
| Warning | `--zcx-warn` / `#A67C00` |
| Alert | `--zcx-alert` / `#C62828` |

**禁止：** Icon 內硬寫霓虹色、漸層描邊（除特殊品牌資產）、第三方品牌色。

---

## 4. Active／Inactive

- Inactive：muted 灰藍  
- Active：品牌主藍＋可選 soft 背景（見 `.zcx-bottom-nav__item.is-active`）  
- 同一 Icon 檔服務兩態；**不**為 active 另存填色檔（除非未來實心變體規範核准）

---

## 5. 觸控區

| 用途 | Icon 視覺 | 最小觸控 |
|------|-----------|----------|
| Bottom Nav／Header 按鈕 | 20–24px | **44×44px** |
| 列表列尾 chevron | 16–20px | 列高 ≥ 44px |
| 內文狀態 | 16–18px | 隨文，不單獨當唯一熱區 |

---

## 6. 深色／淺色背景

| 背景 | 建議 |
|------|------|
| Corporate Light（Home／ZCX） | `currentColor` → 深字／主藍 |
| Workspace Dark | `currentColor` → 淺字 `#E2E8F0` |
| 狀態 Icon | 使用語意色 token，勿依賴背景對比失敗 |

---

## 7. 命名規則

```
ui/assets/icons/zdl/{name}.svg
```

- 全小寫  
- 單字直接命名：`home.svg`  
- 複合用連字號：`check-circle.svg`、`chevron-right.svg`  
- 不用前綴 `icon-`、不用 camelCase、不用底線  
- 一檔一語意；不把狀態塞進檔名（如 `home-active.svg`）除非另開變體規範

### 最小官方集合（ZCX-B01）

| 檔名 | 語意 |
|------|------|
| `home.svg` | 首頁 |
| `people.svg` | 人力／人員 |
| `schedule.svg` | 排班／行程 |
| `sales.svg` | 業績 |
| `academy.svg` | 學院／能力 |
| `ai.svg` | AI 絲絲／智慧建議 |
| `report.svg` | 報表／文件 |
| `notification.svg` | 通知 |
| `settings.svg` | 設定 |
| `back.svg` | 返回 |
| `chevron-right.svg` | 前進／更多 |
| `check-circle.svg` | 完成勾選 |
| `lock.svg` | 鎖定／權限 |
| `progress.svg` | 進度 |
| `warning.svg` | 警示 |
| `success.svg` | 成功 |

---

## 8. SVG 使用方式

### 8.1 Inline（建議：可 `currentColor`）

```html
<button class="zcx-bottom-nav__item" aria-label="首頁">
  <!-- paste or inject home.svg paths -->
</button>
```

### 8.2 `<img>`（簡單，但難改色）

```html
<img src="ui/assets/icons/zdl/home.svg" width="24" height="24" alt="">
```

### 8.3 CSS Mask（可改色）

```css
.icon-home {
  width: 24px;
  height: 24px;
  background: currentColor;
  -webkit-mask: url("../../assets/icons/zdl/home.svg") center / contain no-repeat;
  mask: url("../../assets/icons/zdl/home.svg") center / contain no-repeat;
}
```

本階段不強制接入產品；由各中心 UI 輪次逐步採用。

---

## 9. Accessibility

- 裝飾性 Icon：`aria-hidden="true"`，由按鈕／標題提供名稱  
- 單獨傳達意義：提供 `aria-label` 或可見文字  
- 不依賴「僅靠顏色」區分狀態；搭配文字／badge  
- 對比：Active／文字需符合可讀性（企業淺藍底＋主藍）

---

## 10. 禁止事項

1. **禁止 Emoji 混用**作為官方 Icon 替代  
2. 禁止導入 Font Awesome／Material／Heroicons 等大型 Library  
3. 禁止第三方品牌 Icon  
4. 禁止在 SVG 內嵌 `<script>`、base64、外部網路資源  
5. 禁止任意 viewBox／stroke 不一致擴充  
6. 禁止本輪修改產品邏輯以「強制換 Icon」

---

## 11. 與 ZCX／ZDL 關係

| 系統 | 關係 |
|------|------|
| ZDL-001 | 顏色／間距／圓角 token 來源 |
| ZCX-001／002 | Corporate UI 消費 `currentColor`＋Brand Primary |
| ZCX-B01 | 本 Icon 資產與 Inventory |

---

## 12. 驗收清單

- [x] 16 檔存在於 `ui/assets/icons/zdl/`  
- [x] viewBox 全為 `0 0 24 24`  
- [x] stroke `1.8` + `currentColor`  
- [x] XML 合法、無 script／base64／外部依賴  
- [x] 命名符合 kebab-case  
- [x] 未修改 index.html／業務邏輯  
