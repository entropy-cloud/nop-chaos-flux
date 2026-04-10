# 55 Loop Structural Node And Item Scope Plan

> Plan Status: completed
> Last Reviewed: 2026-04-10; live renderer/runtime landed
> Source: `docs/components/loop/design.md`, `docs/architecture/template-instantiation-and-node-identity.md`, `docs/architecture/scope-ownership-and-isolation.md`

## Purpose

本计划用于把 `loop` 收口为结构节点，并冻结它的 item scope、变量命名、重复实例 identity、以及与 table row 的差异边界。

## Current Baseline

- active architecture docs 已明确 `loop` 应是结构 DSL 节点，而不是普通属性。
- template/instance 文档已明确 future `type: 'loop'` 必须与 table rows 共享 repeated-instance model。
- 但 `loop` 的 item scope、变量命名、`itemData`、以及默认继承/隔离规则此前还未冻结。
- 2026-04-10 live repo now includes `type: 'loop'` registration and renderer support in `packages/flux-renderers-basic/src/index.tsx`, `loop.tsx`, and `structural-loop.tsx`, with focused tests in `packages/flux-renderers-basic/src/index.test.tsx`.

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

Status: completed
Targets: docs listed above

- [x] freeze `loop` as the node name
- [x] freeze `itemName` / `indexName` / `keyName`
- [x] freeze inherited loop item scope as the default
- [x] freeze `itemData` as the narrow local-derived binding surface
- [x] align loop item scope wording across component design and architecture docs

Exit Criteria:

- [x] one reader can answer how loop item scope differs from table row scope

## Workstream 2 - Runtime And Compiler Landing

Status: completed
Targets: compiler/runtime/render path, representative tests, examples

- [x] add live schema/compiler support for `type: 'loop'`
- [x] render `loop.body` through the repeated-instance model with inherited item scope by default
- [x] expose `itemName` / `indexName` / `keyName` / `itemData` on the item scope
- [x] add focused tests and one representative example

Exit Criteria:

- [x] `type: 'loop'` renders repeated content with stable repeated identity and documented item bindings

## Validation Checklist

- [x] docs define `loop` as a structural node
- [x] docs prefer `itemName` over `varName`
- [x] docs define inherited loop item scope
- [x] docs define `itemData`
- [x] docs explain why `rowData` is not immediately promoted to a global repeated-projection field
- [x] runtime/compiler/test implementation exists for `type: 'loop'`

## Closure

Status Note: The documented loop contract is now backed by a live basic renderer implementation that renders repeated instances with inherited item scope and repeated `instancePath` frames.

Follow-up:

- none for this plan scope
