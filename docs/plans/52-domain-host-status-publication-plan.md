# 52 Domain Host Status Publication Plan

> Plan Status: proposed
> Last Reviewed: 2026-04-09
> Source: `docs/discussions/06-cross-store-data-driven-design.md`, `docs/architecture/action-interaction-state.md`, `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/flow-designer/runtime-snapshot.md`

## Purpose

本计划用于把 designer/spreadsheet/report-designer 这类复杂宿主的“内部 Host Projection + 外部 statusPath 摘要”规则收口为统一设计，并为后续实现预留清晰入口。

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

Status: planned
Targets: docs listed above

- [ ] freeze `Domain Host Owner` as a distinct owner classification
- [ ] freeze internal `Host Projection` versus external `statusPath` split
- [ ] freeze rejection of `publishScope` as a separate field name

Exit Criteria:

- [ ] docs explain the cross-store read story without inventing a second mechanism beside `statusPath`

## Workstream 2 - Summary DTO Direction

Status: planned
Targets: successor design docs or component docs

- [ ] sketch narrow status-summary directions for flow-designer, spreadsheet-page, and report-designer-page
- [ ] keep summary DTOs readonly and host-private-object-free

Exit Criteria:

- [ ] one reader can answer what should be published externally and what must remain host-internal

## Validation Checklist

- [ ] docs define `Domain Host Owner`
- [ ] docs distinguish `Host Projection` from `statusPath`
- [ ] docs reject `publishScope`
- [ ] discussion doc updated to current baseline

## Closure

Status Note: close this plan when domain-host status publication rules are stable in docs and any remaining implementation work is delegated to narrower plans.
