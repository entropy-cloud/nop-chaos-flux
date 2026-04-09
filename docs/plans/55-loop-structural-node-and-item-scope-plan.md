# 55 Loop Structural Node And Item Scope Plan

> Plan Status: proposed
> Last Reviewed: 2026-04-09
> Source: `docs/components/loop/design.md`, `docs/architecture/template-instantiation-and-node-identity.md`, `docs/architecture/scope-ownership-and-isolation.md`

## Purpose

本计划用于把 `loop` 收口为结构节点，并冻结它的 item scope、变量命名、重复实例 identity、以及与 table row 的差异边界。

## Current Baseline

- active architecture docs 已明确 `loop` 应是结构 DSL 节点，而不是普通属性。
- template/instance 文档已明确 future `type: 'loop'` 必须与 table rows 共享 repeated-instance model。
- 但 `loop` 的 item scope、变量命名、`itemData`、以及默认继承/隔离规则此前还未冻结。

## Goals

- 冻结 `type: 'loop'` 作为结构节点名称。
- 冻结 `itemName` 优于 `varName`。
- 冻结 loop item scope 默认继承父 lexical scope。
- 冻结 `itemData` 作为 loop item 局部派生绑定面。
- 冻结 repeated identity 与 table row 对齐。

## Non-Goals

- 不要求立刻实现 loop renderer。
- 不要求马上把 `rowData` / `itemData` 抽象成通用 repeated projection primitive。
- 不要求一次性定义所有列表视觉组件。

## Scope

### In Scope

- `docs/components/loop/design.md`
- `docs/architecture/scope-ownership-and-isolation.md`
- `docs/components/index.md`

### Out Of Scope

- loop renderer runtime code unless separately requested
- list/grid visual container renderer 的完整设计

## Workstream 1 - Contract Freeze

Status: planned
Targets: docs listed above

- [ ] freeze `loop` as the node name
- [ ] freeze `itemName` / `indexName` / `keyName`
- [ ] freeze inherited loop item scope as the default
- [ ] freeze `itemData` as the narrow local-derived binding surface
- [ ] align loop item scope wording across component design and architecture docs

Exit Criteria:

- [ ] one reader can answer how loop item scope differs from table row scope

## Validation Checklist

- [ ] docs define `loop` as a structural node
- [ ] docs prefer `itemName` over `varName`
- [ ] docs define inherited loop item scope
- [ ] docs define `itemData`
- [ ] docs explain why `rowData` is not immediately promoted to a global repeated-projection field

## Closure

Status Note: close this plan when loop item scope and naming are stable in docs and any implementation work is delegated to a narrower renderer plan.
