# 02 Industrial HMI Editor Contract Wiring, Structure, Affordances, Tests, Perf

> Plan Status: active
> Last Reviewed: 2026-08-07
> Source: `docs/audits/2026-08-07-1835-multi-audit-industrial-hmi-editor.md`（P1-03 / P1-04 / P1-05 / P1-06 / P1-08 / P1-09 / P1-10 / P1-11 / P1-12 / P1-13）+ `docs/audits/2026-08-07-1835-open-audit-industrial-hmi-editor.md`（P1-B），mission `industrial-hmi-editor` / `packages/flux-renderers-industrial/src/editor/`
> Related: `docs/plans/2026-08-07-1835-1-industrial-hmi-editor-internal-correctness-reactivity-grouping-undo.md`（predecessor {1}，本 plan 依赖其 session 反应式通道做 UI 接线可验证性 + 共享 walker）、`docs/components/roadmap-industrial-hmi-editor.md`（Follow-up Backlog 收 40 条 P2）

## Purpose

把 2026-08-07 两份 open 审计中**同属「编辑器公开契约接线 / 文件结构 / UI affordance / 测试有效性 / 性能」结果面**的 11 条 P1 全部收口到：

- 公开契约（schema 事件 onSave/onLoad、prop commitPolicy、runtime 9 句柄、controlled-mode config/mode 推回、mode desync）全部 wired 并可被 host 行为验证；
- `use-editor-engine.ts` 拆至 ≤700 行，`pnpm check:oversized-code-files` 对 industrial 包 0 失败（恢复硬门禁）；
- delete / group / ungroup 从默认 UI 按钮 + 键盘层可达（M2 基础操作不再只靠 `component:*` handle / 测试 handle），raw `<textarea>` 换成 `@nop-chaos/ui`，palette drop 落在指针处；
- test false-green（zero-assertion `programmaticSelect` / 不可验证 `onReady`）修复，锁定上述契约接线；
- per-frame O(n²) transform drag 增量化，R7 包络在 1k 选区下达标。

11 条 P1 均已逐条核对 live repo（2026-08-07），均经源码/grep 确认（详见各 finding 与下方 baseline）。两份审计的 40 条 P2（open 8 + multi 32；两份 summary 表少计）不进本 plan，已 triage 到 roadmap Follow-up Backlog 新子节。同批 P1 的「内部数据模型 / 反应式 / 撤销完整性」结果面（9 条）由 predecessor {1} 收口。

11 条 P1 概要（逐条 live 确认见 `Current Baseline`）：

- **multi P1-03**：`use-editor-engine.ts` 824 行，`check:oversized-code-files` FAIL（E9 拆分后再膨胀）。
- **multi P1-04**：`onSave`/`onLoad` schema 事件声明但 0 dispatch 站点（`save`/`load` mutate state 不 dispatch）。
- **multi P1-05**：`commitPolicy` 注册 prop 但无消费者（`auto` 静默 no-op）。
- **multi P1-06**：runtime 9 句柄（含 `destroy`）对 editor renderer 未注册（只注册 9 editor 扩展方法）。
- **multi P1-08**：`engine.mode` 硬编码 `'edit'`，`initialMode:'preview'` 时 session.mode 与 engine.mode desync（R5）。
- **multi P1-09**：controlled-mode `config`/`mode` prop 变化静默忽略（mount-once guard，无 prop watcher）。
- **multi P1-10**：toolbox import 对话框用 raw `<textarea>`，违反 AGENTS.md MANDATORY UI Component Usage。
- **multi P1-11**：palette `onDrop` 硬编码 `(x:50,y:50)`，忽略指针位置。
- **multi P1-12**：test false-green——`programmaticSelect` 零 `expect()`、`onReady` dispatch test 不验证 `helpers.dispatch`。
- **multi P1-13**：per-frame O(n²)，`findNodeInWorking` 在 junction 重算循环内逐个 O(n) 调用。
- **open P1-B**：delete/group/ungroup 无默认 UI 按钮 + 零键盘快捷键（grep `keydown|ctrlKey|metaKey` 0 hits）。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-07），下列事实均经源码/grep 确认。

