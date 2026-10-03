# dom-structure: collapse

> Package: flux-renderers-layout | Source: src/collapse-renderer.tsx:154-161,239（契约 :278-295） | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-532-dom-structure-layout-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-collapse" data-slot="collapse-root" data-renderer="collapse" data-testid data-cid>`；ui Collapsible 根带 collapse-item/trigger/content/tone-bar/leading/count slot；CollapsibleContent 内一层无 slot 的 padding div（:239）包 body

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | exempt | :239 padding 层为 ui 折叠内容区的间距职责（ui tone 体系内部结构），登记不回改 |
| D4 区域 slot | pass | title/body/leading + ui 全套 |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 collapse 测试覆盖
