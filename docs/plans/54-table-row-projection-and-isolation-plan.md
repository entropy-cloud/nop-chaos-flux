# 54 Table Row Projection And Isolation Plan

> Plan Status: proposed
> Last Reviewed: 2026-04-09
> Source: `docs/architecture/scope-ownership-and-isolation.md`, `docs/components/table/design.md`, `docs/architecture/table-row-identity-and-scope-performance.md`

## Purpose

本计划用于把 table shell scope、isolated row scope、以及 `rowData` 显式投影规则收口成一套可实现的设计，避免后续为了 isolated rows 再引入 `$parentScope` 或非词法后门。

## Current Baseline

- table shell 默认继承 parent lexical scope。
- materialized row scopes 当前已收口为默认 `isolate: true` 的性能基线。
- 但“isolated row 如何拿少量外部值”还缺一个统一 authoring contract。

## Goals

- 定义 `rowData` 作为 isolated row 的显式外部值投影面。
- 保持 `isolate` 作为唯一隔离术语，不重命名为 `isolateScope`。
- 明确 table shell `data` 与 row `rowData` 的职责边界。
- 明确拒绝 `$parentScope` 作为 row fallback escape hatch。

## Non-Goals

- 不要求实现通用 ancestor lookup 语法。
- 不要求 row scope 暴露任意 parent path 穿透。
- 不要求一次性补齐所有 table 高级功能。

## Scope

### In Scope

- `docs/architecture/scope-ownership-and-isolation.md`
- `docs/components/table/design.md`
- `docs/architecture/table-row-identity-and-scope-performance.md`

### Out Of Scope

- table renderer 代码实现 unless separately requested
- per-cell scope or new React context proposals

## Workstream 1 - Contract Freeze

Status: planned
Targets: docs listed above

- [ ] freeze `isolate` naming
- [ ] freeze table shell `data` as own-scope init patch
- [ ] freeze `rowData` as explicit row projection surface
- [ ] freeze rejection of `$parentScope`
- [ ] freeze `rowData` as row-owner-evaluated, rowKey-cached, incrementally published payload rather than per-cell recomputation

Exit Criteria:

- [ ] one reader can answer how isolated rows receive extra non-row-local data

## Validation Checklist

- [ ] docs reject renaming `isolate` to `isolateScope`
- [ ] docs define `rowData`
- [ ] docs distinguish table shell `data` from row `rowData`
- [ ] docs reject `$parentScope` for row fallback
- [ ] docs define the hot-path performance rule for `rowData`

## Closure

Status Note: close this plan when table row projection rules are stable in docs and any remaining implementation work is delegated to a narrower table-runtime plan.
