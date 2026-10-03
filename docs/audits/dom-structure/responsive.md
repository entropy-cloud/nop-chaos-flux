# dom-structure: responsive

> Package: flux-renderers-layout | Source: src/responsive-renderer.tsx:101-113 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-532-dom-structure-layout-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-responsive" data-slot="responsive-root" data-renderer="responsive" data-testid data-cid data-active-variant data-variant-count>`（每 variant body region；useIsMobile 运行时分支）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 根即壳 |
| D4 区域 slot | pass（fix landed） | 9 type 中唯一缺根 slot，W5 补 `responsive-root` |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Actions

- [x] responsive 根补 `data-slot="responsive-root"`

## Proof

- `src/dom-structure-contract.test.tsx`（responsive root anchors + root slot）
