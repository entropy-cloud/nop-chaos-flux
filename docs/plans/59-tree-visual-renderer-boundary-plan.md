# 59 Tree Visual Renderer Boundary Plan

> Plan Status: proposed
> Last Reviewed: 2026-04-09
> Source: `docs/components/tree/design.md`, `docs/components/recurse/design.md`, `docs/components/loop/design.md`, `docs/amis-types/form-advanced.d.ts`

## Purpose

本计划用于把 `tree` 收口为带 UI 的层级集合 renderer，并明确它与 `loop` / `recurse` / future `input-tree` / `tree-select` 的边界。

## Current Baseline

- AMIS 中已有较强的 tree 参考，但主要集中在 form tree controls 与底层 Tree UI。
- Flux 当前已经把 `loop` / `fragment` / `recurse` 收口为无 UI 的结构层。
- 因此需要明确 `tree` 应该站在 UI renderer 层，而不是回头吞并结构原语职责。

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

Status: planned
Targets: docs listed above

- [ ] freeze `tree` as visual hierarchical renderer
- [ ] freeze the boundary versus `loop + recurse`
- [ ] freeze the boundary versus future `input-tree` / `tree-select`
- [ ] freeze default node-scope bindings

Exit Criteria:

- [ ] one reader can explain why AMIS tree references do not imply collapsing visual tree UI and structural recursion into one node

## Validation Checklist

- [ ] docs define `tree`
- [ ] docs distinguish `tree` from `loop` / `recurse`
- [ ] docs distinguish `tree` from future form tree controls
- [ ] roadmap mentions why tree is not yet P1 despite having AMIS references

## Closure

Status Note: close this plan when tree boundary rules are stable in docs and any implementation work is delegated to a narrower renderer plan.