- **predecessor {1} 依赖**：本 plan Phase 2/3 的 UI 接线可验证性依赖 {1} Phase 1 的 session 反应式通道（否则 onSave dispatch 后 panel 不刷新、无法 RTL 断言）。{1} 须先于本 plan 执行。{1} 的共享 walker（`collectAllSymbols`/`collectWorldBounds`）可被本 plan Phase 3 palette-drop / 选中逻辑复用。
- **P1-03 已确认**：`wc -l use-editor-engine.ts` = 824 行；`pnpm check:oversized-code-files` 列出该文件（`>700` 硬限）。该单 hook 承载 6 责任带：engine mount/build、adapter+transform-transaction wiring、UndoRedoAdapter+9 mutators、E9.1 toolbox handle 全集、connection-drag controller+DOM pointer listeners、test-handle literal。E9 extraction 已证明此拆分机械（曾降至 ~710）。
- **P1-04 已确认**：grep `scada-editor:save` / `scada-editor:load` across `src/editor/` = 0 hits；`use-editor-engine.ts:573-597` `save`/`load` 返数据不 dispatch；canvas 仅 dispatch 5/7 事件（`onReady/onError/onSelectionChange/onModeChange/onSessionChange`）。
- **P1-05 已确认**：grep `props.props.commitPolicy` = 0 hits；`UseEditorEngineArgs` 无 `commitPolicy` 字段。
- **P1-06 已确认**：grep `useScadaHandles|SCADA_HANDLE_METHODS` across `src/editor/` = 仅 doc-comment 引用，从不 invoke；`EDITOR_HANDLE_METHODS` = 9 editor 方法 only。
- **P1-08 已确认**：`editor-engine.ts:57` `private mode: ScadaEditorMode = 'edit';`；`use-editor-engine.ts:201-211` session 拿 `initialMode` 但 build 后无 `engine.setMode(session.mode)`；现有 test 仅查 `data-mode` 属性漏过 desync。
- **P1-09 已确认**：`use-editor-engine.ts:183-184` mount-once guard（`if (runtimeRef.current) return;`）；`parsedConfig` 经 `useMemo` 重算但无 effect 推回 runtime；无 `mode` watcher。
- **P1-10 已确认**：`toolbox/toolbox-panel.tsx:177-183` raw `<textarea>`；兄弟 `inspector/inspector-field.tsx:2,38` 同包正确用 `<Textarea>` from `@nop-chaos/ui`。
- **P1-11 已确认**：`scada-editor-canvas.tsx:226-234` `onDrop` `addWorkingSymbol({..., x:50, y:50,...})` 忽略 `e.clientX/Y`；connection 子系统正确用 `getBoundingClientRect`+`engine.getWorldPoint`（`use-editor-engine.ts:616-619`）。
- **P1-12 已确认**：`editor-adapter.test.ts:182-193` `programmaticSelect`/`programmaticClearSelection` test body 零 `expect()`；`scada-editor-canvas-interaction.test.tsx:192-220` "dispatches onReady" 仅断言 `data-status==='ready'`，`vi.fn()` dead code。`scada-editor-canvas-ops.test.tsx:272-284`（move 不验证几何）/`:309-315`（group/ungroup 纯 `not.toThrow`）同形。
- **P1-13 已确认**：`editor-working-helpers.ts:60-82` k-loop 内逐 junction 调 O(n) `findNodeInWorking` + O(n) `collectSymbolBounds`；`editor-adapter.ts:84-94` per-node per-frame `onGeometryChange` × `s` 次。R7 包络（≥30fps @ ≤1k）runtime 复测见 `docs/analysis/industrial-hmi-editor/editing-envelope-retest-2026-08-07.md`（稳态 50fps 达标，但算法 superlinear 未增量化收敛）。
- **P1-B 已确认**：默认 layout（canvas:218-253）render palette/canvas/inspector/toolbox/status bar，无 delete/group/ungroup affordance；toolbox 6 个 `<ButtonGroup>`（view/align-distribute/z-order/clipboard/undo-redo/import-export，`toolbox-panel.tsx:119-162`）无 group/ungroup/delete；grep `keydown|keyup|ctrlKey|metaKey` across `src/editor/` = 0 hits（仅 test-handle teardown 的 `delete window[...]`）。`removeSymbol`/`group`/`ungroup` 已注册为 `component:*` handle（`use-editor-handles.ts:12-22,72-130`），host 可自接，默认 panel 不接。
- **受影响 owner doc**：`design-renderer.md`（§4.1/§4.2/§4.3/§4.5/§8.3/§8.5/§8.5.1/§8.5.2 事件+句柄+controlled+commit 契约）、`design-architecture.md §11`（文件结构树）、`flux-guide/design-patterns/scada-editor.md`（toolbox sub-handle 完整列表）、`quick-reference.md`（failure-code 列表）。

