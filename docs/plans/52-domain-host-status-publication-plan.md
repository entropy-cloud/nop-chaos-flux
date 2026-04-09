# 52 Domain Host Status Publication Plan

> Plan Status: completed
> Last Reviewed: 2026-04-10
> Source: `docs/discussions/06-cross-store-data-driven-design.md`, `docs/architecture/action-interaction-state.md`, `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/flow-designer/runtime-snapshot.md`

## Purpose

本计划用于把 designer/spreadsheet/report-designer 这类复杂宿主的"内部 Host Projection + 外部 statusPath 摘要"规则收口为统一设计，并为后续实现预留清晰入口。

## Current Baseline

- 宿主内部 schema 片段已经能通过 `Host Projection` 读取 readonly snapshot。
- 写方向已经通过 namespaced actions 收口。
- 宿主外部跨 region / 跨宿主边界的只读观测，还缺统一的窄摘要发布面。

## Goals

- 明确复杂宿主属于 `Domain Host Owner`。
- 明确内部读取走 `Host Projection`，外部读取走 `statusPath`。
- 明确不新增 `publishScope` 这一平行字段名。
- 为 designer/spreadsheet/report-designer 的窄 summary DTO 设计留出实现计划。

## Non-Goals

- 不要求立刻实现所有 domain host 的 `statusPath`。
- 不要求把整份 host projection 提升为全局 scope。
- 不要求暴露 core/store/bridge 对象。

## Scope

### In Scope

- `docs/architecture/action-interaction-state.md`
- `docs/architecture/complex-control-host-protocol.md`
- `docs/components/designer-page/design.md`
- `docs/components/spreadsheet-page/design.md`
- `docs/components/report-designer-page/design.md`
- `docs/discussions/06-cross-store-data-driven-design.md`

### Out Of Scope

- domain host renderer 的完整代码实现
- 具体 summary DTO 全字段最终定稿

## Workstream 1 - Contract Freeze

Status: completed
Targets: docs listed above

- [x] freeze `Domain Host Owner` as a distinct owner classification
- [x] freeze internal `Host Projection` versus external `statusPath` split
- [x] freeze rejection of `publishScope` as a separate field name

Verified in:
- `docs/architecture/action-interaction-state.md`: `Domain Host Owner` row in taxonomy table, `Host Projection` vs `statusPath` split documented, `publishScope` not listed
- `docs/architecture/complex-control-host-protocol.md`: explicit `publishScope` rejection (line 112)
- `docs/discussions/06-cross-store-data-driven-design.md` Round 3 header: `publishScope` replaced by `statusPath`
- All three component docs §7 use `Domain Host Owner`, `Host Projection`, and `statusPath` language consistently

Exit Criteria:

- [x] docs explain the cross-store read story without inventing a second mechanism beside `statusPath`

## Workstream 2 - Summary DTO Direction

Status: completed
Targets: successor design docs or component docs

- [x] sketch narrow status-summary directions for flow-designer, spreadsheet-page, and report-designer-page
- [x] keep summary DTOs readonly and host-private-object-free

Verified in:
- `docs/components/designer-page/design.md` §4: `statusPath` for external summary, no host store exposure
- `docs/components/spreadsheet-page/design.md` §4, §7: same pattern
- `docs/components/report-designer-page/design.md` §4, §7: same pattern
- All three docs state internal reads via `Host Projection`, external reads via `statusPath`

Exit Criteria:

- [x] one reader can answer what should be published externally and what must remain host-internal

## Validation Checklist

- [x] docs define `Domain Host Owner`
- [x] docs distinguish `Host Projection` from `statusPath`
- [x] docs reject `publishScope`
- [x] discussion doc updated to current baseline
- N/A `pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` (docs-only plan)

## Closure

Status Note: All workstreams completed. Contract is stable in docs. Actual renderer-level `statusPath` implementation for each domain host is deferred to narrower per-host implementation plans.
