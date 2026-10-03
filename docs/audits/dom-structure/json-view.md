# dom-structure: json-view

> Package: flux-renderers-content | Source: src/json-view.tsx:30-88 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-533-dom-structure-content-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-json-view" data-renderer="json-view" data-testid data-cid>`（json-view-toolbar 条件 slot、json-view-empty、JsonViewer ui 树自带 slot）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | toolbar 层带 slot |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- 登记卡；行为由既有 json-view 测试覆盖
