# 47 Form Status Visibility And Reserved Form Binding Plan

> Plan Status: completed
> Last Reviewed: 2026-04-10
> Source: `docs/architecture/form-validation.md`, `docs/architecture/action-interaction-state.md`, `docs/components/form/design.md`, `docs/examples/user-management-schema.md`
> Related: `docs/plans/46-user-management-schema-and-authoring-contract-alignment-plan.md`
> Related: `docs/plans/48-semantic-owner-status-surface-unification-plan.md`

## Purpose

本计划用于把 form 的 author-visible 状态读取面收口成一个简单直观的目标设计：

- form 内部读只读 `$form`
- form 外部读显式 `statusPath`

目标不是暴露底层 store，而是暴露 semantic-owner summary，让按钮 pending/disabled、外部 toolbar 状态、示例 authoring 与未来设计器都基于同一条稳定读面。

## Current Baseline

- `FormRuntime` 内部已经拥有 `submitting`、`validating`、`dirty`、`touched`、`visited`、`errors` 等状态。
- form 值已经通过 lexical form scope 参与普通数据绑定。
- 但 schema-visible 表达式还没有一条简单稳定的 form meta-state 读取面。
- 历史讨论里出现过 `$form`、host-provided flags、以及直接暴露底层对象的方向，但还没有收口成统一规范。

## Goals

- 为当前 form subtree 定义只读 `$form` 保留绑定。
- 为 form 外部观察者定义显式 `statusPath` summary publication。
- 明确 `$form` / `statusPath` 暴露的是 semantic summary，而不是 `FormRuntime` / store 原始对象。
- 让示例、按钮 pending 设计、以及 form 组件设计文档使用同一条 authoring 基线。

## Non-Goals

- 不暴露 `$store` 作为公开 schema 读取面。
- 不允许通过 form `id` / `name` 自动做隐式数据读取。
- 不把 `$form` 做成可调用方法集合。
- 不在本计划中把整份字段级 map 全量发布到外层 scope。

## Scope

### In Scope

- `docs/architecture/form-validation.md`
- `docs/architecture/action-interaction-state.md`
- `docs/components/form/design.md`
- `docs/references/flux-json-conventions.md`
- `docs/examples/user-management-schema.md`
- `packages/flux-renderers-form/src/schemas.ts`
- `packages/flux-renderers-form/src/renderers/form.tsx`
- expression binding / readonly summary plumbing under `packages/flux-react/` and `packages/flux-runtime/`

### Out Of Scope

- 通用 `$self` / `$field` / `$page` 特殊绑定家族的一次性定稿
- 通用 interaction tracking key 的完整实现
- generic button `loading` prop 的最终视觉 API

## Workstream 1 - Contract Freeze

Status: completed
Targets: `docs/architecture/form-validation.md`, `docs/architecture/action-interaction-state.md`, `docs/components/form/design.md`, `docs/references/flux-json-conventions.md`

- [x] freeze `$form` as a reserved readonly current-form binding
- [x] freeze `statusPath` as the cross-boundary readonly form-status publication path
- [x] freeze the minimal `FormStatusSummary` DTO shape and field names
- [x] document why `$store` is rejected as public authoring surface

Exit Criteria:

- [x] one reader can answer "form 内外分别如何读取状态" without reading runtime code
- [x] docs no longer imply that form `id` / `name` is a data-binding path

## Workstream 2 - Runtime Publication And Binding

Status: completed
Targets: `packages/flux-renderers-form/src/schemas.ts`, `packages/flux-renderers-form/src/renderers/form.tsx`, related runtime/expression plumbing

- [x] add `statusPath` to `FormSchema`
- [x] publish readonly form-status summary to `statusPath` when declared
- [x] inject readonly `$form` binding for expressions inside the active form subtree
- [x] ensure `$form` / `statusPath` stay data-only and cannot be used as command objects

Implementation notes:
- `FormStatusSummary` type added to `packages/flux-core/src/types/runtime.ts`
- `statusPath?: string` added to `FormSchema` in `packages/flux-renderers-form/src/schemas.ts`
- `$form` injected via scope overlay in `createManagedFormRuntime` (`packages/flux-runtime/src/form-runtime.ts`): `formScopeWithBinding` wraps the form scope, overriding `get`, `has`, `readOwn`, and `read` to include `$form` as a computed `FormStatusSummary`
- `statusPath` publication implemented in `FormRenderer` via a `useEffect` that subscribes to `currentForm.store` and writes the summary to `parentScope.update(statusPath, summary)` on every store change
- `submitCount` and `lastSubmitStatus` are deferred to a future plan (form store does not track these yet)

Exit Criteria:

- [x] `${$form.submitting}` works inside form subtree
- [x] `${formStatus.submitting}` works outside form subtree when `statusPath` is declared

## Workstream 3 - Example And Pending-State Adoption

Status: completed
Targets: `docs/examples/user-management-schema.md`, representative tests, related pending-state docs

- [x] update representative examples to use `$form.submitting` instead of ad hoc host flags for semantic form submit
- [x] update external-trigger examples to use `statusPath` when they need target form status
- [x] align pending-state guidance so semantic form submit references `$form` / `statusPath`

Exit Criteria:

- [x] representative examples no longer depend on undocumented form meta-state access
- [x] action/pending docs and example authoring tell the same story

## Validation Checklist

- [x] docs define `$form` as reserved readonly binding
- [x] docs define `statusPath` as readonly form-status publication path
- [x] docs explicitly reject `$store` as public schema binding
- [x] `user-management-schema` demonstrates `$form` and `statusPath`
- [x] focused verification for form submit pending/read-state works
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: All workstreams completed. `$form` and `statusPath` are both implemented.

Deferred:
- `submitCount` and `lastSubmitStatus` fields in `FormStatusSummary` require form store changes; deferred to a future plan.

Follow-up:
- generic interaction tracking can stay in `docs/architecture/action-interaction-state.md` and a separate future implementation plan
