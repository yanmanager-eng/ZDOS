# ZDP-001｜ZDOS Development Platform MVP

## 目標

建立創辦人可於本機 DEV 使用的 Development Platform MVP，集中查看：

1. 今日待驗收
2. 最近完成
3. Founder Review（通過／修改／不通過）
4. Build 資訊

## 非目標

- 不修改 Production／Beta
- 不修改 Founder Console 功能／Guard／Flag
- 不新增 AI／後端
- 不新增假營運／假百分比資料

## 入口與 Guard

- Feature Flag：`ZDOS_DEV_PLATFORM`（memory，預設 false）
- 需 Capability Engine 啟用 + Founder Capability
- DEV：`ZdosDevPlatformDev.enable()` / `openWithTestContext()` / `disable()`

## 資料來源

- `core/devplatform/zdp-registry.js` 對齊 `INNOVATION_BACKLOG.md`
- Review 決策僅本機 memory，不寫既有 localStorage key

## UI

- `ui/zdp-platform.css`（scoped `[data-zdos-zdp-page]`）
- 沿用 ZDOS workspace／home card 語言，手機優先

## Acceptance

```js
runZdosDevPlatformAcceptance()
```

## Rollback

1. 關閉 `ZDOS_DEV_PLATFORM`
2. 移除 `core/devplatform/*`、`ui/zdp-platform.css` 與 index 引用／view 分支
3. 還原 Backlog  
不影響 Founder Console／NEXT-001～003A／Production
