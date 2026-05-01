# 51 Surface Owner Shared Contract Plan

> Plan Status: completed
> Last Reviewed: 2026-04-09
> Source: `docs/architecture/action-interaction-state.md`, `docs/components/dialog/design.md`, `docs/components/drawer/design.md`
> Related: `docs/plans/49-page-and-surface-status-ownership-plan.md`

## Purpose

本计划用于把 dialog/drawer/future sheet 的共享 surface owner 规则从各组件文档中抽成一个统一契约，避免后续每个组件重复解释同一套 open-state、statusPath、局部绑定和 owner 边界。

## Current Baseline

- dialog/drawer 都已经被归类为 surface owner。
- page 与 surface 的边界已在 active docs 中收口。
- `docs/architecture/surface-owner.md` 已存在，包含：`SurfaceStatusSummary` shape、`component:open`/`component:close` handles、`$surface` 统一方向、`statusPath` 外部读规则、ownership boundary、future sheet 分类规则、confirm/commit 分层规则。
- `dialog/design.md` 和 `drawer/design.md` 均已引用 surface owner 语义，使用 `$surface` 而非 `$dialog`/`$drawer`。

## Goals

- 提供一份可被 dialog/drawer/future sheet 共同引用的 surface-owner baseline。
- 明确 surface state 与内部 form/source/table 状态的边界。
- 冻结外部 `statusPath` 与 future `$surface` 的方向。

## Non-Goals

- 不要求立刻实现 dialog/drawer renderer。
- 不要求立刻实现 `$surface`。
- 不要求在本计划中设计 confirm dialog 的完整业务 API。

## Scope

### In Scope

- `docs/architecture/surface-owner.md`
- `docs/components/dialog/design.md`
- `docs/components/drawer/design.md`
- `docs/index.md`

### Out Of Scope

- dialog/drawer 运行时代码
- future sheet 的完整 schema 设计

## Workstream 1 - Shared Contract Freeze

Status: completed
Targets: `docs/architecture/surface-owner.md`, `docs/components/dialog/design.md`, `docs/components/drawer/design.md`

- [x] freeze the shared surface summary shape
- [x] freeze `component:open` / `component:close` as surface control handles
- [x] freeze `statusPath` as external surface read surface
- [x] freeze `$surface` as the only preferred future local binding direction

Exit Criteria:

- [x] dialog and drawer docs no longer need to explain the full shared rationale inline

## Validation Checklist

- [x] surface owner shared contract doc exists (`docs/architecture/surface-owner.md`)
- [x] dialog/drawer docs cite surface owner semantics directly
- [x] docs explain why surface state should not be lifted into `page`
- [x] docs explain why `$dialog` / `$drawer` are not preferred
- N/A `pnpm typecheck` — no code changes in this plan
- N/A `pnpm build` — no code changes in this plan
- N/A `pnpm lint` — no code changes in this plan
- N/A `pnpm test` — no code changes in this plan

## Closure

Status Note: `docs/architecture/surface-owner.md` is complete and covers all required items. `dialog/design.md` and `drawer/design.md` reference surface owner semantics. The shared contract is stable and future surface-like components can classify against it directly.

Follow-up:

- future `sheet` or similar components should classify against this contract before adding any new binding name