## Goals

- **11 条 P1 全部收口**：契约接线（P1-04/05/06/08/09）行为可验证；结构（P1-03）gate 绿；UI affordance（P1-B/10/11）默认可达；测试有效性（P1-12）false-green 修复；性能（P1-13）增量化。
- **契约接线扫描闭环**：把「declared-but-unwired」（同形于历史 E8 M-1）的 schema 事件 / prop / handle / controlled-push-back / mode-sync 全部接到 engine，每个配行为断言。
- **delete/group/ungroup 从默认 UI + 键盘可达**：补默认 toolbox 按钮 + canvas 键盘层（Delete/Ctrl+Z/Y/Ctrl+G/Ctrl+Shift+G/arrows），并配「驱动默认 UI（非测试 handle）」的 e2e。
- **`use-editor-engine.ts` 拆分**为 ~250 行生命周期编排 + 责任带模块，恢复 oversized 硬门禁。
- **owner doc 同步**到 live baseline（§8 句柄/事件面、§11 文件树、flux-guide 完整列表）。

## Non-Goals

- 不处理 40 条 P2（已 triage 到 roadmap Follow-up Backlog）。
- 不做内部数据模型 / 反应式 / 撤销完整性（{1} 9 P1 已收口）；本 plan 复用 {1} 的反应式通道与共享 walker，不重做。
- 不重新仲裁三态 ownership（local/controlled/scope）——controlled push-back（P1-09）取「加 effect 推回 + 循环协调」或「文档标 initial-only」二选一于 Phase 2 裁定，三态 ownership 是 future work（design §4.5 已注明）。
- 不改 R5 双态隔离边界（multi-audit 确认健全）。
- 不做 multi P2 的 React 19 冗余 useMemo/useCallback 清理（opportunistic）。

## Scope

### In Scope

- 拆分 `use-editor-engine.ts`（824）→ `editor/runtime-factories.ts` + `editor/runtime-mutators.ts` + `editor/toolbox-runtime.ts` + `editor/connection-wiring.ts` + `editor/test-handle-factory.ts` + 宿主 hook（~250）。
- `scada-editor-canvas.tsx`（P1-09 controlled watcher；P1-11 palette drop 指针坐标；默认 layout 补 delete/group/ungroup 按钮 + 键盘层；P1-04 onSave/onLoad dispatch 透传）、`use-editor-engine.ts`（P1-04 save/load dispatch；P1-05 commitPolicy 消费；P1-08 build 后 setMode；P1-09 controlled watcher runtime.load/switchMode）、`renderer/editor-engine.ts`（P1-08 mode 默认值校正）、`renderer/hooks/use-editor-handles.ts`（P1-06 注册 runtime 9 句柄委派）、`renderer-definitions.ts`/`schemas.ts`（P1-05 commitPolicy 透传 type）。
- `toolbox/toolbox-panel.tsx`（P1-10 raw `<textarea>` → `<Textarea>`；补 delete/group/ungroup 按钮）。
- 测试修复（P1-12）：`editor-adapter.test.ts`（programmaticSelect 断言 editor 状态）、`scada-editor-canvas-interaction.test.tsx`（注入 `dispatch: vi.fn()` 断言 mock.calls）、`scada-editor-canvas-ops.test.tsx`（move 验证几何 / group-ungroup 真实 mutation）。
- 性能（P1-13）：`recomputeLinkagesForMovedNode` 增 `Map<id,node>` O(1) lookup + 复用单一 `collectSymbolBounds` + 单帧 trailing `syncWorkingCopy`；`applyPatchToWorkingNode` 接预解析 node ref。
- owner doc 同步：`design-renderer.md`（§8 事件/句柄/controlled/commit）、`design-architecture.md §11`（文件树）、`flux-guide/design-patterns/scada-editor.md`、`quick-reference.md`（failure-code）。

### Out Of Scope

