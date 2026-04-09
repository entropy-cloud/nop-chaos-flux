# 53 Scope Ownership And Isolation Alignment Plan

> Plan Status: proposed
> Last Reviewed: 2026-04-09
> Source: `docs/architecture/scope-ownership-and-isolation.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/table-row-identity-and-scope-performance.md`, `docs/components/page/design.md`, `docs/components/form/design.md`

## Purpose

本计划用于把 scope 默认继承、`data` 初始化、显式隔离、row exception、以及拒绝 `$parentScope` 的规则收口成统一执行基线。

## Current Baseline

- runtime 当前默认 child scope 继承 parent scope。
- `CreateScopeOptions` 当前已经使用 `isolate` 术语。
- row scope 当前已在实现和性能文档中收口为默认隔离。
- `form` 文档已经把 `data` 写为初始化值来源，但 `page` 文档此前未完整对齐。

## Goals

- 冻结“默认继承，显式隔离”的 authoring baseline。
- 冻结 `data` = own scope initial patch 的统一语义。
- 冻结 `isolate` 作为唯一隔离开关名称。
- 明确拒绝 `$parentScope`。

## Non-Goals

- 不要求新增复杂的 scope address syntax。
- 不要求引入 `$rootScope` / `$ancestorScope(n)`。
- 不要求所有组件立刻都声明 `data` 字段。

## Scope

### In Scope

- `docs/architecture/scope-ownership-and-isolation.md`
- `docs/components/page/design.md`
- `docs/components/form/design.md`
- narrower references in `docs/index.md`

### Out Of Scope

- runtime code changes unless separately requested
- table renderer performance implementation details beyond current documented baseline

## Workstream 1 - Contract Freeze

Status: planned
Targets: docs listed above

- [ ] freeze default lexical inheritance
- [ ] freeze `data` as own-scope initial patch semantics
- [ ] freeze `isolate` as the only isolation control name
- [ ] freeze rejection of `$parentScope`

Exit Criteria:

- [ ] one reader can answer default inheritance/isolation behavior without reading runtime code

## Workstream 2 - Component Alignment

Status: planned
Targets: `docs/components/page/design.md`, successor component docs

- [ ] align page with form on `data` semantics
- [ ] align dialog/drawer with the same `data` semantics when the field is documented

Exit Criteria:

- [ ] page/form/dialog/drawer no longer imply different meanings for `data`

## Validation Checklist

- [ ] docs define default scope inheritance
- [ ] docs define `data` as init patch
- [ ] docs define `isolate` as the preferred control name
- [ ] docs reject `$parentScope`
- [ ] docs explain row scope default isolation as the explicit exception

## Closure

Status Note: close this plan when scope ownership and isolation rules are stable in docs and any remaining runtime or schema work is delegated to narrower plans.
