# Data Domain Compatibility Audit

## Purpose

本文审计以下设计方向与现有 `docs/architecture/` 基线是否相容：

- `Data Domain Owner` 作为更高层的一等语义 owner
- `ValidationScope` 作为数据域的 validation facet
- `Staged Owner` 作为数据域的编辑/发布策略，而不是独立顶层体系

关注问题：

- 该设计是否与 `form` / `dialog` / `row` / `detail-*` 的既有架构相容
- `loop` / `array-field` / `object-field` / `variant-field` / repeated subtree 是否会与该设计冲突
- 如果未来正式采纳该设计，哪些现有架构文档需要收敛表述

## Executive Summary

结论：**总体相容，但必须严守 owner boundary。**

更具体地说：

1. 该设计与当前 validation 文档的 owner-based direction 高度一致
2. 该设计与 `detail-field` / `detail-view` 的 staged editing 基线高度一致
3. 该设计与 `dialog` / `drawer` 作为纯 surface owner 的定位一致
4. 该设计与 row identity / row-local invalidation 方向一致
5. 最大风险不是概念冲突，而是误把“Data Domain”理解成“每个局部 scope 或局部控件都应 create-owner”

因此，兼容成立的前提是：

```text
Data Domain Owner = high-level semantic owner
not = every projected scope / every repeated item / every local control
```

## Compatibility Findings

### 1. Validation Ownership Is Already Close To Data Domain Ownership

最强一致点来自 `form-validation.md`。

当前文档已经明确：

- validation ownership 应从 data/value ownership 推断，而不是新增 validation-only authoring block
- owner resolution 应区分 `inherit-owner` / `create-owner` / `no-owner`
- `detail-field` / `detail-view`、row-local draft editor、dialog child form 都可属于 `create-owner`

Relevant anchors:

- `docs/architecture/form-validation.md:290-302`
- `docs/architecture/form-validation.md:307-345`

这说明“validation 挂在数据域上”不是对现有文档的颠覆，而是对其更高层的统一命名。

### 2. `detail-field` / `detail-view` Strongly Match The Staged Domain Model

当前 `value-adaptation-and-detail-field.md` 已经把 `detail-field` / `detail-view` 定义为 surface-backed staged owner：

- open 时生成 draft/view model
- content 只编辑 draft
- confirm 前 validate
- `transformOutAction` 生成 owner-managed commit result
- cancel 丢弃 draft

Relevant anchors:

- `docs/architecture/value-adaptation-and-detail-field.md:47-65`
- `docs/architecture/value-adaptation-and-detail-field.md:517-529`

因此把它们视为 child data domain 的 concrete baseline 是相容的。

### 3. `dialog` / `drawer` Remain Surface Owners

`surface-owner.md` 明确规定：

- surface owner 只拥有 open/active/opening/closing
- form submit、confirm、loading 不归 surface owner 吞并

Relevant anchors:

- `docs/architecture/surface-owner.md:35-53`
- `docs/architecture/surface-owner.md:162-169`

因此“surface 只是承载数据域，而不是 draft owner 本身”与现有文档完全一致。

### 4. Row Editing Is Compatible, But Only With Identity-Aware Commit

`table-row-identity-and-scope-performance.md` 与 `dependency-tracking.md` 已经定义：

- row value path / validation path 仍 index-addressed
- runtime row identity 以 `rowKey` 为主
- collection owner 负责把 parent collection changes 翻译成 row-local invalidation

Relevant anchors:

- `docs/architecture/table-row-identity-and-scope-performance.md:33-37`
- `docs/architecture/table-row-identity-and-scope-performance.md:71-87`
- `docs/architecture/dependency-tracking.md:418-437`
- `docs/architecture/dependency-tracking.md:509-517`

因此 row-local staged domain 是可兼容的，但前提是：

- staged row commit 不能按旧 index 盲写
- 必须由 row owner / collection owner 通过 `rowKey` resolve target
- resolve 失败时需要 reject / reopen-required 一类结果

### 5. `object-field` / `array-field` / `variant-field` Must Stay Parent-Owned By Default

这三类文档都明确写了默认 baseline：

- inline live-edit
- 不创建新的 `FormRuntime`
- 不默认引入 confirm/cancel
- 复用 parent `FormRuntime` / `ValidationScopeRuntime`

Relevant anchors:

- `docs/architecture/object-field.md:16-20`
- `docs/architecture/object-field.md:82-88`
- `docs/architecture/array-field.md:16-20`
- `docs/architecture/array-field.md:131-136`
- `docs/architecture/variant-field.md:23-27`
- `docs/architecture/variant-field.md:118-123`

因此该设计只能被理解成：

- 它们默认属于 parent data domain 内的 projected editor / path-bound editor
- 不是默认 child data domain owner

