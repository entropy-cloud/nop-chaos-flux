# 59 Tree Visual Renderer Boundary Plan

> Plan Status: completed
> Last Reviewed: 2026-04-10; live renderer/runtime landed
> Source: `docs/components/tree/design.md`, `docs/components/recurse/design.md`, `docs/components/loop/design.md`, `docs/amis-types/form-advanced.d.ts`

## Purpose

本计划用于把 `tree` 收口为带 UI 的层级集合 renderer，并明确它与 `loop` / `recurse` / future `input-tree` / `tree-select` 的边界。

## Current Baseline

- AMIS 中已有较强的 tree 参考，但主要集中在 form tree controls 与底层 Tree UI。
- Flux 当前已经把 `loop` / `fragment` / `recurse` 收口为无 UI 的结构层。
- 因此需要明确 `tree` 应该站在 UI renderer 层，而不是回头吞并结构原语职责。
- 2026-04-10 live repo now includes `type: 'tree'` registration and renderer support in `packages/flux-renderers-data/src/index.tsx`, `schemas.ts`, and `tree-renderer.tsx`, with focused tests in `packages/flux-renderers-data/src/index.test.tsx`.

## Goals

- 定义 `tree` 作为 visual hierarchical renderer。
- 明确 tree node scope 的默认规则。
- 明确 `tree` 与 future form tree controls 的边界。
- 明确 `tree` 与 `loop + recurse` 的职责分层。

## Non-Goals

- 不要求立刻实现 `tree` renderer。
- 不要求首版覆盖 AMIS tree 的全部编辑/拖拽能力。
- 不要求立刻实现 `input-tree` / `tree-select`。

## Scope

### In Scope

- `docs/components/tree/design.md`
- `docs/components/index.md`
- `docs/components/roadmap.md`

### Out Of Scope

- renderer code unless separately requested
- full form tree control design

## Workstream 1 - Contract Freeze

Status: completed
Targets: docs listed above

- [x] freeze `tree` as visual hierarchical renderer
- [x] freeze the boundary versus `loop + recurse`
- [x] freeze the boundary versus future `input-tree` / `tree-select`
- [x] freeze default node-scope bindings

Exit Criteria:

- [x] one reader can explain why AMIS tree references do not imply collapsing visual tree UI and structural recursion into one node

## Workstream 2 - Renderer Landing

Status: completed
Targets: tree schema/runtime/renderer/tests, representative docs/examples

- [x] add live schema/runtime support for `type: 'tree'`
- [x] implement the visual hierarchical renderer without collapsing structural recursion into the same node
- [x] publish the documented default node-scope bindings
- [x] add focused tests and one representative example

Exit Criteria:

- [x] `tree` renders as a visual hierarchical renderer and preserves the documented boundary versus `loop + recurse`

## Validation Checklist

- [x] docs define `tree`
- [x] docs distinguish `tree` from `loop` / `recurse`
- [x] docs distinguish `tree` from future form tree controls
- [x] roadmap mentions why tree is not yet P1 despite having AMIS references
- [x] runtime/renderer/test implementation exists for `type: 'tree'`

## Closure

Status Note: The visual boundary is now backed by a live tree renderer that keeps hierarchical UI concerns separate from the structural `loop + recurse` substrate while publishing documented node-scope bindings.

Follow-up:

- none for this plan scope
