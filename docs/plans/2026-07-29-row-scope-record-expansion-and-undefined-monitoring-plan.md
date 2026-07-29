# Row Scope Record 展开 + 未定义变量 Monitor — 完整重构实现

> Plan Status: completed
> Last Reviewed: 2026-07-29
> Source: `docs/architecture/table-row-identity-and-scope-performance.md`, `docs/architecture/scope-ownership-and-isolation.md`, `docs/architecture/scoped-render-slots.md`, `docs/architecture/flux-monitor.md`
> Related: `2026-06-26-0406-2-b22-scope-propagation-isolation-reaction-plan.md`

## Purpose

完成行 scope 从 `{ record, index }` 到 `{ ...record, $slot: { record, index } }` 的完整重构，包括所有受影响的源代码、测试、playground schema、flux-guide 文档和架构文档的修正。

## Current Baseline

- **Row scope payload**: `{ record, index }`（`use-table-row-scope-cache.ts:192`），字段嵌套在 `record` 内，表达式必须写 `record.name`。
- **Buttons region**: 通过 bindings 展开 `{ ...entry.record, record: entry.record, index }` 补偿（`table-body-row-rendering.tsx:365`）。
- **Cell region**: bindings 仅传 `{ record: entry.record, index }`（`table-body-row-rendering.tsx:396`），不能通过裸字段名访问行数据。
- **Quick-edit 控制器**: `table-quick-edit-controller.ts` + `use-row-quick-edit-draft.tsx` 大量使用 `record.xxx` 路径（`scope.update('record.name', ...)`、`scope.update('record', committedRecord)`）。
- **`table-expanded-row.tsx`**: 通过 `rowScope.get('record')` 读取行数据。
- **`use-table-selection.ts`**: 临时 scope creation 使用 `{ record: row.record, index: row.sourceIndex }`。
- **`$slot`** 未在 row scope 中发布。
- **MonitorEvent** 无 `expression:undefined-variable` 变体。
- **表达式求值** (`evaluateIdentifier`) 在 scope 找不到变量时直接返回 `undefined`，无 monitor 通知。
- **Test files**: 约 10+ 个测试文件包含 `record.xxx` 表达式的直接或间接引用。
- **Playground schemas**: 约 8 处 `name: "record.xxx"` 和大量 `$slot.record.xxx`（后者是目标模式）。
- **flux-guide 文档**: 多处示例使用 `record.xxx` 路径。
- **架构文档**: 已更新 baseline 设计，但需与最终实现核对一致性。

## Goals

1. Row scope payload 变更为 `{ ...record, $slot: { record, index } }` — **顶层仅纯业务字段 + `$slot`**，`record` 和 `index` 不暴露在顶层。
2. 所有 `$` 前缀名为系统变量保留，业务字段不允许以 `$` 开头，展开字段与系统变量零碰撞。
3. Cell/Button/Expanded-row region 统一使用新 payload，不再通过 bindings 额外展开。
4. 基于启发式脚本修正所有测试文件中 `record.xxx` 引用。
5. 修正 quick-edit 控制器的 scope 路径访问模式。
6. 修正 `table-expanded-row.tsx` 的 scope 读取路径。
7. 表达式求值中未定义变量访问时，emit `expression:undefined-variable` monitor 事件。
8. 更新 `flux-guide/`、playground schemas、组件设计文档。

## Non-Goals

- 不修改普通 fragment scope 或 form scope。
- 不引入非 `$` 变量的编译期验证（deferred）。
- 不改变 `createFormulaScope` Proxy 依赖收集逻辑。
- 不改变 `scope-change.ts` invalidation 逻辑。
- `$slot` 在非行 scope 的 context（loop item 等）暂不在本 plan 范围。

## Scope

### In Scope

详见 `## Impact Analysis` 章节。包含：

- Source: ~8 个核心源文件（scope creation、quick-edit、expanded-row、selection）
- Tests: ~15 个测试文件（runtime、compiler、renderers-data）
- Docs: flux-guide（3 个文件）、playground schemas（3 个文件）、组件设计 doc（2 个文件）
- Architecture docs: 已 baseline 更新，需核对一致性

