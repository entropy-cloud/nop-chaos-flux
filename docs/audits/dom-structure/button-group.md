# dom-structure: button-group

> Package: flux-renderers-layout | Source: src/button-group-renderer.tsx:100-109 + ui/button-group.tsx:30-38 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-532-dom-structure-layout-plan.md

## 结构图（根 → 首个内容）

- root = ui ButtonGroup `<div role="group" class="nop-button-group" data-slot="button-group-root" data-renderer="button-group" data-testid data-cid>`（renderer 的 slot 经 spread 覆盖 ui 默认 button-group——覆盖式命名登记）；每 item Button 带 button-group-item slot + 冻结 testid `{testid}-item-{key}`

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 根即 ui 组件元素（clone 章经透传落 DOM） |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 无中间层 |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | role=group |

## Proof

- 登记卡；行为由既有 button-group 测试覆盖
