# ZDOS v1.5.0 Release Checklist

**版本：** v1.5.0  
**日期：** 2026/07/30

## Release Blockers（RC-003）

### P0（必修 — 本 Sprint 已處理／需部署前再驗）

| ID | 項目 | 狀態 |
|----|------|------|
| P0-1 | 版本統一為 v1.5.0（無 v1.4.5 Beta） | ✅ 程式已統一 |
| P0-2 | 正式 Release Notes | ✅ `docs/RELEASE_NOTES_v1.5.0.md` |
| P0-3 | 維護頁納入產品線＋閘道 | ✅ UI-999R 檔案＋`index` gate |
| P0-4 | 工作區變更 Commit／Push | 🔄 本 Sprint 執行 |
| P0-5 | Beta／Prod Smoke（Login→Home／排班／排假／維護 ON/OFF） | ⏳ 需部署後真人／真機 |
| P0-6 | Runtime Console Error = 0（真機） | ⏳ 已清 debug log；需 Runtime 複驗 |

### P1（建議）

| ID | 項目 | 狀態 |
|----|------|------|
| P1-1 | 推播定時提醒完備 | 可延期至下一版 |
| P1-2 | 班表雲端 SoT | 可延期（刻意限制） |
| P1-3 | AUTH-005 遠端 migration 套用確認 | 建議發版前確認 |
| P1-4 | 清理 `index1_0_*.html` | 建議 |

### P2（可延期）

| ID | 項目 |
|----|------|
| P2-1 | AI 絲絲正式模型串接 |
| P2-2 | 代班／換班通知全覆蓋 |
| P2-3 | 內部資產檔名 `xiaotian` 更名 |

---

## 功能 Checklist

| 模組 | 結果 | 備註 |
|------|------|------|
| 首頁 | ✅ 程式就緒 | 待 Smoke |
| 登入 | ✅ 程式就緒 | 待 Smoke |
| 排班 | ✅ UI-016 | 待 Smoke |
| 排假 | ✅ UI-017 | 待 Smoke |
| 業績 | ✅ 雲端 sales | 待 Smoke |
| AI 絲絲 | 🟡 Demo／Rule-based | 已知限制 |
| 維護頁 | ✅ UI-999R | 待部署驗證 ON/OFF |
| 權限 | ✅ 模型存在 | 待權限矩陣 Smoke |
| Console | 🟡 Syntax PASS；Runtime 待驗 | 已移除 Modal debug log |
| Performance | 🟡 未量測通過 | 已知單檔體積風險 |
| RWD | 🟡 CSS 就緒 | 待真機 |

## Maintenance Flow

```
MAINTENANCE_MODE=true  → maintenance.html
MAINTENANCE_MODE=false → Boot Splash → Login → Home
```

預設：`false`（正常營運）。上線窗口改 `true`，完成後改回 `false` 並重新部署／快取更新。

## GO 條件

- [x] 版本號一致 v1.5.0  
- [x] Release Notes 完成  
- [x] 維護流程程式就緒  
- [ ] Commit／Merge 至發布分支  
- [ ] 部署環境 Smoke PASS  
- [ ] Runtime Console PASS  

**在 Smoke／Runtime 完成前：正式 Production GO = NO GO（Conditional）。**