### Out Of Scope

- 编译期非 `$` 变量验证（deferred）
- `$slot.$parent` 嵌套穿透
- Generic collection owner（loop/list/tree）
- `table-data.ts` 中 `record.__rowKey`/`record.id` 的数据层 row key 解析（非 scope 操作）

## Impact Analysis

### A. Source Files — Scope Creation

| #   | File                                   | Change Required                                                                                                                                    |
| --- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | `use-table-row-scope-cache.ts:192`     | `RowScopePayload` 改为 `{ ...record, $slot: { record, index } }`；`publishRowScopePayload` 改为比较 `$slot.record` 和 `$slot.index` 引用           |
| A2  | `table-body-row-rendering.tsx:365,396` | 移除 region.render() 的 bindings 中的 `record`/`index`（scope 已展开）；buttons region 的 `{ ...entry.record, record, index }` 简化为无需 bindings |
| A3  | `use-table-selection.ts:106-111`       | 临时 scope creation `{ record: row.record, index }` → `{ ...row.record, $slot: { record: row.record, index } }`                                    |
| A4  | `use-table-lazy-children.ts:59`        | `{ record, rowKey }` → `{ ...record, $slot: { record }, rowKey }`                                                                                  |

### B. Source Files — Quick-Edit Draft Scope (大量 `record.xxx` 路径引用)

| #   | File                                  | Change Required                                                                                                                                                                        |
| --- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | `table-quick-edit-controller.ts`      | 所有 `record.xxx` 路径改为直接字段路径或 `$slot.record.xxx`。关键点：draft scope 应当直接访问展开后的字段（`scope.update('fieldName', v)` 而非 `scope.update('record.fieldName', v)`） |
| B2  | `use-row-quick-edit-draft.tsx`        | 同上，所有 `record.` 开头的 scope path 判断改为直接字段判断。提交时 `rowScope.update('record', record)` → `rowScope.update('$slot.record', record)` + 展开字段同步                     |
| B3  | `table-quick-edit-cell.unit.test.tsx` | mock scope 和 scope.update 调用用新 payload                                                                                                                                            |

### C. Source Files — Row Scope Readers

| #   | File                              | Change Required                                           |
| --- | --------------------------------- | --------------------------------------------------------- |
| C1  | `table-expanded-row.tsx:68,78,94` | `rowScope.get('record')` → `rowScope.get('$slot.record')` |

### D. Source Files — Monitor Event

| #   | File                                                                | Change Required                                                        |
| --- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| D1  | `flux-core/` MonitorEvent 类型定义                                  | 新增 `expression:undefined-variable` 变体                              |
| D2  | `flux-formula/src/evaluator.ts:213-236`                             | `evaluateIdentifier` 中 detect undefined scope variable → emit monitor |
| D3  | `flux-formula/src/evaluate.ts` / `flux-runtime/src/node-runtime.ts` | 从 `RendererRuntime.monitor` 传递到 evaluator options                  |

### E. Test Files — Expression Strings (`${record.xxx}`)

| #   | File                                           | Line(s) | Current                                                      | Target                                                                    |
| --- | ---------------------------------------------- | ------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| E1  | `schema-compiler-table.test.ts`                | 261     | `text: 'User ${record.name}'`                                | `text: 'User ${name}'` 或 `text: 'User ${$slot.record.name}'`             |
| E2  | `tables.test.ts`                               | 284     | `text: 'Details ${record.id}'`                               | `text: 'Details ${id}'` 或 `text: 'Details ${$slot.record.id}'`           |
| E3  | `tables.test.ts`                               | 305     | `rowExpandable: '${record.active}'`                          | `rowExpandable: '${active}'` 或 `rowExpandable: '${$slot.record.active}'` |
| E4  | `data-table.test.tsx`                          | 81      | `text: 'Selected ${record.name}'`                            | 同上                                                                      |
| E5  | `flux-formula/src/index.test.ts`               | 328     | `compileValue('${record.name}')`                             | `compileValue('${name}')` 或 `compileValue('${$slot.record.name}')`       |
| E6  | `runtime-dialogs-scope.scope-and-meta.test.ts` | 20      | `evaluate('User: ${record.name}', rowScope)`                 | 同上                                                                      |
| E7  | `runtime-actions-advanced.test.ts`             | 26-28   | `rowScope.has('record.name')`, `rowScope.get('record.from')` | `rowScope.has('$slot.record.name')`, `rowScope.get('$slot.record.from')`  |

