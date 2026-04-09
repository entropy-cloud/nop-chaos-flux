# 56 Fragment Structural Grouping Node Plan

> Plan Status: proposed
> Last Reviewed: 2026-04-09
> Source: `docs/components/fragment/design.md`, `docs/components/loop/design.md`, `docs/architecture/scope-ownership-and-isolation.md`

## Purpose

本计划用于把 `fragment` 冻结为无 UI 的结构分组节点，解决“需要把多个节点整体应用 `when` / `data` / `isolate`，但又不想引入 `if` 或滥用 `container`”这一问题。

## Current Baseline

- 当前 DSL 已有 `when`，但缺少一个专门的无 UI 分组节点。
- `container` 已明确拥有容器/壳层语义，不适合作为纯虚拟分组的替代物。
- `loop` 这类结构节点也已经需要一个天然搭档来承接整体条件控制。

## Goals

- 冻结 `type: 'fragment'` 作为无 UI 结构分组节点。
- 明确保留 `when`，不引入平行的 `if` 组件。
- 明确 `fragment` 与 `container` 的边界。
- 明确 `fragment` 的 scope 规则：默认继承，可选 `data` / `isolate`。

## Non-Goals

- 不要求立刻实现 fragment renderer。
- 不要求 fragment 默认生成可视 DOM wrapper。
- 不要求引入新的视觉/布局语义。

## Scope

### In Scope

- `docs/components/fragment/design.md`
- `docs/components/loop/design.md`
- `docs/components/index.md`

### Out Of Scope

- JSX/runtime implementation unless separately requested
- condition DSL 的全面重写

## Workstream 1 - Contract Freeze

Status: planned
Targets: docs listed above

- [ ] freeze `fragment` as the no-UI grouping node
- [ ] freeze `when` + `fragment` as the preferred grouped condition pattern
- [ ] freeze rejection of `if` as a parallel condition component
- [ ] freeze the boundary between `fragment` and `container`

Exit Criteria:

- [ ] one reader can answer how to conditionally group multiple nodes without using `container`

## Validation Checklist

- [ ] docs define `fragment`
- [ ] docs reject `if` as a new parallel grouping DSL
- [ ] docs distinguish `fragment` from `container`
- [ ] loop doc references `fragment` for grouped conditions

## Closure

Status Note: close this plan when the structural grouping-node contract is stable in docs and any implementation work is delegated to a narrower renderer/runtime plan.
