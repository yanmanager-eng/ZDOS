# NEXT-004A｜ZD Academy Capability Core

## 目標

抽出 UI-018 能力學院的**核心能力引擎**（ZD Academy），供後續教材／考試／術科／UI 重構使用。

本輪僅建立：

1. Capability Schema  
2. Capability Registry  
3. Prerequisite Engine  
4. Capability Version Engine  

## 非目標

- UI／View／入口  
- 教材、考試、術科  
- Learning Path Engine（屬後續票）  
- 改寫 `index.html` 內既有 `ABILITY_*` 執行路徑  
- 修改 Founder Capability（NEXT-001～003）  
- 修改 Production、Commit、Push、Deploy  

## 與 Founder Capability 的邊界

| 層 | 全域 | 語意 |
|----|------|------|
| Founder | `ZdosCapabilityTypes`／`ZdosCapabilityRegistry`／`ZdosCapabilityEngine` | 功能開關（founder／ai_brief…） |
| Academy | `ZdosAcademyCapabilitySchema`／`Registry`／`PrerequisiteEngine`／`VersionEngine` | 門市分項能力（newbie／sop…） |

兩者**不得混用資料模型**（Blueprint-002 §6）。

## 架構

```text
ZdosAcademyCapabilitySchema
        ↓
ZdosAcademyCapabilityRegistry
        ↓
ZdosAcademyPrerequisiteEngine
        ↓
ZdosAcademyVersionEngine
```

## 對齊規格

- Blueprint-001：能力學院為已上線產品；本輪只抽 Core  
- Blueprint-002 §5：`ABILITY_MATRIX`／等級 0～3／先修／`UNLOCK_LEVEL = 2`  
- Blueprint-003 §4.2：`zdos_ability_registry_v1`、abilityId 集合、先修門檻  
- 框架版本：`1.0.0`／`schemaVersion = 1`（UI-018 12 項基線）  

## 檔案

```text
core/zd-academy/
  capability-schema.js
  capability-registry.js
  prerequisite-engine.js
  version-engine.js
  capability-core-acceptance.js
```

## Acceptance

手動（不自動執行）：

```js
runZdosAcademyCapabilityCoreAcceptance()
```

## Rollback

移除 `core/zd-academy/*` 與 `index.html` 對應 `<script>`；不影響 UI-018／Founder／Production 資料。