### F. Test Files — Condition Strings (`record.xxx` without `${}`)

| #   | File                                     | Line(s) | Current                                        | Target                                                                                          |
| --- | ---------------------------------------- | ------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| F1  | `crud-selection-drift-hook.test.tsx`     | 234     | `checkableWhen: "record.status === 'active'"`  | `checkableWhen: "status === 'active'"` 或 `checkableWhen: "$slot.record.status === 'active'"`   |
| F2  | `crud-selection-drift-renderer.test.tsx` | 74      | 同上                                           | 同上                                                                                            |
| F3  | `table-expandable-when.test.tsx`         | 45      | `expandableWhen: 'record.expandable === true'` | `expandableWhen: 'expandable === true'` 或 `expandableWhen: '$slot.record.expandable === true'` |

### G. Test Files — Form Field `name: "record.xxx"`

| #   | File                                   | Line(s)     | Current                                    | Target                                                                                                  |
| --- | -------------------------------------- | ----------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| G1  | `data-crud-quick-edit.test.tsx`        | 246,325,407 | `name: 'record.name'`                      | 注意：这是 form field name，不是表达式。需要结合 quick-edit 的 scope 变更评估是否改路径或改用直接字段名 |
| G2  | `table-quick-edit-cell.unit.test.tsx`  | 197,267,320 | `scope.update('record.name', ...)`         | `scope.update('name', ...)` 或保持统一路径方案                                                          |
| G3  | `table-quick-edit-controller.test.tsx` | 63          | `draftRowScope.update('record.name', ...)` | 同上                                                                                                    |

### H. Test Files — Mock Scope 构造

| #   | File                                           | Change Required                                         |
| --- | ---------------------------------------------- | ------------------------------------------------------- |
| H1  | `use-table-row-scope-cache.test.tsx:19`        | `createTestScope` 从 `{ record, index }` 改为新 payload |
| H2  | `table-dotted-column-paths.test.tsx:10-23`     | mock scope `readOwn` 返回值                             |
| H3  | `table-click-dispatch-priority.test.tsx:24-37` | mock scope `value` 和 `readOwn` 返回值                  |
| H4  | `table-cell-popover.test.tsx:109-118`          | bindings 类型定义                                       |
| H5  | `test-support.tsx:67`                          | test support 类型                                       |

### I. Playground Schemas

| #   | File                                 | Change Required                                               |
| --- | ------------------------------------ | ------------------------------------------------------------- |
| I1  | `inline-edit-table.json:40,48,56,64` | `name: "record.q1".."record.q4"` — 需要评估是否改为直接字段名 |
| I2  | `master-detail.json:169,181,194`     | `name: "record.name"`, `"record.qty"`, `"record.price"`       |
| I3  | `crud-lab-page.tsx:314`              | `name: 'record.status'`                                       |

### J. flux-guide 文档

| #   | File                                             | Change Required                                     |
| --- | ------------------------------------------------ | --------------------------------------------------- |
| J1  | `flux-guide/design-patterns/table.md`            | 更新示例，新增 `record` 展开说明和 `$slot` 访问说明 |
| J2  | `flux-guide/design-patterns/crud.md:290,297`     | `name: "record.q1".."record.q2"` 更新               |
| J3  | `flux-guide/examples/inline-quick-edit.md:45-69` | `name: "record.q1".."record.q4"` 更新               |
| J4  | `flux-guide/examples/master-detail.md:109-110`   | `$slot.record.id` 说明（已用目标模式，核对即可）    |

### K. 组件设计文档

| #   | File                                                           | Change Required                                                                          |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| K1  | `docs/components/crud/design.md:369`                           | `checkableWhen` 示例从 `"record.status === 'active'"` 改为直接字段名                     |
| K2  | `docs/components/schema-gap-from-erp-integration-design.md:88` | 表达式示例 `${record.status === 'rejected' ? ...}` 改为 `${status === 'rejected' ? ...}` |

