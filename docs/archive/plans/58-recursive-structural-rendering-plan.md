# 58 Recursive Structural Rendering Plan

> Plan Status: completed
> Last Reviewed: 2026-04-10; live renderer/runtime landed
> Source: `docs/components/recurse/design.md`, `docs/components/loop/design.md`, `docs/architecture/template-instantiation-and-node-identity.md`, `docs/components/fragment/design.md`

## Purpose

本计划用于把结构递归收口为 `loop + recurse` 的组合模式，避免为 JSON 模板递归过早引入命名模板注册表或新的重复实例协议。

## Current Baseline

- `loop` 已收口为无 UI 的结构展开节点。
- `fragment` 已收口为无 UI 的结构分组节点。
- repeated-instance identity 已在 table/future loop 路径中稳定。
- 但递归结构尚未有一份明确的组件/文档基线。
- 2026-04-10 live repo now includes `type: 'recurse'` registration and renderer support in `packages/flux-renderers-basic/src/index.tsx` and `recurse.tsx`, with focused tests in `packages/flux-renderers-basic/src/index.test.tsx`.

## Goals

- 定义 `recurse` 作为词法递归节点。
- 明确 `recurse` 命中最近 enclosing `loop.body`。
- 明确递归与 `fragment + when` 的搭配模式。
- 明确拒绝命名模板注册表作为首版递归方案。

## Non-Goals

- 不要求立刻实现 `tree`。
- 不要求立刻实现 `json-schema-form`。
- 不要求引入全局模板命名/依赖管理系统。

## Scope

### In Scope

- `docs/components/recurse/design.md`
- `docs/components/loop/design.md`
- `docs/components/fragment/design.md`
- `docs/architecture/template-instantiation-and-node-identity.md`

### Out Of Scope

- recurse renderer/runtime implementation unless separately requested
- 领域 renderer 的完整 schema 设计

## Workstream 1 - Contract Freeze

Status: completed
Targets: docs listed above

- [x] freeze `recurse` as a lexical recursive node
- [x] freeze nearest-enclosing-loop resolution rule
- [x] freeze reuse of repeated-instance identity model
- [x] freeze rejection of named-template registry as the first recursive baseline

Exit Criteria:

- [x] one reader can answer how recursive JSON rendering works without needing self-referential JSON or template registries

## Workstream 2 - Runtime Landing

Status: completed
Targets: compiler/render path, representative tests, examples

- [x] add live schema/compiler support for `type: 'recurse'`
- [x] resolve recurse nodes against the nearest enclosing `loop.body`
- [x] preserve repeated-instance identity across recursive expansion
- [x] add focused tests for recursive rendering and grouped `fragment + when` usage

Exit Criteria:

- [x] recursive schemas render through the documented `loop + recurse` contract without introducing a second recursion substrate

## Validation Checklist

- [x] docs define `recurse`
- [x] docs define nearest-enclosing-loop semantics
- [x] docs define `fragment + when` for grouped recursive conditions
- [x] docs reject named-template registry as the first baseline
- [x] runtime/compiler/test implementation exists for `type: 'recurse'`

## Closure

Status Note: The recursive design baseline is now backed by a live lexical recursion implementation that reuses the nearest enclosing `loop.body` template and the existing repeated-instance path model.

Follow-up:

- none for this plan scope
