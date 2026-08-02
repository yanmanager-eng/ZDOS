# ZDOS Official Illustrations — Directory Guide

**Spec:** `docs/03_Design/ZCX-B02_OFFICIAL_ILLUSTRATION_SYSTEM.md`  
**Inventory:** `docs/03_Design/ZCX-B01_BRAND_ASSET_INVENTORY.md`

## Purpose

Design / staging area for ZCX · ZDL shared illustrations.  
**Runtime brand & character files stay in** `ui/assets/brand/`.

## Planned layout

```
ui/assets/illustrations/
├── hero/            Hero composition drafts (not a rename of brand/ai-sisi-hero.png)
├── academy/         Academy scene illustrations
├── founder/         Founder Console scenes
├── ai/              AI 絲絲 / 小天 curation staging (official names before brand promote)
├── empty-state/     Empty-state illustrations
├── success-state/   Success-state illustrations
└── warning-state/   Warning-state illustrations
```

Directories exist as placeholders (`.gitkeep` only). **No image binaries in ZCX-B02.**

## Rules

1. Do **not** place production logos here.  
2. Do **not** drop uncured Brand Center UUID files as final names.  
3. Do **not** rename existing runtime files in `ui/assets/brand/`.  
4. AI 絲絲 pose target names: `ai-sisi-{normal|welcome|thinking|success|warning|error|celebrate|sleep}.png`  
5. Existing runtime keepers: `ai-sisi-hero.png`, `ai-sisi-welcome.jpg`.