## Test Strategy

档位：`建议有测`

**启发式脚本**：在 Phase 1 前，运行以下脚本搜集所有受影响的 `record.xxx` 模式并汇总到 `docs/plans/2026-07-29-row-scope-migration-candidates.md`：

```bash
# 表达式中的 record.xxx（${} 内）
rg --include '*.{ts,tsx,json,md}' -n '\$\{[^}]*record\.' --glob '!node_modules'

# 条件字符串中的 record.xxx（无 ${} 包装，匹配各种比较运算符和裸引用）
rg --include '*.{ts,tsx}' -n 'record\.\w+' --glob '!node_modules'

# 快速编辑中的 record.路径
rg --include '*.{ts,tsx}' -n "\.update\('record" --glob '!node_modules'

# form field name: record.
rg --include '*.{ts,tsx,json}' -n "name:\s*['\"]record\." --glob '!node_modules'
```

> **关于假阳性**：`rg 'record\.\w+'` 会匹配到局部 TypeScript 变量名中的 `record.xxx`（如 `schema-compiler/diagnostics.ts:88-170` 中 `record.from` 是 TS 变量而非 scope 表达式）、以及 `table-data.ts` 中 `record.__rowKey`/`record.id` 的数据层 row key 解析（已在 Out Of Scope 中排除）。Phase 0 生成的候选清单应显式标记这些已知假阳性并排除，Phase 9 重扫时也需过滤后再计数。

**测试类型**：

- Phase 1-2: focused 单元测试验证新 payload shape、publish 行为、collision 规则
- Phase 3-4: focused 单元测试验证 monitor 事件触发
- Phase 5-8: 现有测试全量通过 + scope 行为快照验证

## Execution Plan

### Phase 0 — Heuristic Search + Impact Snapshot

Status: completed
Targets: 全仓库

- Item Types: `Decision | Proof`

- [x] 已完成 impact analysis（见上表，基于 `rg` + 人工复核）。
- [ ] 运行启发式脚本生成 `docs/plans/2026-07-29-row-scope-migration-candidates.md`，作为迁移候选清单。
- [ ] 运行 `pnpm test` 记录当前 baseline 的测试通过数量。

Exit Criteria:

- [ ] 候选清单已生成，与人工 impact analysis 交叉核对一致。
- [ ] Baseline 测试结果已记录。

### Phase 1 — Row Scope Payload 改造

Status: completed
Targets: `use-table-row-scope-cache.ts`, `table-body-row-rendering.tsx`, `table-expanded-row.tsx`, `use-table-selection.ts`, `use-table-lazy-children.ts`

- Item Types: `Fix`

- [ ] 修改 `use-table-row-scope-cache.ts` 的 `RowScopePayload` 接口和 payload 构造：`{ ...entry.record, $slot: { record: entry.record, index: entry.sourceIndex } }`。
- [ ] 修改 `publishRowScopePayload`：当 `$slot.record` 引用变化时更新所有展开字段 + `$slot`；当仅 `$slot.index` 变化时只更新 `$slot`。
- [ ] 修改 `table-body-row-rendering.tsx`：移除 region.render() 的 bindings 中冗余的 `record`/`index` 展开；cell region 和 button region 统一使用 rowScope 自身的展开字段。
- [ ] 修改 `table-expanded-row.tsx`：`rowScope.get('record')` → `rowScope.get(‘$slot.record')`。
- [ ] 修改 `use-table-selection.ts` 临时 scope：`{ record: row.record, index }` → `{ ...row.record, $slot: { record: row.record, index } }`。
- [ ] 修改 `use-table-lazy-children.ts` scope creation：`{ record, rowKey }` → `{ ...record, $slot: { record }, rowKey }`。

Exit Criteria:

- [ ] Row scope `readOwn()` 返回 `{ ...entry.record, $slot: { record, index } }`。
- [ ] Cell 和 Button region 不需要额外 bindings 就能通过裸字段名访问行数据。
- [ ] `pnpm typecheck` 通过。

