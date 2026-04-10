# 60 Form Tree Controls Boundary Plan

> Plan Status: completed
> Last Reviewed: 2026-04-10; live renderer/runtime landed
> Source: `docs/components/input-tree/design.md`, `docs/components/tree-select/design.md`, `docs/components/tree/design.md`, `docs/components/select/design.md`, `docs/amis-types/form-advanced.d.ts`

## Purpose

本计划用于把 `input-tree` / `tree-select` 收口为 form field family，并明确它们与通用 `tree`、普通 `select`、以及结构层 `loop + recurse` 的边界。

## Current Baseline

- AMIS 已有成熟的 `input-tree` / `tree-select` 参考。
- Flux 当前已经把 `tree` 定位为通用树 UI renderer。
- 结构层也已存在 `loop + recurse` 的目标设计。
- 2026-04-10 live repo now includes `type: 'input-tree'` and `type: 'tree-select'` renderer support in `packages/flux-renderers-form/src/index.tsx`, `schemas.ts`, `renderers/tree-controls.tsx`, and `tree-options.ts`, with focused tests in `packages/flux-renderers-form/src/index.test.tsx`.

## Goals

- 冻结 `input-tree` / `tree-select` 作为独立 form field family。
- 明确它们与 `tree` / `select` / `loop + recurse` 的边界。
- 冻结首版字段基线，避免一次性吞下 AMIS 全量能力。

## Non-Goals

- 不要求立刻实现 renderer。
- 不要求首版支持 AMIS 的全部编辑/拖拽 API。
- 不要求立刻统一成单一内部 substrate 代码实现。

## Scope

### In Scope

- `docs/components/input-tree/design.md`
- `docs/components/tree-select/design.md`
- `docs/components/tree/design.md`
- `docs/components/index.md`
- `docs/components/roadmap.md`

### Out Of Scope

- runtime implementation unless separately requested
- tree editor / draggable tree UI full design

## Workstream 1 - Contract Freeze

Status: completed
Targets: docs listed above

- [x] freeze `input-tree` as embedded form tree field
- [x] freeze `tree-select` as popup form tree field
- [x] freeze boundaries versus `tree`, `select`, and `loop + recurse`
- [x] freeze minimal first-phase field set

Exit Criteria:

- [x] one reader can explain why AMIS tree references produce three Flux layers instead of one overloaded tree component

## Workstream 2 - Renderer Landing

Status: completed
Targets: form tree control schema/runtime/renderer/tests, representative docs/examples

- [x] add live schema/runtime support for `type: 'input-tree'` and `type: 'tree-select'`
- [x] implement the embedded and popup tree-field variants without collapsing them into generic `tree`
- [x] land the documented minimal first-phase field set
- [x] add focused tests and representative examples

Exit Criteria:

- [x] `input-tree` and `tree-select` exist as distinct form field renderers with the documented first-phase contract

## Validation Checklist

- [x] docs define `input-tree`
- [x] docs define `tree-select`
- [x] docs distinguish them from `tree`
- [x] docs distinguish them from `select`
- [x] roadmap reflects the grouped tree family view
- [x] runtime/renderer/test implementation exists for `type: 'input-tree'` / `type: 'tree-select'`

## Closure

Status Note: The field-family boundary is now backed by live embedded and popup tree field renderers that reuse the existing form presentation/validation path while staying distinct from visual `tree`.

Follow-up:

- none for this plan scope
