# dom-structure: scope-debug

> Package: flux-renderers-basic | Source: src/scope-debug.tsx:104-108 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-528-dom-structure-basic-plan.md

## 结构图（根 → 首个内容）

- root `<section class="nop-scope-debug" data-renderer data-testid data-cid>` — 职责: 多区域分组
  - `<div data-slot="scope-debug-header">`（scope-debug-kind/title/toggle）、`<div data-slot="scope-debug-body">`（scope-debug-json）— 均带 slot

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | dev 工具，有实 DOM，不豁免 |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 2 层带 slot |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（scope-debug root anchor triple）