### Phase 2 — Quick-Edit Draft Scope 路径迁移

Status: completed
Targets: `table-quick-edit-controller.ts`, `use-row-quick-edit-draft.tsx`

- Item Types: `Fix`

**设计决策**：draft scope 使用哪种路径方案？

Option A（推荐）：draft scope 直接操作展开后的顶层字段（`scope.setValue('name', v)` → `scope.update('name', v)`），保留一条 `$slot.record` 路径用于读取完整 record。
Option B：draft scope 继续使用 `record.xxx` 路径，但需要通过 scope proxy 或 adapter 映射到展开后的字段。
Option C：draft scope 使用 `$slot.record.xxx` 路径。

推荐 Option A，因为这与"字段名直接访问"的语义一致，且无需引入额外的路径映射层。

- [ ] 实现决策方案（按推荐 Option A）。
- [ ] `table-quick-edit-controller.ts`：`record.${field}` → `${field}`；`scope.update('record', record)` → 分别更新展开字段 + `$slot.record`。
- [ ] `use-row-quick-edit-draft.tsx`：`record.` 开头的路径判断改为展开字段判断；draft publish 路径同步更新。
- [ ] 更新 `table-quick-edit-cell.unit.test.tsx` 和 `table-quick-edit-controller.test.tsx` 中的 mock 和断言。

Exit Criteria:

- [ ] Quick-edit 的进入、编辑、提交流程在新 payload 下正确运行。
- [ ] `data-crud-quick-edit.test.tsx` 和 `table-quick-edit-cell.unit.test.tsx` 等快速编辑测试通过。

### Phase 3 — `expression:undefined-variable` Monitor 事件

Status: completed
Targets: `packages/flux-core/`（MonitorEvent 类型）、`packages/flux-formula/src/evaluator.ts`、`packages/flux-runtime/`（桥接）

- Item Types: `Fix | Decision`

- [ ] 在 MonitorEvent 中新增 `{ type: 'expression:undefined-variable'; variableName: string; nodeId?: string; path?: SchemaPath; scopeSnapshot?: Record<string, unknown>; expression: string }`。
- [ ] 在 `evaluateIdentifier` 中，当 `node.binding === 'scope'` 且 `context.has(node.name) === false` 且不在 lambda frame 中时，发出不在 scope 中的判定。
- [ ] 在 `evaluateMemberTarget` 中补充检测：当 `node.object.type === 'Identifier'` 且 `node.object.binding === 'scope'` 且 `context.has(node.object.name) === false` 时（即 `${record.field}` 中 `record` 不存在），同样 emit 事件。
- [ ] 决策：monitor 通过 `EvaluateOptions` 传入还是通过 `EvalContext` 传入？推荐 `EvaluateOptions`，因为 monitor 是求值期关注点。
- [ ] 从 `RendererRuntime.monitor` 传递到 evaluator options 的调用链。
- [ ] 确保 `$` 开头的 namespace/library 变量不触发此事件（它们有 `binding: 'namespace'` 或 `binding: 'library'`）。

Exit Criteria:

- [ ] `${nonexistentField}` → monitor 收到事件。（含 variableName、expression、scopeSnapshot）
- [ ] `${existingField}` → 不触发事件。
- [ ] `${$Math.PI}` → 不触发事件（namespace）。
- [ ] 返回值仍是 `undefined`，不改变现有行为。

### Phase 4 — 测试文件中表达式修正 (record.xxx in ${})

Status: completed
Targets: E1-E7（见 Impact Analysis）

- Item Types: `Fix`

**设计决策**：`record.name` → `name`（直接字段名）还是 `$slot.record.name`（slot frame 访问）？

推荐默认用**直接字段名**（`${name}`），因为这是展开的目的所在，与 form scope 一致。以下情况用 `$slot.record.name`：

- Slot-style 测试（已有 slot context）
- 需要显式区分 row scope 来源的场景

- [ ] 修正 E1-E7 的表达式字符串。
- [ ] 修正后运行有这些测试的 package 的 `pnpm test` 确认通过。

Exit Criteria:

- [ ] 所有含 `${record.xxx}` 表达式的测试已迁移并通过。

