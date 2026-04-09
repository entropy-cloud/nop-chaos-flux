# 58 Recursive Structural Rendering Plan

> Plan Status: proposed
> Last Reviewed: 2026-04-09
> Source: `docs/components/recurse/design.md`, `docs/components/loop/design.md`, `docs/architecture/template-instantiation-and-node-identity.md`, `docs/components/fragment/design.md`

## Purpose

本计划用于把结构递归收口为 `loop + recurse` 的组合模式，避免为 JSON 模板递归过早引入命名模板注册表或新的重复实例协议。

## Current Baseline

- `loop` 已收口为无 UI 的结构展开节点。
- `fragment` 已收口为无 UI 的结构分组节点。
- repeated-instance identity 已在 table/future loop 路径中稳定。
- 但递归结构尚未有一份明确的组件/文档基线。

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

Status: planned
Targets: docs listed above

- [ ] freeze `recurse` as a lexical recursive node
- [ ] freeze nearest-enclosing-loop resolution rule
- [ ] freeze reuse of repeated-instance identity model
- [ ] freeze rejection of named-template registry as the first recursive baseline

Exit Criteria:

- [ ] one reader can answer how recursive JSON rendering works without needing self-referential JSON or template registries

## Validation Checklist

- [ ] docs define `recurse`
- [ ] docs define nearest-enclosing-loop semantics
- [ ] docs define `fragment + when` for grouped recursive conditions
- [ ] docs reject named-template registry as the first baseline

## Closure

Status Note: close this plan when recursive structural rendering is stable in docs and any implementation work is delegated to a narrower renderer/runtime plan.
