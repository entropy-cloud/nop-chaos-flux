# editor-core 架构

> 状态标注：`docs/architecture/` 只描述当前最新设计状态（最终方案、选择原因、拒绝的替代方案）。
> 本文是 `@nop-chaos/editor-core` 包的唯一架构 owner doc。

## 1. 定位

`@nop-chaos/editor-core` 是领域无关的**编辑器内核**：编辑会话（working/committed 双态隔离）、
undo/redo diff 命令栈、选择状态、提交策略、领域适配器注册表——对任意"编辑态/运行态"设计器
（dashboard、SCADA hmi、后续其他）统一。

约束：

- **零 DOM / leafer / 领域类型依赖**：纯逻辑包（`sideEffects: false`，无运行时依赖）。
- **API 形状对齐 `ScadaEditorSession` 模式**（`flux-renderers-industrial/src/editor/editor-session.ts`），
  hmi-editor 迁移兼容（覆盖矩阵见 §6）。
- 域内部 state 不进 flux scope（INV-4）：working/committed/selection/mode + undo 栈经
  `subscribe`/`getState` 投影消费，不写 scope。

## 2. 公共 API

包入口 `src/index.ts` 导出：

| 符号                                                                              | 职责                                                                                                                  |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `EditorMode`                                                                      | `'edit' \| 'preview'`（对齐 `ScadaEditorMode`）                                                                       |
| `EditorCommitPolicy`                                                              | `'manual' \| 'auto'`（对齐 `ScadaCommitPolicy`）                                                                      |
| `EditorDiffEntry<TDiff>`                                                          | 栈元素：`forward` + `inverse` + `operationKind?` + `timestamp`（对齐 `UndoStackEntry`）                               |
| `EditorSessionState<TDocument>`                                                   | 会话投影：working/committed/selection/mode/canUndo/canRedo/undoDepth/redoDepth/dirty                                  |
| `EditorDomainAdapter<TDocument, TDiff>`                                           | `kind`/`load`/`serialize`/`validate`/`diff`/`applyDiff`/`domainCommands?`/`getDocumentIds?`                           |
| `EditorCore<TDocument, TDiff>`                                                    | 内核接口：`update`/`record`/事务三件套/`undo`/`redo`/`commit`/`revert`/`setMode`/`setSelection`/`subscribe`/`dispose` |
| `createEditorCore(adapter, options?)`                                             | 工厂；`options`: `policy`/`initialDocument`/`selection`/`mode`/`maxStackDepth`/`onCommitted`                          |
| `UndoCommandStack<TDiff>`                                                         | 双栈原语（push/peek/pop/深度/canUndo/canRedo/clear）                                                                  |
| `MAX_UNDO_STACK_DEPTH`                                                            | 栈深度上限 100（对齐 hmi）                                                                                            |
| `registerEditorDomain`/`getEditorDomain`/`listEditorDomains`/`clearEditorDomains` | 适配器注册表                                                                                                          |

### 2.1 会话双态隔离（R5 Layer 2）

- `working`：编辑期变更全部落点；`committed`：上次提交基线。
- `createEditorCore` 建立时对 initialDocument（或 `adapter.load()`）做深拷贝（`cloneDocument` =
  `structuredClone`，失败回退浅拷贝并保守处理；领域文档契约 = 可序列化 JSON 形态）。
- 变更只经 `core.update(updater)`（updater 返回新文档，纯函数约定）或 `core.record` 到达 working，
  不直改下游 document。

### 2.2 undo/redo diff 命令栈

- **栈元素不调换字段**（design-undo-redo.md §4.1 Round 2 NEW-1 修正）：undo = 从 undo 栈 peek
  entry → host apply inverse → 同一个 entry 原样移入 redo 栈；redo 对称。
- `update` 事务外自动记录：`forward = diff(prev, next)`，`inverse = diff(next, prev)`，
  一次性入栈（forward/inverse 对称契约，见 §4）。
- **事务**（对齐 hmi transform 拖拽事务）：`beginTransaction` 快照事务起点 → 事务内 `update`
  只改 working 不入栈 → `endTransaction` 一次性 diff 入栈 1 条命令（一拖拽 = 一 undo 步）；
  `abortTransaction` 回滚 working 到事务起点。