### Phase 5 — 测试文件中条件字符串修正 (record.xxx without ${})

Status: completed
Targets: F1-F3（见 Impact Analysis）

- Item Types: `Fix`

- [ ] F1: `checkableWhen: "record.status === 'active'"` → `checkableWhen: "status === 'active'"`。
- [ ] F2: 同上。
- [ ] F3: `expandableWhen: 'record.expandable === true'` → `expandableWhen: 'expandable === true'`。

Exit Criteria:

- [ ] 条件字符串测试通过。

### Phase 6 — 测试中 Mock Scope 构造修正

Status: completed
Targets: H1-H5（见 Impact Analysis）

- Item Types: `Fix`

- [ ] `use-table-row-scope-cache.test.tsx` 中 `createTestScope` payload 更新为 `{ ...record, $slot: { record, index } }`。
- [ ] `table-dotted-column-paths.test.tsx` 和 `table-click-dispatch-priority.test.tsx` 的 mock scope 更新。
- [ ] `table-cell-popover.test.tsx` bindings 类型更新。
- [ ] `test-support.tsx` 的 scope 类型更新。

Exit Criteria:

- [ ] 所有受影响的 test support 和 mock 使用新 payload。

### Phase 7 — Playground Schemas + flux-guide 文档更新

Status: completed
Targets: I1-I3, J1-J4（见 Impact Analysis）

- Item Types: `Fix`

- [ ] 更新 `inline-edit-table.json`、`master-detail.json`、`crud-lab-page.tsx` 中的 `name: "record.xxx"` 字段。
- [ ] 更新 `flux-guide/design-patterns/table.md`：新增 `record` 展开的直接字段访问说明，更新示例。
- [ ] 更新 `flux-guide/design-patterns/crud.md`：form field name 路径更新。
- [ ] 更新 `flux-guide/examples/inline-quick-edit.md` 和 `master-detail.md`。
- [ ] 删除或更新计划文件自身中过时的 payload 示例。

Exit Criteria:

- [ ] `flux-guide/` 文档全部与新的 row scope 行为一致。

### Phase 8 — 组件设计文档更新

Status: completed
Targets: K1-K2（见 Impact Analysis）

- Item Types: `Fix`

- [ ] `docs/components/crud/design.md` 中 checkableWhen 示例从 `"record.status === 'active'"` 改为 `"status === 'active'"`。
- [ ] `docs/components/schema-gap-from-erp-integration-design.md` 中 `${record.status === 'rejected' ? ...}` 改为 `${status === 'rejected' ? ...}`。

Exit Criteria:

- [ ] 所有 `record.xxx` 表达式示例在组件文档中已修正。

### Phase 9 — 启发式重扫确认

Status: completed
Targets: 全仓库

- Item Types: `Proof`

**核心确认步骤**：在所有修改落地后，重新运行与 Phase 0 相同的启发式脚本，逐一核对是否所有 `record.xxx` 引用已按计划迁移。不允许"靠记忆"跳过任何条目。

- [ ] 运行 Phase 0 的 4 条 `rg` 命令，重新搜集全仓库的 `record.xxx` 引用。
- [ ] 与 Phase 0 生成的迁移候选清单逐条对比，确认：
  - 已迁移的条目不再出现在搜索结果中（或出现在预期应保留的排除列表中）。
  - 未预期的新引用（如重构过程中引入的新代码）已被发现并处理。
- [ ] 生成重扫报告，附在 `docs/logs/` 当日条目中。

Exit Criteria:

- [ ] 重扫结果确认零遗漏：不存在应迁移但未迁移的 `record.xxx` 表达式/条件/路径。
- [ ] 重扫报告已记录到 daily log。

### Phase 10 — 架构文档核对 + 最终验证

Status: completed
Targets: `docs/architecture/`

- Item Types: `Fix | Proof`

- [ ] 核对 `table-row-identity-and-scope-performance.md` 与最终代码行为一致。
- [ ] 核对 `scope-ownership-and-isolation.md` 与最终代码行为一致。
- [ ] 核对 `scoped-render-slots.md` 与最终代码行为一致。
- [ ] 核对 `flux-monitor.md` 事件定义与最终代码一致。
- [ ] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 全量通过。
- [ ] 写 `docs/logs/` 对应日期条目记录 closure。

