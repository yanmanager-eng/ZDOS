# ZDOS 開發規範

1. 不可修改 localStorage Key 名稱。
2. 不可修改 Google Form URL 與 entry ID。
3. 不可修改登入流程。
4. 不可修改中華店與東港店現金公式。
5. 不可修改 salesRecords、inventoryRecords 結構。
6. 所有修改必須最小化。
7. 修改前先分析。
8. 修改後檢查 JavaScript 語法。
9. P0 Bug 可立即 Hotfix。
10. P1~P3 Bug 累積 5 個再更新。
11. 不可重新生成整個 index.html。
12. 優先修改現有程式，不重構。
13. 每次修改都要列出 Diff。
14. 修改完成後說明影響範圍。
15. 若可能造成白屏，先停止並提出方案。
16. **Store Registry 規則**：所有店別選單、篩選、報表等 UI 必須讀取 `STORE_REGISTRY`；禁止各模組寫死店別名稱或代碼。
17. **Shift Registry 規則（Rule #003）**：班別為分類（M/A/N），`timeRange` 不得視為實際上下班時間；工時由 Schedule / Shift Template 決定。
18. **排班跨店規則**：排班須依 `EMPLOYEE_REGISTRY.canCrossStore` 過濾；儲存前必須呼叫 `validateScheduleAssignment()`，店長／集團首腦不可繞過。
19. **Schedule Registry 規則**：排班資料須讀寫 `SCHEDULE_REGISTRY`（`zdos_schedule_registry_v1`）；禁止 UI 寫死班別、禁止直接使用 `EMPLOYEE_REGISTRY` 全量；員工須經 `getSchedulableEmployeesForStore()`，班別工時須讀 `SHIFT_TEMPLATE`；CRUD 的 `storeId` 須用排班中心目前選取門市（`getSchedulingViewStoreId()`）。
20. **排班門市切換**：僅帳號具雙店 membership（`store` + `store2` 皆 active）可見切換；單店使用者不可查看其他門市班表；切換後須重載該門市員工、Template 與排班，不可混入上一間店資料。
21. **Employee Registry 完整性**：`EMPLOYEE_REGISTRY` 須與 `DEFAULT_ACCOUNTS` 正式名單同步（27 人）；禁止以假資料充數；集團首腦須納入 Registry 且 `canSchedule = false`；跨店排班僅 `canCrossStore = true` 員工（如 DDP0001、DDP0017）。
22. **Baseline Schedule 規則（Feature-009A.2）**：正式營運排班 Baseline 以內嵌 `SCHEDULE_BASELINE_202607` 建立，首次載入合併至 `zdos_schedule_registry_v1`；**不是 Import Tool**；後續補齊僅更新 Baseline 陣列與 version，不得另建 CSV/Excel 匯入 UI。
