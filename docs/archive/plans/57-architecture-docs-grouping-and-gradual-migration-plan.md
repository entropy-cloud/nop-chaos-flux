# 57 Architecture Docs Grouping And Gradual Migration Plan

> Plan Status: completed
> Last Reviewed: 2026-04-10
> Source: `docs/architecture/README.md`, `docs/index.md`, `docs/analysis/2026-04-01-docs-design-review-2026-03-29.md`

## Purpose

本计划用于处理 `docs/architecture/` 目录越来越拥挤的问题，但避免一次性大搬家导致路径噪音、交叉引用断裂和导航回退。

## Current Baseline

- `docs/architecture/` 当前平铺层已经有 30+ 条目。
- `flow-designer/` 和 `report-designer/` 已经证明“稳定文档族进入子目录”是可行的。
- 但 action/runtime/ui 相关文档仍高度交叉引用，直接整批迁移成本较高。

## Goals

- 先建立逻辑分组入口，而不是立刻全量物理迁移。
- 定义哪些文档族未来适合迁入子目录。
- 保持顶层锚点文档的稳定性。

## Non-Goals

- 不要求当前回合就移动所有 architecture 文档。
- 不要求为了目录整洁牺牲交叉引用稳定性。
- 不要求重写全部 `Related Documents` 路径。

## Scope

### In Scope

- `docs/architecture/README.md`
- `docs/index.md`
- future doc-family migration notes

### Out Of Scope

- full path migration unless separately scheduled
- component docs directory reorganization

## Workstream 1 - Logical Grouping

Status: completed
Targets: `docs/architecture/README.md`, `docs/index.md`

- [x] freeze logical groups for core/action/runtime/ui/host/domain docs
- [x] use grouped index as the first navigation layer

Exit Criteria:

- [x] readers can navigate architecture docs by topic without relying on flat filename scanning

## Workstream 2 - Gradual Migration Strategy

Status: completed
Targets: successor plans if a concrete migration is approved

- [x] identify one stable doc family for the first physical move
- [x] batch-update cross-links for that family only
- [x] keep top-level anchors stable unless there is a strong reason to move them

Exit Criteria:

- [x] any future migration proceeds family-by-family instead of repo-wide at once

## Validation Checklist

- [x] architecture grouped index exists
- [x] docs explicitly state that flat architecture layout is crowded but not yet worth a full immediate move
- [x] docs define a gradual migration rule

## Closure

Status Note: Completed. Architecture navigation now has a stable grouped index and future physical moves are explicitly constrained to family-by-family migration.

Follow-up:

- no remaining plan-owned work
