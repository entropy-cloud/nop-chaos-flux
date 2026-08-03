# 78 Table 快速编辑 quickSaveItemAction args 模板用旧行值求值（draft scope `$slot` 根回退）

## Problem

- table 行级快速编辑（`quickEdit: true` + `quickSaveItemAction`）保存时，action args 模板（如 `${$slot.record.name}`）**解析到编辑前的旧行值**——用户把 `Alice` 改成 `Alicia` 后保存，后端收到 `name: 'Alice'`。
- bug 73 模式（单测绿但真实行为失败）：既有测试（`data-crud-quick-edit.test.tsx`、`table-quick-edit-controller.test.tsx`）只断言 `ctx.scope.get('$slot.record')`（该路径返回编辑值），**从不断言 action args payload**——args 模板路径 `$slot.record.name` 的段式求值（先 `get('$slot')` 再 `.record.name`）从未被覆盖。
- 首次在本组件宿主场景（c4-1-host-surfaces.spec.ts host-table-qe）真机复现：playground lab 编辑 → 保存 → probe fetcher 收到 `{username: 'alice', id: 1}`（旧值）。

## Diagnostic Method

1. **宿主场景实证**（test-first）：probe fetcher 记录 `api.data`，断言应收到编辑值 `alice-edited`，收到旧值 `alice`——单测无法复现（单测断言的是 scope 读取而非 args payload）。
2. **单测最小复现**（`table-quick-edit-draft-scope-args.test.tsx`）：真实 schema 渲染 + probe namespace 捕获 `payload`——稳定复现 `{name: 'Alice', id: '1'}`（旧值）。
3. **probe 内部分层对比**（同一 dispatch ctx）：
   - `ctx.scope.get('$slot.record')` → `{name: 'Alicia'}`（**编辑值**，draft 分支命中）
   - `ctx.scope.get('$slot')` → `{record: {name: 'Alice'}, index: 0}`（**旧值**，回退到 rowScope）
   - args payload → `{name: 'Alice'}`（**旧值**）
4. **根因定位**：`evaluateActionArgs` 经 `createEvalContext(scope)` 段式解析模板 `${$slot.record.name}`——先 `resolve('$slot')` 再取 `.record.name`。两个 draft scope（`use-row-quick-edit-draft.tsx` 行级 + `table-quick-edit-controller.ts` 单元格级）的 `get(path)` 只特判了 `$slot.record`/`$slot.record.<field>` 前缀，**裸 `$slot` 根路径回退到 `rowScope.get('$slot')`（旧行数据）**——段式求值第一段就拿到旧 record，后续 `.record.name` 全部基于旧值。

## Root Cause

- quick-edit 的 draftRowScope 是对 rowScope 的浅包装，只覆盖 `$slot.record*` 路径；模板求值的**第一段 `$slot`** 落在兜底分支返回原始行 scope 的 `$slot`（编辑前快照）。
- `ctx.scope.get('$slot.record.name')`（整段路径）命中 draft 分支返回编辑值——这是既有测试断言的方式，掩盖了段式求值路径的差异。
- 同类风险面：任何以 `$slot` 为根的表达式（`${$slot.record.x}`、`${$slot.index}`）在 quick-edit 保存 action args 中都会读旧值；dialog quick-edit body 内嵌 schema 同受影响（controller 级 draft scope 同型缺口）。

## Fix

- `use-row-quick-edit-draft.tsx` draftRowScope.get/has 补 `$slot` 根路径：返回 `{...(rowScope.get('$slot') ?? {}), record: draftRecordRef.current}`（draft record），`has('$slot')` 恒 true。
- `table-quick-edit-controller.ts` draftRowScope.get/has 同型补齐（单元格级 saveImmediately/非行级路径同缺陷）。
- readVisible/materializeVisible 已有 draft record 合并（`$slot.record: draftRecordRef.current`），与 `$slot` 根修复一致。

## Tests

- 新增 `table-quick-edit-draft-scope-args.test.tsx`：真实 schema + probe namespace，断言 `quickSaveItemAction.args` 模板 `${$slot.record.name}`/`${$slot.record.id}` **按编辑值**求值（先红后绿：修复前收到 `Alice`，修复后 `Alicia`）。
- 宿主场景 `c4-1-host-surfaces.spec.ts` host-table-qe：真机编辑 → 保存 → probe 断言 `{username: 'alice-edited', id: 1}`。

## Protection

- 回归测试断言 args payload（真实行为），非 scope 读取（假绿面）；
- 宿主场景真机覆盖 bug 73 模式（编辑值 → store → 提交新值）。
