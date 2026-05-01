# 48 Semantic Owner Status Surface Unification Plan

> Plan Status: completed
> Last Reviewed: 2026-04-09
> Source: `docs/architecture/action-interaction-state.md`, `docs/architecture/form-validation.md`, `docs/architecture/api-data-source.md`, `docs/components/table/design.md`, `docs/components/data-source/design.md`
> Related: `docs/plans/47-form-status-visibility-and-reserved-form-binding-plan.md`
> Related: `docs/plans/49-page-and-surface-status-ownership-plan.md`
> Related: `docs/plans/50-structured-container-owner-model-plan.md`
> Related: `docs/plans/51-surface-owner-shared-contract-plan.md`
> Related: `docs/plans/52-domain-host-status-publication-plan.md`

> Note: 本计划是 Plan 47/49/50/51/52 的执行前提。这些子计划覆盖特定 owner 分类的细节，但都依赖本计划冻结的通用 owner taxonomy 和命名规则。本计划的所有 workstream 已随 `docs/architecture/action-interaction-state.md` 的收口完成。

## Purpose

本计划用于把"各种控件都有 loading/pending/state"收口成一条统一设计：

- 真正的状态 owner 负责发布只读状态摘要
- owner 外部统一通过 `statusPath` 读取
- owner 内部在确有必要时提供只读保留绑定作为 authoring sugar

目标不是给每个控件暴露自己的 store，而是让 form、data-source、table、dialog、以及未来 tracked operation 共享同一套状态暴露原则。

## Current Baseline

- `data-source` 已经有较成熟的 `statusPath` 设计。
- `form` 的目标设计已收口到 `$form` + `statusPath`。
- `table` 已经有 `paginationOwnership` / `selectionOwnership` / `*StatePath`，但缺少更高层的 owner-status 统一说明。
- generic async action 仍缺少统一 tracked-interaction contract。
- `action-interaction-state.md` 已经包含完整的 owner taxonomy 表格、CRUD 组合说明、`statusPath` vs `<axis>StatePath` 区分、tabs/wizard/sheet 分类、future reserved bindings 规则。

## Goals

- 定义 semantic-owner status 的通用模型，而不是逐控件发散命名。
- 明确 CRUD 是组合模式，不是单一状态 owner。
- 区分 `statusPath` 与 `<axis>StatePath` 的职责。
- 为 future `$table` / `$dialog` / tracked operation status surface 预留统一规则。
- 把 `tabs` / `wizard` / future sheet 归入统一 owner taxonomy，而不是继续发散例外。

## Non-Goals

- 不要求所有组件都必须提供局部保留绑定。
- 不要求把所有 loading 都折叠成一个全局 `page.loading`。
- 不要求立刻实现 generic tracked operation runtime。
- 不要求把普通按钮、普通输入框都升级成完整状态 owner。

## Scope

### In Scope

- `docs/architecture/action-interaction-state.md`
- `docs/architecture/api-data-source.md`
- `docs/architecture/form-validation.md`
- `docs/components/table/design.md`
- `docs/components/tabs/design.md`
- `docs/components/data-source/design.md`
- `docs/components/dialog/design.md`
- `docs/components/index.md`

### Out Of Scope

- 具体 tracked-operation schema 字段最终命名
- 表格 inline-edit、dialog confirm、wizard step 的全部细节字段设计
- host-specific global loading bar / shell spinner 策略

## Workstream 1 - Owner Taxonomy And Naming

Status: completed
Targets: `docs/architecture/action-interaction-state.md`, `docs/components/index.md`

- [x] define producer owner / semantic lifecycle owner / interaction owner / tracked operation taxonomy
- [x] add one quick owner taxonomy table that narrower component docs can cite directly
- [x] define when to use `statusPath` versus `<axis>StatePath`
- [x] define when local reserved bindings are justified and when they are not
- [x] place tabs/wizard/sheet into the same taxonomy instead of documenting them as one-off exceptions

Exit Criteria:

- [x] readers can classify form/table/source/dialog status without falling back to ad hoc names

## Workstream 2 - CRUD And Table Guidance

Status: completed
Targets: `docs/architecture/action-interaction-state.md`, `docs/components/table/design.md`, `docs/components/data-source/design.md`

- [x] document that CRUD is a composition of owners, not a single owner
- [x] document that table `loading` usually projects source/query owner state
- [x] document that table-owned interaction state remains separate from query/source loading state

Exit Criteria:

- [x] readers can explain why `usersStatus.loading` and `usersTableStatus.selectionCount` are different owners

## Workstream 3 - Future Reserved Bindings And Tracking

Status: completed
Targets: `docs/architecture/action-interaction-state.md`, `docs/components/dialog/design.md`, follow-up plans

- [x] define the rule for future local bindings such as `$table` / `$dialog`
- [x] define the rule for generic tracked operation status publication
- [x] link any remaining implementation work to successor plans instead of overloading this one

Exit Criteria:

- [x] docs state the rule for future owner-local bindings without forcing immediate implementation everywhere

## Validation Checklist

- [x] docs define one generalized owner-status model
- [x] docs distinguish `statusPath` from `<axis>StatePath`
- [x] docs state that CRUD is composite, not one monolithic owner
- [x] docs explain table loading ownership versus table interaction ownership
- [x] docs classify tabs/wizard/sheet using the same owner model
- [x] focused doc audit completed
- N/A `pnpm typecheck` — no code changes in this plan
- N/A `pnpm build` — no code changes in this plan
- N/A `pnpm lint` — no code changes in this plan
- N/A `pnpm test` — no code changes in this plan

## Closure

Status Note: all three workstreams are complete. `docs/architecture/action-interaction-state.md` now contains the full owner taxonomy table, CRUD composition guidance, `statusPath` vs `<axis>StatePath` naming rules, and the future reserved-binding rules for tabs/wizard/sheet/dialog. Narrower plans (47/49/50/51/52) build on this foundation.

Follow-up:

- concrete `$table` / `$dialog` / tracked-operation implementation can be planned separately after the shared model is frozen