- 空栈 `undo()`/`redo()` = no-op + `console.warn`（失败路径 `editor-core-undo-empty`）。
- 满栈丢弃最旧（U7，上限 `MAX_UNDO_STACK_DEPTH`）；新记录截断 redo 链（U6）。
- **commit 后栈保留**（裁定，对齐 hmi `save()` 语义：`runtime-mutators.ts` save 不清栈）；
  `revert()` 与 `load` 语义清空双栈。

### 2.3 提交策略

- `manual`（缺省）：显式 `core.commit()` 触发——`validate(working)` → 失败拒绝（working 保留、
  错误透传，失败路径 `editor-core-commit-invalid`）→ 成功则 `serialized = adapter.serialize(working)`、
  committed = working 深拷贝、`onCommitted` 回调触发（host 在此做下游同步，如 dashboard editor
  派发 `dashboard-editor:save` 事件）。
- `auto`：每次 working 变更（含事务收口）即自动 commit + `onCommitted`。

### 2.4 双态（mode）

`setMode('edit' | 'preview')` 只切模式；不触碰 working/committed/selection/undo 栈（INV-4 无泄漏）。

### 2.5 选区

`setSelection(ids)`；适配器提供 `getDocumentIds(doc)` 时，文档变更（update/undo/redo/revert/commit）
会把集合外的 id 修剪掉（对齐 hmi "commit 后修剪 selection 到仍存在的 id"）。

## 3. 适配器注册表

`registerEditorDomain(adapter)` / `getEditorDomain(kind)` / `listEditorDomains()` /
`clearEditorDomains()`——机制蓝本为 `flow-designer-core/src/tree-domain.ts`。
**与 tree-domain 的差异（裁定）**：重复注册**覆盖**（同 kind 再注册以新 adapter 为准，不抛错）——
editor-core 是领域适配层，测试/示例/多实例场景允许重注册以最新实现为准；覆盖行为有单测锁定。

## 4. diff/applyDiff 契约（forward/inverse 对称）

- `diff(prev, next)`：prev→next 增量；结构化相同返回 `null`（无变更，不入栈、dirty=false）。
- `applyDiff(doc, diff)`：纯函数，返回新文档，不就地修改入参。
- 对称性（单测锁定）：`applyDiff(applyDiff(doc, forward), inverse)` 深等于 `doc`。

## 5. 拒绝的替代方案

| 方案                                   | 拒绝原因                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 原样复用 `ScadaEditorSession`          | 深绑定 SCADA（ScadaConfig/ScadaSymbolNode/cloneConfigSnapshot/leafer），无法被 dashboard 等域复用 |
| meta2d 历史栈直接搬入                  | meta2d 栈是画布对象命令，非文档 diff 命令栈；领域无关内核应持有 forward/inverse 增量 diff         |
| 注册表重复注册抛错（对齐 tree-domain） | 领域适配层重注册覆盖更符合"最新实现为准"；行为已单测锁定（§3）                                    |
| commit 清空 undo 栈                    | 与 hmi `save()` 语义不一致（save 不清栈），会破坏迁移兼容                                         |

## 6. 迁移就绪矩阵（hmi-editor → editor-core，完整走查 2026-08-09）

> 对照 `flux-renderers-industrial/src/editor/`：`editor-session.ts` / `undo-redo/undo-stack.ts` /
> `editor-working-helpers.ts`（cloneConfigSnapshot）/ `ScadaCommitPolicy` / `serialization/config-types.ts`（ScadaConfigDiff）。
> 覆盖状态：直接映射 / 需适配 / 缺口。

