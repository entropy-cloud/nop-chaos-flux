# 47 Form Status Visibility And Reserved Form Binding Plan

> Plan Status: proposed
> Last Reviewed: 2026-04-09
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

Status: planned
Targets: `docs/architecture/form-validation.md`, `docs/architecture/action-interaction-state.md`, `docs/components/form/design.md`, `docs/references/flux-json-conventions.md`

- [ ] freeze `$form` as a reserved readonly current-form binding
- [ ] freeze `statusPath` as the cross-boundary readonly form-status publication path
- [ ] freeze the minimal `FormStatusSummary` DTO shape and field names
- [ ] document why `$store` is rejected as public authoring surface

Exit Criteria:

- [ ] one reader can answer “form 内外分别如何读取状态” without reading runtime code
- [ ] docs no longer imply that form `id` / `name` is a data-binding path

## Workstream 2 - Runtime Publication And Binding

Status: planned
Targets: `packages/flux-renderers-form/src/schemas.ts`, `packages/flux-renderers-form/src/renderers/form.tsx`, related runtime/expression plumbing

- [ ] add `statusPath` to `FormSchema`
- [ ] publish readonly form-status summary to `statusPath` when declared
- [ ] inject readonly `$form` binding for expressions inside the active form subtree
- [ ] ensure `$form` / `statusPath` stay data-only and cannot be used as command objects

Exit Criteria:

- [ ] `${$form.submitting}` works inside form subtree
- [ ] `${formStatus.submitting}` works outside form subtree when `statusPath` is declared

## Workstream 3 - Example And Pending-State Adoption

Status: planned
Targets: `docs/examples/user-management-schema.md`, representative tests, related pending-state docs

- [ ] update representative examples to use `$form.submitting` instead of ad hoc host flags for semantic form submit
- [ ] update external-trigger examples to use `statusPath` when they need target form status
- [ ] align pending-state guidance so semantic form submit references `$form` / `statusPath`

Exit Criteria:

- [ ] representative examples no longer depend on undocumented form meta-state access
- [ ] action/pending docs and example authoring tell the same story

## Validation Checklist

- [ ] docs define `$form` as reserved readonly binding
- [ ] docs define `statusPath` as readonly form-status publication path
- [ ] docs explicitly reject `$store` as public schema binding
- [ ] `user-management-schema` demonstrates `$form` and `statusPath`
- [ ] focused verification for form submit pending/read-state works
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: close this plan only when `$form` and `statusPath` are both implemented or any leftover work is explicitly moved to a successor plan.

Follow-up:

- generic interaction tracking can stay in `docs/architecture/action-interaction-state.md` and a separate future implementation plan
