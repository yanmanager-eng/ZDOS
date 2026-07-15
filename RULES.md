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
