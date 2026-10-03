# dom-structure: dynamic-renderer

> Package: flux-renderers-basic | Source: src/dynamic-renderer.tsx:242-302 | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-528-dom-structure-basic-plan.md

## 结构图（根 → 首个内容）

- root `<div class="nop-dynamic-renderer" data-renderer data-testid data-cid>`（error/loading/loaded/idle 四态同根）— 职责: 状态容器
  - loading/error 态内一层 slot div（dynamic-renderer-loading[role=status] / dynamic-renderer-error[role=alert]）

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 四分支均有根标记 |
| D2 根自然性 | pass | |
| D3 包装付租 | pass | 状态层带 slot + role |
| D4 区域 slot | pass | |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（dynamic-renderer root anchor triple）
