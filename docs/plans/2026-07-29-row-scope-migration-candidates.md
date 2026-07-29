# Row Scope 迁移候选清单

生成日期: 2026-07-29
生成命令: 见 plan Phase 0

## 1. `${record.xxx}` 表达式 (需迁移)

| #   | File                                                                               | Line  | Current                                                      | Target                                              |
| --- | ---------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------ | --------------------------------------------------- |
| 1   | `packages/flux-formula/src/index.test.ts`                                          | 328   | `compileValue('${record.name}')`                             | `compileValue('${name}')`                           |
| 2   | `packages/flux-renderers-data/src/__tests__/data-table.test.tsx`                   | 81    | `text: 'Selected ${record.name}'`                            | `text: 'Selected ${name}'` (或 `$slot.record.name`) |
| 3   | `packages/flux-runtime/src/__tests__/runtime-dialogs-scope.scope-and-meta.test.ts` | 20    | `evaluate('User: ${record.name}', rowScope)`                 | `evaluate('User: ${name}', rowScope)`               |
| 4   | `packages/flux-compiler/src/schema-compiler-table.test.ts`                         | 261   | `text: 'User ${record.name}'`                                | `text: 'User ${name}'`                              |
| 5   | `packages/flux-runtime/src/__tests__/runtime-actions-advanced.test.ts`             | 26-28 | `rowScope.has('record.name')`, `rowScope.get('record.from')` | `$slot.record.name` / `$slot.record.from`           |

## 2. `record.xxx` 条件字符串 (无 `${}`)

| #   | File                                                                                | Line | Current                                        | Target                                  |
| --- | ----------------------------------------------------------------------------------- | ---- | ---------------------------------------------- | --------------------------------------- |
| 1   | `packages/flux-renderers-data/src/__tests__/crud-selection-drift-hook.test.tsx`     | 234  | `checkableWhen: "record.status === 'active'"`  | `checkableWhen: "status === 'active'"`  |
| 2   | `packages/flux-renderers-data/src/__tests__/crud-selection-drift-renderer.test.tsx` | 74   | `checkableWhen: "record.status === 'active'"`  | `checkableWhen: "status === 'active'"`  |
| 3   | `packages/flux-renderers-data/src/__tests__/table-expandable-when.test.tsx`         | 45   | `expandableWhen: 'record.expandable === true'` | `expandableWhen: 'expandable === true'` |

## 3. `scope.update('record...')` 路径

| #   | File                                                                             | Line | Current                            | Target                                                |
| --- | -------------------------------------------------------------------------------- | ---- | ---------------------------------- | ----------------------------------------------------- |
| 1   | `packages/flux-renderers-data/src/table-renderer/use-row-quick-edit-draft.tsx`   | 202  | `rowScope.update('record', ...)`   | `rowScope.update('$slot.record', ...)` + 展开字段同步 |
| 2   | `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts` | 346  | `rowScope.update('record', ...)`   | 同上                                                  |
| 3   | Test files with `scope.update('record.name', ...)`                               | 多处 | `scope.update('record.name', ...)` | `scope.update('name', ...)` 或 draft 方案             |

## 4. `form name: "record.xxx"`

| #   | File                                                                       | Line        | Current                 | Target                      |
| --- | -------------------------------------------------------------------------- | ----------- | ----------------------- | --------------------------- |
| 1   | `apps/playground/src/component-lab/renderers/crud-lab-page.tsx`            | 314         | `name: 'record.status'` | 需评估 form field name 语义 |
| 2-4 | `packages/flux-renderers-data/src/__tests__/data-crud-quick-edit.test.tsx` | 246,325,407 | `name: 'record.name'`   | 同上                        |

## 5. `rowScope.get('record')` 读取

| #    | File                                                                           | Line     | Current                  | Target                         |
| ---- | ------------------------------------------------------------------------------ | -------- | ------------------------ | ------------------------------ |
| 1    | `packages/flux-renderers-data/src/table-renderer/table-expanded-row.tsx`       | 68,78,94 | `rowScope.get('record')` | `rowScope.get('$slot.record')` |
| 2-14 | `table-quick-edit-cell.unit.test.tsx` + `table-quick-edit-controller.test.tsx` | 多处     | `rowScope.get('record')` | Mock scope 适配                |

## 6. Scope Creation Payload

| #   | File                                                                           | Line    | Current                                              | Target                                                                           |
| --- | ------------------------------------------------------------------------------ | ------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts` | 192     | `{ record: entry.record, index: entry.sourceIndex }` | `{ ...entry.record, $slot: { record: entry.record, index: entry.sourceIndex } }` |
| 2   | `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts`       | 106-107 | `{ record: row.record, index: row.sourceIndex }`     | `{ ...row.record, $slot: { record: row.record, index: row.sourceIndex } }`       |
| 3   | `packages/flux-renderers-data/src/table-renderer/use-table-lazy-children.ts`   | 59      | `{ record, rowKey }`                                 | `{ ...record, $slot: { record }, rowKey }`                                       |

## 7. 已知假阳性 (排除)

以下匹配 `record.xxx` 模式但不在迁移范围内:

- `crud-renderer-state.ts` — CRUD state fields (`record.currentPage`, `record.pageSize` 等), 非 scope 表达式
- `mock-backend.ts` — 后端 mock 数据访问, 非 scope
- `table-data.ts` — row key 解析 `record.__rowKey` / `record.id`, 在 Out Of Scope
- `runtime-actions-advanced.test.ts` — `rowScope.has('record.name')` / `get('record.from')` 是在 targets 内
- `schema-compiler/diagnostics.ts` — `record.from` 等是局部 TS 变量
- `use-table-sort.ts` — `record.column` / `record.field` 是 sort state fields
- `runtime-expressions.test.ts` — 可能使用 `record.x` 但在非 table context
- `nop-debugger/controller-inspect-advanced.test.ts` — paths 声明, scope 操作
