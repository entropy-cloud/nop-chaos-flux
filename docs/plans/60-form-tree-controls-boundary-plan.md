# 60 Form Tree Controls Boundary Plan

> Plan Status: proposed
> Last Reviewed: 2026-04-09
> Source: `docs/components/input-tree/design.md`, `docs/components/tree-select/design.md`, `docs/components/tree/design.md`, `docs/components/select/design.md`, `docs/amis-types/form-advanced.d.ts`

## Purpose

本计划用于把 `input-tree` / `tree-select` 收口为 form field family，并明确它们与通用 `tree`、普通 `select`、以及结构层 `loop + recurse` 的边界。

## Current Baseline

- AMIS 已有成熟的 `input-tree` / `tree-select` 参考。
- Flux 当前已经把 `tree` 定位为通用树 UI renderer。
- 结构层也已存在 `loop + recurse` 的目标设计。

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

Status: planned
Targets: docs listed above

- [ ] freeze `input-tree` as embedded form tree field
- [ ] freeze `tree-select` as popup form tree field
- [ ] freeze boundaries versus `tree`, `select`, and `loop + recurse`
- [ ] freeze minimal first-phase field set

Exit Criteria:

- [ ] one reader can explain why AMIS tree references produce three Flux layers instead of one overloaded tree component

## Validation Checklist

- [ ] docs define `input-tree`
- [ ] docs define `tree-select`
- [ ] docs distinguish them from `tree`
- [ ] docs distinguish them from `select`
- [ ] roadmap reflects the grouped tree family view

## Closure

Status Note: close this plan when form tree control boundaries are stable in docs and any implementation work is delegated to narrower renderer plans.