| hmi 面                                                                 | editor-core 映射                                                                                                                                                   | 覆盖状态                                                                                                          |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `ScadaEditorSession.workingConfig`                                     | `EditorSessionState.working`                                                                                                                                       | 直接映射                                                                                                          |
| `ScadaEditorSession.committedBaseline`                                 | `EditorSessionState.committed`                                                                                                                                     | 直接映射                                                                                                          |
| `ScadaEditorSession.selection`                                         | `EditorSessionState.selection`（经 `getDocumentIds` 修剪）                                                                                                         | 直接映射                                                                                                          |
| `ScadaEditorSession.mode`                                              | `EditorSessionState.mode`（`setMode` 不泄漏会话）                                                                                                                  | 直接映射                                                                                                          |
| `ScadaEditorSession.undoStack`（UndoStack 一体双栈）                   | `UndoCommandStack`（core 内部持有，`EditorSessionState` 只投影 canUndo/canRedo/深度）                                                                              | 直接映射                                                                                                          |
| `createScadaEditorSession`（双文档深拷贝隔离）                         | `createEditorCore`（`cloneDocument` = structuredClone 深隔离）                                                                                                     | 直接映射                                                                                                          |
| `resetSession`（load：替换双文档 + 清选区 + 清栈）                     | 新 core 重建（dispose 旧会话 + `createEditorCore(initialDocument)`）                                                                                               | 需适配（组合语义，dashboard 已示范 push-back 重建）                                                               |
| `cloneConfigSnapshot`                                                  | `cloneDocument`                                                                                                                                                    | 直接映射（单一 clone 实现约定）                                                                                   |
| `ScadaCommitPolicy`（manual/auto）                                     | `EditorCommitPolicy`（auto 每次变更自动 commit + onCommitted）                                                                                                     | 直接映射                                                                                                          |
| `ScadaEditorSessionChangePayload`（canUndo/canRedo/selection/mode）    | `EditorSessionState` 投影（subscribe/getState）                                                                                                                    | 直接映射                                                                                                          |
| `ScadaConfigDiff`（added/removed/updated/variables/reordered）         | `EditorDomainAdapter.diff/applyDiff`（`DashboardLayoutDiff` 同构：patches/added/removed）                                                                          | 需适配（ScadaConfigDiff 迁为 dashboard-adapter 同形的域 adapter 实现；z-order `reordered` 语义需 adapter 侧携带） |
| `UndoStack` 事务（begin/commit/abortTransaction，一拖拽 = 一 undo 步） | `EditorCore.beginTransaction/endTransaction/abortTransaction`                                                                                                      | 直接映射                                                                                                          |
| `UndoStack` 合并（coalesceGroup + replaceUndoTop）                     | **缺口**：editor-core 栈无跨操作合并 API（`UndoCommandStack` 无 replaceUndoTop/coalesce）；dashboard 无合并诉求，hmi 迁移需补 `replaceUndoTop`/合并钩子（见 §6.1） | 需适配（缺口）                                                                                                    |
| `UndoStack` dropUndoTop（applyDiff 失败回滚）                          | `undo()/redo()` apply 失败时不移栈（warn + false）——语义等价但无显式 drop API                                                                                      | 直接映射（行为等价）                                                                                              |
| `EditorOperationKind`（transform-move 等 13 类）                       | `EditorDiffEntry.operationKind?`（自由字符串）                                                                                                                     | 直接映射                                                                                                          |
| 领域命令面（addSymbol/group/ungroup/save/load/undo/redo 18 句柄）      | `useDashboardEditorHandles` 模式（save/undo/redo/getLayout）+ `adapter.domainCommands` 声明                                                                        | 需适配（SCADA 句柄逐个迁为域实现）                                                                                |
| `MAX_UNDO_STACK_DEPTH`（100）                                          | `UndoCommandStack` 同值缺省                                                                                                                                        | 直接映射                                                                                                          |

### 6.1 迁移结论（完整走查）

- **会话/undo/提交/双态语义全覆盖**：working/committed 隔离、diff 命令栈（forward/inverse 对称）、
  事务（一拖拽 = 一 undo 步）、commit 后栈保留、mode 双态无泄漏——editor-core 无需新增内核能力。
- **唯一语义缺口**：`UndoStack` 的跨操作合并（coalesceGroup + replaceUndoTop，design-undo-redo.md
  §4.4）——editor-core 栈无合并 API。dashboard 域无合并诉求；hmi 迁移时需在 `UndoCommandStack`
  增 `replaceUndoTop`/合并钩子（向后兼容新增，不影响现有契约）。
- **适配面集中在域 adapter**：`ScadaConfigDiff` 迁为域 adapter 的 diff/applyDiff 实现（结构与
  `DashboardLayoutDiff` 同形，z-order `reordered` 语义由 adapter 承载）；18 个 component 句柄逐个
  迁为 `useDashboardEditorHandles` 同形注册。
- **风险**：hmi-editor 30+ 测试文件回归面（约 1400+ 测试）；迁移实施必须 failing-first 增量替换，
  见迁移 successor plan（plan `2026-08-09-dashboard-editor-with-editor-core-plan.md` Phase 5 记录）。

## 7. 消费侧

- React：`useSyncExternalStore(core.subscribe, core.getState)`（见 `flux-renderers-dashboard` editor）。
- 非 React：直接 `core.subscribe`/`core.getState`/`core.update`。
