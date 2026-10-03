# dom-structure: page

> Package: flux-renderers-basic | Source: src/page.tsx:252-256 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-528-dom-structure-basic-plan.md

## 结构图（根 → 首个内容/交互元素）

- root `<section class="nop-page" data-renderer="page" data-testid data-cid>` — 职责: 多区域分组
  - 直接顺序排布 slot 区域（page-header/page-heading/page-subtitle/page-remark/page-extra/page-breadcrumb/page-toolbar/page-aside/page-body/page-footer/page-aside-toggle），无中间包装

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | basic-renderer-definitions.ts:28；data-renderer 经 527/528 stamp 通道 |
| D2 根自然性 | pass | section 语义元素 |
| D3 包装付租 | pass | 无中间包装层 |
| D4 区域 slot | pass | 12 个区域全带 data-slot |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | 非 canvas 容器 |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（page root anchor triple）
