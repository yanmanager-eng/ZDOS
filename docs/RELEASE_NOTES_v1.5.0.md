# ZDOS v1.5.0 Release Notes

**版本號：** ZDOS v1.5.0  
**發布日期：** 2026/07/30  
**狀態：** Release Candidate（程式包定版；Production Deploy 需另核准）

---

## 新功能

- **排班中心（UI-016）**：早／中／晚三段看板、智慧收合、全部展開／收合、固定識別色、去姓與重名全名、搜尋、長按資訊、今日定位、已到／未到、人力不足警示
- **排假中心（UI-017）**：月曆總覽、日期 Bottom Sheet、單頁新增、批次排假、Today、搜尋、長按編輯、今日／本月統計、人力風險燈號、假別統一色彩
- **維護頁（UI-999R）**：`MAINTENANCE_MODE` 閘道；正式版上線維護畫面（官方 Logo、AI 絲絲）
- **品牌**：使用者可見名稱統一為 **AI 絲絲**
- **開場**：正式 MP4 Boot Splash（Skip／失敗 fallback；與 Auth 並行）

## 修正

- 排班入口：`openSchedulingCenter` 導向 `hrHome` 看板（避免誤入排假月曆）
- 排班看板：跨班別去姓重名改顯示全名
- 代班／換班審核清單：納入 `failed`／`sync_failed` 別名
- Release：版本號統一為 `v1.5.0`；移除除錯用 Modal `console.log`

## 已知限制

- **班表 SoT** 仍為前端 `localStorage`（未啟用雲端 `schedules`）
- **推播**：通知中心可用；定時上班／下班／AI 提醒排程尚未綁定（`PENDING_SCHEDULER`）
- **AI 絲絲**：Rule-based／Demo State，非正式大型 AI
- **代班／換班**：換班／跨店雲端通知覆蓋不如代班完整
- **AUTH-005**：忘記工號 RPC 若遠端未套用 migration，該路徑可能失敗
- **舊檔**：倉庫仍保留 `index1_0_0.html`／`index1_0_1.html` 歷史檔（非執行入口）

## 維護模式操作

1. `ui/maintenance-config.js` → `window.MAINTENANCE_MODE = true` → 進入 `maintenance.html`
2. 設回 `false` → 恢復 `index.html` → Boot Splash → Login → Home

## 相關文件

- `CHANGELOG.md`
- `docs/RELEASE_CHECKLIST_v1.5.0.md`
- `docs/specs/ZDOS_v1.5_FINAL_FREEZE.md`