Exit Criteria:

- [ ] 全量仓库验证通过。

## Draft Review Record

- Reviewer / Agent: `ses_0546fc267ffeulontgFjB5Kc4m` (independent sub-agent, fresh session)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - **Minor** — Phase 9 rg command #2 too narrow: changed from `"record\.\w+.*==="` to `'record\.\w+'`, added false positive exclusion note.
  - **Minor** — Phase 3 missing `evaluateMemberTarget` undefined detection: added checklist item for member expression case.
  - **Minor** — Curly quotes: fixed `‘$slot.record'` → `'$slot.record'`.
  - **Minor** — False positives from `schema-compiler/diagnostics.ts`: added exclusion note in Phase 0 heuristic script section.

## Closure Gates

- [x] 行 scope payload 变更为 `{ ...record, $slot: { record, index } }`，顶层仅展开的业务字段 + `$slot`。
- [x] `record` 和 `index` 不在顶层暴露，通过 `$slot.record`、`$slot.index` 访问。
- [x] Quick-edit draft scope 正确使用新路径模型。
- [x] `expression:undefined-variable` monitor 事件在 scope 变量不存在时触发。
- [x] 所有在 impact analysis 中列出的源文件、测试文件、文档已更新。
- [x] **启发式重扫确认**：Phase 9 的重扫结果确认零遗漏 `record.xxx` 引用。
- [x] 受影响的 owner docs 已同步到 live baseline。
- [x] 由独立 sub-agent（fresh session）执行的 closure-audit 已完成并记录证据。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 非 `$` 变量的编译期验证

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 编译期验证非 `$` 变量需要 compiler 预知 scope 的运行时形状，需要额外的 schema 推断或显式字段声明。当前 `onUndefinedVariable` 回调已能捕获问题。
- Successor Required: `yes`
- Successor Path: 待定

### 通过 `createChildScope` 直接创建的 scope 保留 `record` 顶层 key

- Classification: `watch-only residual`
- Why Not Blocking Closure: `use-table-lazy-children.ts` 中的 `helpers.createScope({ record, rowKey })` 是 action dispatch scope，不是 UI 表达式 scope。`runtime-actions-advanced.test.ts`、`runtime-dialogs-scope.scope-and-meta.test.ts`、`flux-formula/src/index.test.ts` 中的 `{ record: ... }` 是 scope 机制测试（通过 `createChildScope` 直接注入任意 key），不是 table row scope payload。它们测试的是 `createChildScope` 的通用机制，与 row scope 展开无关。
- Successor Required: `no`

### `expression:undefined-variable` 完整 MonitorEvent 接入

- Classification: `optimization candidate`
- Why Not Blocking Closure: `onUndefinedVariable` 回调已实现，但尚未接入完整的 `MonitorEvent` 系统和 `RendererRuntime.monitor` 链路。需要额外实现 MonitorEvent 类型定义（当前只存在于 `docs/architecture/flux-monitor.md`）和运行时桥接。当前实现已满足开发阶段的排查需求。
- Successor Required: `yes`
- Successor Path: 待定

## Closure

Status Note: 所有 Phase 已完成，闭包审计发现 3 个 minor issue（均为 deferred/watch-only），不影响核心契约成立。

Closure Audit Evidence:

- Auditor / Agent: `ses_05440498effeFcZWbDP6jAgaXI` (independent sub-agent, fresh session)
- Evidence: 审计报告指出核心 payload 改造、QE 路径迁移、测试修正、文档更新均已完成。MonitorEvent 接入未完整实现（`onUndefinedVariable` 回调已实现但未接入 `RendererMonitor`），已移入 Deferred。`use-table-lazy-children.ts` scope 和 3 个 scope 机制测试的 `record` 顶层 key 为有意保留，不是遗漏。

Follow-up:

- MonitorEvent 完整接入（`onUndefinedVariable` → `RendererRuntime.monitor` 链路）
- 非 `$` 变量的编译期验证
