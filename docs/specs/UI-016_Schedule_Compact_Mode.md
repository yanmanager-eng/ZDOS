# UI-016｜排班中心 Compact Mode（正式版）

## 範圍
- 僅 UI：`renderHrCenterHome` 今日排班總覽 → Compact List
- 沿用既有 SoT：`getSchedules()` / `getAttendanceRecords()` / `getLeaveRegistry()`
- 沿用 `getEmployeeColor(employeeId)`、UI-014C 長按 500ms Bottom Sheet

## 禁止（已遵守）
- 不修改排班邏輯、資料來源、權限、Supabase、班別規則
- 不 Deploy Production

## 驗收
1. 一畫面可顯示 ≥15 人（列高 40~44px）
2. 【今天】定位正常；今日日期藍色高亮
3. 搜尋姓名／工號立即定位
4. 長按 Bottom Sheet 正常；主管可見「編輯班表」「幫忙排假」
5. 固定識別色正常
6. 早／中／晚班收合正常（預設展開）
7. 統計（人數／已到／未到）來自共用 Snapshot
8. JS Syntax PASS


## UI-016A 迭代｜班別三段看板
- 排列：早／中／晚三塊看板，人名 chip wrap（色點＋姓名＋短時間）
- 細節仍靠長按 Bottom Sheet
- 其餘驗收項同 UI-016


## UI-016A+D 正式版｜A + D
1. 三段看板（早／中／晚）
2. 標題：班別、人數、已到／未到
3. 兩欄 Compact 人名；`getEmployeeColor`；去姓，重名全名
4. 長按 Bottom Sheet 不變
5. 依 `SHIFT_REGISTRY` 時段自動展開當前班別
6. 全部展開／全部收合／目前班別
7. 人力不足紅色警示
8. 今日跨店支援獨立區塊
9. 390px 手機優先；避免灰字牆
10. 不改 SoT／權限／資料來源
