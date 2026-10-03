# dom-structure: form

> Package: flux-renderers-form | Source: src/renderers/form.tsx:524-573（注册 form-definition.ts:98） | Audited: 2026-10-03 | Plan: docs/plans/2026-10-03-529-dom-structure-form-plan.md

## 结构图（根 → 首个内容）

- root `<section class="nop-form" data-renderer="form" data-testid data-cid data-form-mode/-static/-columns onKeyDown>`（外层 FormContext/ScopeContext/FormLayoutContext Provider 链，stamp 经 Provider 链下钻落 section）— 职责: 多区域分组 + 表单语义壳
  - `<div data-slot="form-body">` — 职责: 组件自身契约要求的布局作用域（gap/栅格），带 slot
  - form-actions(:553)/form-busy(-text :559,565) 均带 slot

## 维度判定

| 维度 | 判定 | 说明 / 证据 |
| D1 根身份 | pass | 无 wrap 键 → ensure stamp 经 Provider 链下钻落 section |
| D2 根自然性 | pass | section 语义元素 |
| D3 包装付租 | pass | form-body 纯 gap 层带 slot 且承担布局职责（W2 裁定保留） |
| D4 区域 slot | pass | body/actions/busy 全覆盖 |
| D5 无自带 frame | pass | |
| D6 canvas a11y | n-a | |

## Proof

- `src/__tests__/dom-structure-contract.test.tsx`（form owner root）
