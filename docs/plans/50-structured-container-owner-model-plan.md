# 50 Structured Container Owner Model Plan

> Plan Status: completed
> Last Reviewed: 2026-04-09
> Source: `docs/architecture/action-interaction-state.md`, `docs/components/tabs/design.md`, `docs/components/wizard/design.md`
> Related: `docs/plans/48-semantic-owner-status-surface-unification-plan.md`
> Related: `docs/plans/49-page-and-surface-status-ownership-plan.md`

## Purpose

本计划用于把 `tabs`、future `wizard`、future `sheet` 这类"容器但自带状态"的组件收口到统一 owner model，避免它们一部分被当 page 状态、一部分被当 surface 状态、一部分又发明新的特殊绑定。

## Current Baseline

- `tabs` 文档已经有较完整的 `valueOwnership` / `valueStatePath` 设计。
- `page` 已收口为 shell owner。
- `dialog` / `drawer` 已收口为 surface owner family。
- `action-interaction-state.md` 已经把 tabs/wizard/sheet 纳入 owner taxonomy 的 `Interaction Owner` 与组合 owner 分类。
- `docs/components/wizard/design.md` 已存在，明确了 wizard 是组合 owner（step switching = Interaction Owner，step commit = Semantic Lifecycle Owner），并定义了 `WizardStatusSummary`、`valueStatePath` vs `statusPath` 分工，以及拒绝过早引入 `$wizard` 的理由。

## Goals

- 明确 `tabs` 属于 interaction owner。
- 为 future `wizard` 定义 interaction owner + semantic lifecycle owner 的组合方向。
- 为 future `sheet` 定义"先判 owner family，再决定绑定名"的规则。
- 统一 `valueStatePath`、`statusPath`、future local bindings 的职责边界。

## Non-Goals

- 不要求马上实现 `wizard` renderer。
- 不要求马上实现 `sheet` renderer。
- 不要求立刻新增 `$tabs`。

## Scope

### In Scope

- `docs/architecture/action-interaction-state.md`
- `docs/components/tabs/design.md`
- `docs/components/wizard/design.md`
- follow-up references in `docs/components/index.md`

### Out Of Scope

- `wizard` / `sheet` 的完整字段清单
- tabs renderer 的具体运行时代码

## Workstream 1 - Tabs Classification

Status: completed
Targets: `docs/architecture/action-interaction-state.md`, `docs/components/tabs/design.md`

- [x] state that tabs is an interaction owner
- [x] state that tabs active state should not be lifted into page or surface state
- [x] state the difference between `valueStatePath` and optional `statusPath`

Exit Criteria:

- [x] readers can explain why tabs is neither page nor surface owner

## Workstream 2 - Future Wizard And Sheet Rules

Status: completed
Targets: `docs/architecture/action-interaction-state.md`

- [x] document wizard as likely composite owner
- [x] document sheet classification rule by owner family instead of by component name
- [x] reject automatic `$sheet` proliferation

Exit Criteria:

- [x] docs define one consistent future direction for structured containers

## Workstream 3 - Wizard Design Baseline

Status: completed
Targets: `docs/components/wizard/design.md`, `docs/architecture/action-interaction-state.md`

- [x] define wizard as composite owner rather than tabs/page variant
- [x] separate step switching from step commit semantics
- [x] define `valueStatePath` versus `statusPath` roles for wizard
- [x] reject eager `$wizard` until subtree-local demand is proven

Exit Criteria:

- [x] readers can explain why wizard navigation and wizard commit are different owner surfaces

## Validation Checklist

- [x] docs define `tabs` as interaction owner
- [x] docs distinguish `valueStatePath` from `statusPath` for structured containers
- [x] docs define wizard/sheet future direction without overcommitting to implementation
- [x] `docs/components/wizard/design.md` exists and defines composite owner model
- [x] focused doc audit completed
- N/A `pnpm typecheck` — no code changes in this plan
- N/A `pnpm build` — no code changes in this plan
- N/A `pnpm lint` — no code changes in this plan
- N/A `pnpm test` — no code changes in this plan

## Closure

Status Note: all three workstreams are complete. `action-interaction-state.md` classifies tabs as Interaction Owner and defines the future wizard/sheet classification rules. `tabs/design.md` has `valueStatePath` vs `statusPath` separation. `wizard/design.md` defines the composite owner model with step switching as Interaction Owner, step commit as Semantic Lifecycle Owner, and defers `$wizard` until subtree-local demand is proven.

Follow-up:

- concrete wizard/sheet renderer design can build on this owner model instead of reopening naming/ownership questions
