# ZDOS v1.5 FINAL FREEZE

原則：穩定、完整、一致。禁止新增與正式版無關的大型功能；不改 Schema／Auth／既有 SoT。

**現行版本號：ZDOS v1.5.0**（見 `docs/RELEASE_NOTES_v1.5.0.md`）

## Phase 狀態

| Phase | 模組 | 完成率 | 狀態 |
|------|------|--------|------|
| 1 | 排班中心 UI-016 | 功能清單完成 | 程式就緒；待 Smoke |
| 2 | 排假中心 UI-017 | 功能清單完成 | 程式就緒；待 Smoke |
| 3 | 代班／換班 | ~75% | 已知限制（通知） |
| 4 | 推播中心 | ~35% | P1／可延期定時提醒 |
| 5 | AI 絲絲 | ~50% | Demo／Rule-based（已知限制） |
| 6 | 全系統驗收 | 進行中 | 待部署後 Smoke |

## 維護頁

UI-999R 已整合主產品線：`maintenance.html` + `ui/maintenance-config.js` + `index.html` gate。
