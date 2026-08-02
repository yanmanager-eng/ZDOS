# NEXT-001｜Capability Engine v0.1

## 目的

在不改變現有 ZDOS v1.5.0 行為、UI、權限結果與資料結構的前提下，建立未來 Founder Layer 與其他 Next 功能可共用的能力查詢層。

## 非目標

本階段不處理：

- 新 Auth
- 新角色系統
- Supabase 權限
- RLS
- Membership 改造
- Founder UI
- Founder Workspace
- Genesis
- AI Insight
- 現有中心權限替換

## 架構

```text
window.ZdosCapabilityTypes
        ↓
window.ZdosCapabilityRegistry
        ↓
window.ZdosCapabilityEngine
