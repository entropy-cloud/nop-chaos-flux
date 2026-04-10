# 56 Fragment Structural Grouping Node Plan

> Plan Status: completed
> Last Reviewed: 2026-04-10; live renderer/runtime landed
> Source: `docs/components/fragment/design.md`, `docs/components/loop/design.md`, `docs/architecture/scope-ownership-and-isolation.md`

## Purpose

本计划用于把 `fragment` 冻结为无 UI 的结构分组节点，解决“需要把多个节点整体应用 `when` / `data` / `isolate`，但又不想引入 `if` 或滥用 `container`”这一问题。

## Current Baseline

- 当前 DSL 已有 `when`，但缺少一个专门的无 UI 分组节点。
- `container` 已明确拥有容器/壳层语义，不适合作为纯虚拟分组的替代物。
- `loop` 这类结构节点也已经需要一个天然搭档来承接整体条件控制。
- 2026-04-10 live repo now includes `type: 'fragment'` registration and renderer support in `packages/flux-renderers-basic/src/index.tsx` and `fragment.tsx`, with focused tests in `packages/flux-renderers-basic/src/index.test.tsx`.

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

Status: completed
Targets: docs listed above

- [x] freeze `fragment` as the no-UI grouping node
- [x] freeze `when` + `fragment` as the preferred grouped condition pattern
- [x] freeze rejection of `if` as a parallel condition component
- [x] freeze the boundary between `fragment` and `container`

Exit Criteria:

- [x] one reader can answer how to conditionally group multiple nodes without using `container`

## Workstream 2 - Runtime Landing

Status: completed
Targets: compiler/render path, representative tests, examples

- [x] add live schema/compiler support for `type: 'fragment'`
- [x] render fragment children without introducing a visual wrapper by default
- [x] support grouped `when` / `data` / `isolate` behavior on fragment nodes
- [x] add focused tests for no-UI grouping behavior

Exit Criteria:

- [x] `fragment` can group multiple child nodes with no visual wrapper while preserving the documented scope rules

## Validation Checklist

- [x] docs define `fragment`
- [x] docs reject `if` as a new parallel grouping DSL
- [x] docs distinguish `fragment` from `container`
- [x] loop doc references `fragment` for grouped conditions
- [x] runtime/compiler/test implementation exists for `type: 'fragment'`

## Closure

Status Note: The no-UI grouping contract is now backed by a live basic renderer implementation that forwards grouped body rendering through region handles with optional `data` / `isolate` scope overrides.

Follow-up:

- none for this plan scope
