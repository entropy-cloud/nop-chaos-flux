# 44 Semantic Lifecycle Entry Alignment Plan

> Plan Status: in progress
> Last Reviewed: 2026-04-09
> Source: `docs/architecture/frontend-programming-model.md`, `docs/architecture/frontend-programming-model-improvement-design.md`, `docs/architecture/form-validation.md`

## Purpose

本计划承接顶层编程模型中仍未完成的 `Semantic Lifecycle Entry` 收口工作。

目标不是重新设计 form runtime，而是把已经存在的 runtime semantic boundary 与 author-visible schema surface 对齐，让 `form` / `page` / `dialog` 这类语义节点拥有显式生命周期入口，而不是继续依赖分散在按钮或宿主事件里的业务 action graph。

## Current Baseline

- `FormRuntime.submit(...)`、`submitForm` built-in action、`component:submit` 等语义提交边界已经在运行时存在。
- validation-before-submit 也已经属于 form-owned runtime behavior，而不是 button-local helper。
- `packages/flux-renderers-form/src/schemas.ts` 现已暴露 `initAction` / `submitAction` / `onSubmitSuccess` / `onSubmitError` / `onValidateError`。
- `packages/flux-renderers-form/src/renderers/form.tsx` 现已把这些字段接到 form-owned runtime lifecycle：`initAction` 作为 activation-shaped entry，`submitAction` / `onSubmitSuccess` / `onSubmitError` / `onValidateError` 作为 semantic submit ownership。

## Problem

- schema authors 现在仍需要在 button `onClick`、toolbar trigger、inspector trigger 等位置重复描述提交流程，语义入口没有真正归属到 node-owned lifecycle surface。
- runtime 已经知道“什么是 form submit”，但 schema surface 还停留在较早期的 UI event wiring 形式。
- success/error follow-up 也还没有作为 form-owned lifecycle branch 收口到 schema contract，导致顶层 `Action Algebra` 语义与 lifecycle ownership 之间仍有最后一层脱节。

## Goals

- 先为 `form` 建立稳定的 author-visible semantic lifecycle surface。
- 明确 `submitAction` 与 validation-before-submit 的 ownership 关系。
- 让 success/error follow-up 与已落地的 `Action Algebra` result-class semantics 对齐。
- 保持按钮、快捷键、toolbar、host shell 触发器“只触发 semantic entry，不复制业务 graph”的方向。

## Non-Goals

- 不在本计划中一次性完成 page/dialog/host lifecycle 的全部 authoring DSL。
- 不重写现有 form runtime validation substrate。
- 不新增 primitive category；本计划只收口 derived runtime system 的 author-visible schema surface。
- 不把 semantic lifecycle 变成另一套通用 workflow language。

## Scope

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/frontend-programming-model-improvement-design.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/action-scope-and-imports.md`
- `packages/flux-renderers-form/src/schemas.ts`
- `packages/flux-renderers-form/src/renderers/form.tsx`
- `packages/flux-renderers-form/src/index.tsx`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/action-runtime.ts`
- related tests and representative form schemas

## Proposed Shape

Form-first baseline:

```ts
interface FormSchema extends BaseSchema {
  type: 'form';
  body?: BaseSchema[];
  actions?: BaseSchema[];
  data?: Record<string, any>;
  initAction?: ActionSchema | ActionSchema[];
  submitAction?: ActionSchema | ActionSchema[];
  onSubmitSuccess?: ActionSchema | ActionSchema[];
  onSubmitError?: ActionSchema | ActionSchema[];
  onValidateError?: ActionSchema | ActionSchema[];
}
```

Authoring rule:

- buttons and other triggers should prefer `component:submit` or equivalent semantic entry dispatch
- business request + success/error follow-up belong on the `form` node

## Execution Plan

**Phase 0 — Contract Freeze**

Targets: top-level docs, `form-validation.md`, `schemas.ts`

- confirm the form-first field set: `initAction`, `submitAction`, `onSubmitSuccess`, `onSubmitError`, `onValidateError`
- document which fields are initial scope-entry, semantic submit entry, validation failure branch, and submit result branches
- keep `actions` as compatibility surface until migration is defined

Exit criteria: one agreed field set with ownership rules and no ambiguity about success/error semantics.

**Phase 1 — Runtime Wiring**

Targets: `form.tsx`, `form-runtime.ts`, `action-runtime.ts`, related tests

- wire `submitAction` through existing form semantic submit path rather than ad hoc button-local dispatch
- run `onValidateError` when submit is blocked by validation
- run `onSubmitSuccess` and `onSubmitError` using the already-landed `Action Algebra` branch-result context
- preserve existing `component:submit` and `submitForm` behavior as the semantic entry carrier

Status: landed for the form-first baseline.

Implemented:

- `submitAction` now runs through the existing `FormRuntime.submit(...)` semantic submit path
- `onValidateError` now runs when semantic submit is blocked by validation failure
- `onSubmitSuccess` and `onSubmitError` now run as form-owned follow-up branches and can read `result` / `error` / `prevResult`
- `component:submit` remains the preferred thin trigger for external UI nodes

Exit criteria: one form-owned submit path drives validation, request dispatch, and success/error branching.

**Phase 2 — Compatibility And Migration**

Targets: docs, representative examples, tests

- define compatibility behavior for older form schemas that still script business flow in button `onClick`
- update examples to move business pipelines onto `form` lifecycle fields
- document when `actions` remains purely presentational region content versus lifecycle ownership

Exit criteria: new examples use form-owned semantic lifecycle entry by default.

**Phase 3 — Broader Lifecycle Follow-Up**

Targets: follow-up planning only

- assess whether `page` enter and `dialog` open should adopt the same author-visible lifecycle pattern
- defer implementation to follow-up plans once form baseline is stable

Exit criteria: page/dialog follow-up has explicit owner and does not block form baseline landing.

## Validation Checklist

- [x] `FormSchema` exposes explicit lifecycle entry fields
- [x] submit-time validation failure can trigger `onValidateError`
- [x] successful submit can trigger `onSubmitSuccess`
- [x] failed submit can trigger `onSubmitError`
- [x] lifecycle follow-up expressions can read `result` / `error` / `prevResult`
- [x] representative button triggers dispatch semantic form submit instead of duplicating business graph
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [x] relevant tests

## Success Criteria

本计划完成后，`form` 在 author-visible schema surface 上应当真正拥有自己的语义生命周期入口。

届时：

- 按钮/快捷键/toolbar 触发器只负责触发 semantic entry
- 提交前校验、提交动作、成功分支、失败分支都归 `form` 节点所有
- 顶层 `Semantic Lifecycle Entry` 文档不再停留在“runtime 有边界但 schema 没有入口”的半完成状态