- 29 条 P2、{1} 9 P1、三态 ownership、R5 隔离、React 19 冗余 memo 清理、ESLint max-lines 不触发的 tooling gap（multi P2）。

## Failure Paths

> 涉及公开契约（事件 / 句柄 / controlled push-back / mode 双态），列关键可测场景。

| 场景编号                      | 触发                                              | 行为                                                                               | 可重试 | 用户可见表现                                             |
| ----------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------- | ------ | -------------------------------------------------------- |
| `component-save-dispatches`   | host `events.onSave` 接收 + 调 `component:save()` | `runtime.save()` 序列化后 dispatch `scada-editor:save`（payload=serializedConfig） | 否     | host onSave action 收到 serializedConfig（非静默 no-op） |
| `commit-policy-auto-persists` | `commitPolicy:'auto'` + 编辑变更                  | `notifySession` 在 auto 时触发 save + onSave（编辑即持久化）                       | 是     | 编辑后 working=committed（非 manual 才提交）             |
| `destroy-lifecycle-reachable` | 调 `component:destroy()`                          | runtime 9 句柄可达 → `data-status="destroyed"`（§8.3 OP-4）                        | 否     | editor 进入 destroyed 态（非句柄不存在报错）             |
| `initial-mode-preview-safe`   | mount `mode:'preview'`                            | build 后 `engine.setMode('preview')` → symbols 不可编辑（R5）                      | 否     | preview 态无写能力（非 engine 仍 edit）                  |
| `controlled-config-pushback`  | host 改 `config` prop                             | effect 监听 parsedConfig → `runtime.load(next)`（或文档标 initial-only）           | 是     | 外部 config 变更反映进画布（非静默丢弃）                 |
| `palette-drop-at-pointer`     | 拖拽 palette symbol 到画布某处释放                | 用 `getBoundingClientRect`+`getWorldPoint` 算 world，symbol 居中指针处             | 否     | symbol 落在释放位置（非堆叠 (50,50)）                    |
| `delete-via-default-ui`       | 选中图元 → 点默认 Delete 按钮（或按 Delete 键）   | `removeWorkingSymbol(selection)` 移除 + 反应式刷新                                 | 是     | 默认 UI/键盘可删除图元（非仅 host 自接 handle）          |
| `z-order-perf-1k`             | 1k 选区 transform 拖拽                            | 单帧 O(s + k) 非 O(s·n)；稳态 ≥30fps                                               | 否     | 拖拽不丢帧（R7 包络维持）                                |

## Test Strategy

档位选择：**必须自动化**。

理由：契约接线（P1-04/05/06/08/09）是公开 contract break 且当前 CI 由 false-green（P1-12）掩盖；UI affordance（P1-B/10/11）是可达性/可操作性缺陷；P1-03 是 CI hard gate；P1-13 是性能回归路径。属「核心回归路径」且「测试先红后绿」。P1-B 的 delete/group/ungroup 须加「驱动默认 UI（非测试 handle）」的 e2e（per roadmap 测试纪律：canvas 渲染走 Playwright 程序化断言，禁截图判定）。P1-12 的 Proof 先于对应契约 Fix 落地。

## Execution Plan

### Phase 1 - 拆分 use-editor-engine.ts + 恢复 oversized 硬门禁（multi P1-03）

Status: planned
Targets: `packages/flux-renderers-industrial/src/editor/renderer/hooks/use-editor-engine.ts`（824 → 宿主 ~250）+ 新建 `editor/runtime-factories.ts` / `runtime-mutators.ts` / `toolbox-runtime.ts` / `connection-wiring.ts` / `test-handle-factory.ts`

- Item Types: `Fix | Proof`

- [ ] `Fix`：抽出纯工厂 → `runtime-factories.ts`（ScadaEditorEngine mount/build 装配）。
- [ ] `Fix`：抽出 9 mutators → `runtime-mutators.ts`（闭包稳定 4-tuple refs）。
- [ ] `Fix`：抽出 E9.1 toolbox handle 全集 → `toolbox-runtime.ts`。
- [ ] `Fix`：抽出 connection-drag controller wiring + DOM pointer listeners → `connection-wiring.ts`（返 cleanup fn）。
- [ ] `Fix`：抽出 test-handle literal → `test-handle-factory.ts`（`buildEditorTestHandle`）。
- [ ] `Fix`：宿主 hook 收窄为 ~250 行生命周期编排。
- [ ] `Proof`：`wc -l use-editor-engine.ts` ≤700；`pnpm check:oversized-code-files` 对 industrial 包 0 失败；`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/test` 绿（行为不变，纯机械迁移）。

