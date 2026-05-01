# 49 Page And Surface Status Ownership Plan

> Plan Status: completed
> Last Reviewed: 2026-04-09
> Source: `docs/architecture/action-interaction-state.md`, `docs/components/page/design.md`, `docs/components/dialog/design.md`, `docs/components/drawer/design.md`
> Related: `docs/plans/48-semantic-owner-status-surface-unification-plan.md`
> Related: `docs/plans/51-surface-owner-shared-contract-plan.md`

## Purpose

本计划用于把 page shell 状态与 dialog/drawer surface 状态的 ownership 收口清楚，避免后续把 `page` 用成万能状态桶，或把 dialog/drawer 分别发展出割裂的局部绑定协议。

## Current Baseline

- `page` 当前被定义为页面级根 renderer，但还没有正式的 page-lifecycle status surface。
- `dialog` / `drawer` 当前文档主要覆盖 open-state 和基本 regions，尚未收口外部状态读取面。
- 已经明确 form/source 的状态读面应走 `$form` + `statusPath` 与 `statusPath`。
- surface owner 的局部绑定是否需要、若需要是否应统一成 `$surface`，仍未冻结。
- `action-interaction-state.md` 已经有完整的 page/surface ownership 分离描述、`$surface` 方向声明、以及 dialog/drawer 不应上卷到 page 的明确规则。
- `page/design.md` 已明确 page 是 shell owner only。
- `dialog/design.md` 和 `drawer/design.md` 已明确使用 `$surface` 而不是 `$dialog` / `$drawer`。

## Goals

- 明确 `page` 只拥有 page shell 状态，不接管更具体 child owner 状态。
- 明确 `dialog` / `drawer` 作为同一类 surface owner 处理。
- 明确 surface 外部读取统一走 `statusPath`。
- 评估并冻结 future `$surface` 与 `$page` 的引入规则。

## Non-Goals

- 不要求立刻实现 page lifecycle schema。
- 不要求立刻实现 `$surface` 或 `$page`。
- 不要求在本计划中定义 confirm dialog/wizard drawer 的全部业务字段。

## Scope

### In Scope

- `docs/architecture/action-interaction-state.md`
- `docs/components/page/design.md`
- `docs/components/dialog/design.md`
- `docs/components/drawer/design.md`

### Out Of Scope

- dialog/drawer renderer 的完整实现
- page navigation/breadcrumb/toolbar 的完整 schema 设计
- generic tracked-operation runtime 细节

## Workstream 1 - Ownership Freeze

Status: completed
Targets: `docs/architecture/action-interaction-state.md`, `docs/components/page/design.md`, `docs/components/dialog/design.md`, `docs/components/drawer/design.md`

- [x] freeze the rule that `page` is shell owner only
- [x] freeze the rule that dialog/drawer are surface owners, not page-owned sub-status
- [x] freeze `statusPath` as the external read surface for page/surface owners

Exit Criteria:

- [x] docs no longer leave ambiguity about whether dialog/drawer state should be read from page

## Workstream 2 - Local Binding Rule

Status: completed
Targets: `docs/architecture/action-interaction-state.md`, successor plans if needed

- [x] decide whether page shell truly needs `$page`
- [x] decide whether dialog/drawer subtree-local state should converge on `$surface`
- [x] document that `$dialog` / `$drawer` proliferation is rejected unless a strong counterexample appears

Exit Criteria:

- [x] docs state one clear future direction for local shell/surface bindings

## Validation Checklist

- [x] docs define page as shell owner only
- [x] docs define dialog/drawer as surface owners
- [x] docs define `statusPath` as the external read surface for those owners
- [x] docs explain why `page` is not a universal status bucket
- [x] focused doc audit completed
- N/A `pnpm typecheck` — no code changes in this plan
- N/A `pnpm build` — no code changes in this plan
- N/A `pnpm lint` — no code changes in this plan
- N/A `pnpm test` — no code changes in this plan

## Closure

Status Note: both workstreams are complete. `action-interaction-state.md` explicitly defines page as shell owner, dialog/drawer as surface owners, `statusPath` as external read surface, and `$surface` as the only preferred future local binding direction. `page/design.md`, `dialog/design.md`, and `drawer/design.md` all reflect these rules.

Follow-up:

- if `$surface` proves necessary, implement it in a focused successor plan rather than widening this one
