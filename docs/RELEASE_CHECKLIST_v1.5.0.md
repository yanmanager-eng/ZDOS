# ZDOS v1.5.0 Release Checklist

**版本：** v1.5.0  
**日期：** 2026/07/30

## Smoke Test 紀錄（正式）

| 項目 | 結果 |
|------|------|
| Login | PASS |
| Logout | PASS |
| Schedule | PASS |
| Leave | PASS |
| Sales | PASS |
| Announcement | PASS |
| Maintenance ON | PASS |
| Maintenance OFF | PASS |
| Console | PASS |
| Chrome | PASS |
| Safari | PASS |
| iPhone | PASS |
| Android | PASS |
| Tester | ________________ |
| Date | ________________ |

> 上表結果由驗收方回報；Tester／Date 欄位請驗收人補填。

## Release Blockers

### P0

| ID | 項目 | 狀態 |
|----|------|------|
| P0-1 | 版本統一為 v1.5.0 | ✅ |
| P0-2 | 正式 Release Notes | ✅ |
| P0-3 | 維護頁 UI-999R | ✅ |
| P0-4 | Commit／Push 定版包 | ✅ |
| P0-5 | Smoke（含維護 ON/OFF） | ✅ PASS |
| P0-6 | Runtime Console | ✅ PASS |

### P1（建議／非阻擋正式 GO）

| ID | 項目 | 狀態 |
|----|------|------|
| P1-1 | 推播定時提醒完備 | 可延期 |
| P1-2 | 班表雲端 SoT | 可延期 |
| P1-3 | AUTH-005 遠端 migration 確認 | 建議 |
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
| 首頁 | ✅ PASS | Smoke |
| 登入 | ✅ PASS | Login／Logout |
| 排班 | ✅ PASS | Schedule |
| 排假 | ✅ PASS | Leave |
| 業績 | ✅ PASS | Sales |
| 公告 | ✅ PASS | Announcement |
| AI 絲絲 | 🟡 已知限制 | Demo／Rule-based（不阻擋本版 GO） |
| 維護頁 | ✅ PASS | ON／OFF |
| 權限 | ✅ 隨 Login／模組 Smoke | |
| Console | ✅ PASS | |
| RWD／Browser | ✅ PASS | Chrome／Safari／iPhone／Android |
| Performance | 🟡 可接受 | 無 Smoke 阻塞；單檔體積為已知限制 |

## Maintenance Flow

```
MAINTENANCE_MODE=true  → maintenance.html     ✅ PASS
MAINTENANCE_MODE=false → Boot → Login → Home ✅ PASS
```

## GO 條件

- [x] 版本號一致 v1.5.0  
- [x] Release Notes 完成  
- [x] 維護流程就緒  
- [x] 定版 Commit／Push  
- [x] Smoke PASS  
- [x] Runtime Console PASS  
- [ ] Merge 至正式發布分支／Production Deploy（需核准執行）

**Recommendation：GO**（已知限制見 `docs/RELEASE_NOTES_v1.5.0.md`；Production Deploy 另核准）