Exit Criteria:

- [ ] `use-editor-engine.ts` ≤700 行；`check:oversized-code-files` industrial 包 0 失败。
- [ ] 包级 typecheck/test 绿（机械迁移无行为回归）。
- [ ] 后续 Phase 的改动落在新拆分模块（gate 不再回退）。

### Phase 2 - 公开契约接线扫描（multi P1-04 + P1-05 + P1-06 + P1-08 + P1-09）

Status: planned
Targets: `scada-editor-canvas.tsx`、`use-editor-engine.ts`（+ 拆分模块）、`renderer/editor-engine.ts`、`renderer/hooks/use-editor-handles.ts`、`renderer-definitions.ts`、`schemas.ts`

- Item Types: `Fix | Proof | Decision`

- [ ] `Proof`（先红）：契约 dispatch proof——注入 `dispatch: vi.fn()`，调 `component:save()`/`load()`，断言 `dispatch.mock.calls` 含 `scada-editor:save`/`load`（红：当前 0 dispatch）；onReady/onError/onModeChange 同法补全断言（关 P1-12 的 onReady false-green）。
- [ ] `Fix`（P1-04）：`UseEditorEngineArgs` 增 `onSave?`/`onLoad?`；`runtime.save()`/`load()` 经 `dispatchEvent` 派发 `scada-editor:save`/`load`；canvas 透传 events 到 hook。
- [ ] `Decision` + `Fix`（P1-05）：裁定 commitPolicy 消费方式——方案 A（`notifySession` auto 时触发 save+onSave）vs 方案 B（标 `kind:'ignored'` + dev 警告）。采 A 则接线；记录裁定。
- [ ] `Fix`（P1-06）：在 `useEditorHandles` 注册 **全部 runtime 9 方法**（`fit`/`center`/`getSymbols`/`getSymbol`/`setPointValue`/`getPointTable`/`exportConfig`/`importConfig`/`destroy`），各自委派 `EditorEngineRuntime` 的等价能力（`fitView`/`centerView`/`getSymbols`/`engine.getSymbol`/`setPointValue`/`getPointTable`/`exportConfig`/`importConfig`/`engine.destroy`），或从 editor renderer 调 `useScadaHandles` 适配。
- [ ] `Fix`（P1-08）：`editor-engine.ts:57` mode 默认值校正 + `use-editor-engine.ts` build 后 `if (session.mode !== engine.currentMode) engine.setMode(session.mode)`。
- [ ] `Decision` + `Fix`（P1-09）：裁定 controlled-mode——方案 A（加 `useEffect([parsedConfig]) → runtime.load` + `mode` watcher + 循环协调）vs 方案 B（文档标 `config`/`mode` 为 initial-only 并移出 reactive）。记录裁定并落地。
- [ ] `Proof`：8 个 Failure Path 场景中契约相关项（component-save-dispatches / commit-policy-auto-persists / destroy-lifecycle-reachable / initial-mode-preview-safe / controlled-config-pushback）行为断言绿。

Exit Criteria:

- [ ] 契约 dispatch proof 全绿（save/load/onReady/onError/onModeChange 经 `dispatch.mock.calls` 验证）。
- [ ] P1-05/P1-09 的 Decision 记录在案 + 选定方案落地。
- [ ] runtime 9 句柄（含 destroy）从 editor instance 可达；`initialMode:'preview'` mount 后 symbols 不可编辑（R5）。
- [ ] 局部 typecheck 通过。

### Phase 3 - UI affordance + 键盘层 + raw-textarea + palette-drop（open P1-B + multi P1-10 + P1-11）

Status: planned
Targets: `scada-editor-canvas.tsx`（默认 layout 补按钮 + 键盘层；palette drop 坐标）、`toolbox/toolbox-panel.tsx`（delete/group/ungroup 按钮 + raw `<textarea>`→`<Textarea>`）

- Item Types: `Fix | Proof`