如果把 Data Domain 误读成“每个局部 value-oriented editor 都 create-owner”，就会直接和这些文档冲突。

### 6. `loop` Remains Structural Expansion, Not Automatic Owner Creation

当前 structural baseline 明确把 `loop` 定位为 collection-driven structural expansion。

Relevant anchors:

- `docs/architecture/frontend-programming-model.md:145-150`
- `docs/architecture/scope-ownership-and-isolation.md:132-160`

这意味着：

- `loop item` 默认继承 parent lexical scope
- `loop` 不是天然 owner boundary
- repeated child scope 不等于 validation owner 或 staged owner

所以 Data Domain 设计只能在以下前提下兼容：

- `loop` 本身只是结构乘法
- 只有明确具有 local validation/commit semantics 的 repeated subtree 才提升为 child owner

### 7. Validation And General Dependency Tracking Should Still Stay Separate

`dependency-tracking.md` 当前明确建议：

- validation 暂时保持独立
- 只有在 concrete maintenance problem 出现时再考虑更深复用

Relevant anchors:

- `docs/architecture/dependency-tracking.md:438-447`
- `docs/architecture/dependency-tracking.md:549-550`

因此“validation 是数据域的 facet”并不等于“validation 必须并入 runtime 通用 dependency graph”。

这两件事必须分开。

## Non-Compatible Misreadings

以下理解与现有文档不兼容：

1. every local scope becomes a Data Domain Owner
2. every `loop item` becomes a child validation owner
3. every `object-field` / `array-field` / `variant-field` becomes staged by default
4. `dialog` / `drawer` become draft owners rather than surfaces
5. validation must be structurally merged into the same general dependency graph before the design is valid

## Recommended Compatibility Interpretation

若要让新设计与现有架构文档保持一致，推荐采用以下解释：

1. `Data Domain Owner` 是高层语义 owner，用于统一命名已有的 owner-based data/validation/editing boundaries
2. `ValidationScope` 是该数据域的 validation facet
3. `Staged Owner` 是该数据域的 staged editing / publish policy
4. 普通 projected editor 仍然只是 parent-owned path-bound view
5. repeated subtree 仍然默认不是 owner，除非 schema/owner semantics 明确 create-owner

## Follow-Up Docs If This Direction Becomes Canonical

如果未来要把这个设计正式吸收到规范性架构文档，优先需要修改以下 3 份文档：

### A. `docs/architecture/form-validation.md`

建议补充：

- 明确把 `ValidationScopeRuntime` 描述为 data owner 的 validation facet，而不是容易被误读成平行 runtime family
- 在 `Inference From Data Scope Ownership` 小节中直接引入 `Data Domain Owner` 命名
- 在 owner resolution 章节加一句：`create-owner` 的边界是 semantic data ownership，不等于每个 local scope

### B. `docs/architecture/value-adaptation-and-detail-field.md`

建议补充：

- 明确 `detail-field` / `detail-view` 是当前已落地的 staged child-domain baseline
- 明确 `object-field` / `array-field` / `variant-field` 只是 parent-owned editors，除非被显式包裹在 staged owner 中
- 用更统一的 ingress / egress 语言描述 detail owner lifecycle

### C. `docs/architecture/table-row-identity-and-scope-performance.md`

建议补充：

- row staged editor commit 目标应按 `rowKey` resolve/reject
- row-local staged domain 的 validation boundary与 parent collection domain 的关系
- row editor 不应把 staged commit 语义偷渡成普通 index-addressed inline writeback

## Lower-Priority Follow-Ups

次级可改文档：

### `docs/architecture/object-field.md`

- 可补一句：`object-field` 默认是 parent-owned local editor，不构成独立 data domain owner

### `docs/architecture/array-field.md`

- 可补一句：对象数组 item editor 默认不是 child owner；若要 staged row edit，需要单独 owner boundary

### `docs/architecture/variant-field.md`

- 可补一句：variant switching 属于 parent domain 内的 value-shape lifecycle，不等于新的 staged data domain

### `docs/architecture/scope-ownership-and-isolation.md`

- 可补一句：isolated scope 与 create-owner 是两个不同概念；isolation 不是 owner creation 的同义词

## Final Judgement

这套设计与当前 `docs/architecture/` 的整体方向 **大体相容，兼容度高**。

真正需要防止的不是文档里的显式反对，而是以下误用：

- 把 every local scope 过度升格成 owner
- 把 every repeated subtree 过度升格成 validation boundary
- 把 every value-oriented control 过度升格成 staged domain

只要继续保持：

- owner boundary 由 semantic lifecycle / data ownership 决定
- validation 挂在数据域上
- staged 只是数据域的发布策略
- surface 只是承载者

那么当前架构文档与该设计可以顺利收敛，而不需要推翻既有大结构。