- [ ] `Fix`（P1-10）：`toolbox-panel.tsx:177-183` raw `<textarea>` → `<Textarea ... data-slot="...">` from `@nop-chaos/ui`。
- [ ] `Fix`（P1-11）：`onDrop` 用 `getBoundingClientRect`+`engine.getWorldPoint` 算 world，symbol 居中指针处（复用 `use-editor-engine.ts:616-619` 管线 + {1} 共享 walker）。
- [ ] `Fix`（P1-B UI）：默认 toolbox 补 Delete / Group / Ungroup 按钮（runtime 已有对应方法）。
- [ ] `Fix`（P1-B 键盘）：canvas 容器接键盘层——Delete→`removeWorkingSymbol(selection)`、Ctrl+Z/Y→undo/redo、Ctrl+G/Ctrl+Shift+G→group/ungroup、arrows→nudge；`onKeyDown` 挂 canvas container。
- [ ] `Proof`：palette-drop-at-pointer 场景绿（symbol 落释放位置）；delete-via-default-ui 场景绿——**驱动默认 UI 按钮 + 键盘（非测试 handle）**的 Playwright e2e：选中图元→Delete 键删除、Ctrl+G group、Ctrl+Shift+G ungroup，断言场景树变化。

Exit Criteria:

- [ ] raw `<textarea>` 消失（grep 确认）；import 对话框用 `@nop-chaos/ui` `<Textarea>`。
- [ ] palette drop 落指针处 proof 绿。
- [ ] delete/group/ungroup 从默认 UI 按钮 + 键盘可达的 e2e 绿（驱动默认 UI 非 test handle）。
- [ ] grep `keydown` 在 `src/editor/` 有命中（键盘层落地）。

### Phase 4 - 性能增量化（multi P1-13）

Status: planned
Targets: `editor-working-helpers.ts`（`recomputeLinkagesForMovedNode` O(1) lookup + 复用 bounds）、`editor-adapter.ts`/`use-editor-engine.ts` 拆分模块（trailing syncWorkingCopy）

- Item Types: `Fix | Proof`

- [ ] `Fix`：`recomputeLinkagesForMovedNode` 顶部建 `Map<id, ScadaSymbolNode>`，per-junction `findNodeInWorking` → O(1) lookup；单次 `collectSymbolBounds` 复用跨 junction。
- [ ] `Fix`：`syncWorkingCopy` 批为单帧一次 trailing call（去掉 s 乘子）；`applyPatchToWorkingNode` 接预解析 node ref（adapter 已有 `engine.getSymbol`）。
- [ ] `Proof`：z-order-perf-1k 场景——1k 选区 transform 拖拽单帧 O(s+k) 非 O(s·n)；稳态 ≥30fps（对照 `editing-envelope-retest-2026-08-07.md` §3，R7 包络维持）。

Exit Criteria:

- [ ] 算法 superlinear 收敛为 O(s + k) per frame；R7 包络（≥30fps @ ≤1k）复测达标。
- [ ] 无 per-junction O(n) `findNodeInWorking` 残留（grep/审阅确认）。

### Phase 5 - 测试有效性修复（multi P1-12）

Status: planned
Targets: `editor/renderer/editor-adapter.test.ts`、`scada-editor-canvas-interaction.test.tsx`、`scada-editor-canvas-ops.test.tsx`

- Item Types: `Fix | Proof`

- [ ] `Fix`：`editor-adapter.test.ts:182-193` `programmaticSelect`/`programmaticClearSelection` 补 `expect()` 断言 post-call editor 状态（mock editor target 注入 + 断言）。
- [ ] `Fix`：`scada-editor-canvas-interaction.test.tsx` onReady/onError/onModeChange 注入 `dispatch: vi.fn()` 并断言 `dispatch.mock.calls`（与 Phase 2 契约 proof 合并则引用之）。
- [ ] `Fix`：`scada-editor-canvas-ops.test.tsx:272-284` move test 补几何断言（验证 node 实际移动坐标）；`:309-315` group/ungroup test 改驱动真实 mutation（多元素 group + ungroup 实际结构变化断言）。
- [ ] `Proof`：上述 test body 不再是纯 `not.toThrow` / 零 expect；回归「移除 dispatch 实现会让 test 红」（反向验证有效）。

Exit Criteria:

- [ ] 全部 P1-12 标记的 false-green test body 含结果值/状态/dispatch 断言（非 call-count-only 或零 expect）。
- [ ] 至少一条「移除被测实现 → test 红」的反向验证记录。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立子 agent（fresh session）填写。

- Reviewer / Agent: 独立 fresh-session sub-agent `ses_023f88532ffei6YeO2cc5SngZV`（不复用起草上下文）
- Verdict: `pass-with-minors`
- Rounds: 1（Round 1 即达成共识，未超 2 轮上限）
- Findings addressed:
  - 覆盖核对：11/11 P1 全部落位；与 {1} 合计 20/20；confirmed live defect / hard gate 全部 `Fix` 类型（Rule 13/15 合规）。
  - 引用准确性：25+ 处代码锚点逐一对 live repo 复核全部准确（oversized 824 行 + gate exit / `scada-editor:save` grep 0 / `commitPolicy` 无消费者 / `useScadaHandles` grep 0 / mode 硬编码 'edit' / mount-once guard / raw `<textarea>` / palette drop (50,50) / programmaticSelect 零 expect / O(n²) k-loop 等）。
  - 拆分裁定（Rules 22–26）：defensible——oversized gate 形成干净结构缝（{1} 不持有它，{2} Phase 1 显式恢复）。
- Minors（非阻断，已处理）：
  - P2 计数「29」修正为 40（open 8 含 C4 + multi 32）——已全文修正。
  - P1-06 Fix 项 runtime 句柄枚举由 6 补全为全部 9 个（`fit`/`center`/`getSymbols`/`getSymbol`/`setPointValue`/`getPointTable`/`exportConfig`/`importConfig`/`destroy`）——已修正。
  - toolbox button-group 计数「7」修正为 6（live `toolbox-panel.tsx:119-162` 实测 6 个 `<ButtonGroup>`）——已修正。
- 剩余 Minor（接受为非阻断，不返工）：P1-12 跨 Phase 2 Proof + Phase 5 Fix 的归属交叉引用（已在 Phase 5 注明指向 Phase 2 Proof）。

> 共识达成（0 Blocker / 0 Major），plan 由 `draft` 升级为 `active`，进入执行队列。

## Closure Gates

> **全量验证归此处**。本 plan 含 oversized 硬门禁恢复（P1-03），故 `check:oversized-code-files` 列入 closure。

- [ ] 11 条 P1 confirmed live defect 全部修复（契约接线 / 结构 / UI affordance / 测试有效性 / 性能）
- [ ] 公开契约（onSave/onLoad/commitPolicy/runtime 9 句柄/controlled-push-back/mode-sync）全部 wired 并行为验证
- [ ] `use-editor-engine.ts` ≤700 行；`pnpm check:oversized-code-files` industrial 包 0 失败
- [ ] delete/group/ungroup 从默认 UI + 键盘可达（e2e 驱动默认 UI）
- [ ] test false-green（P1-12）修复，锁定契约接线
- [ ] per-frame O(n²) 增量化，R7 包络复测达标
- [ ] 全部 P1 各配 focused regression / e2e proof（断言结果值/可达性，非仅 not.toThrow）
- [ ] 受影响 owner docs（`design-renderer.md §8` / `design-architecture.md §11` / `flux-guide/design-patterns/scada-editor.md` / `quick-reference.md`）同步到 live baseline
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check:oversized-code-files`（industrial 包 0 失败）

## Non-Blocking Follow-ups

- ESLint `max-lines`（710）已配但不对 `use-editor-engine.ts` 触发的 tooling gap（multi P2）——独立工具项，不阻塞 closure；`check:oversized-code-files` 已兜底捕获。
- multi P2 的 React 19 冗余 `useMemo`/`useCallback` 清理（`use-editor-engine.ts:160-181` 的 2 个 `useCallback` 是 load-bearing，保留）——opportunistic。
- multi P2 的 errorMessage 丢 cause / mutator 无 try/catch / mount effect 无 try/catch / attachEditorAdapter fail-open——错误传播 robustness 项，P2 backlog。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立子 agent（fresh session）>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- 29 条 P2 在 roadmap Follow-up Backlog「2026-08-07-1835 post-remediation audit P2」追踪（实际 40 条；open 8 含 C4 + multi 32，两份 summary 表少计）
- predecessor {1} 的 9 P1 已由 {1} 收口
- 或明确写 no remaining plan-owned work
