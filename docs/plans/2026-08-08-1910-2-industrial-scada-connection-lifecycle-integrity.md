# 2 Industrial SCADA Connection Lifecycle & Editor Rollback Integrity

> Plan Status: active
> Last Reviewed: 2026-08-08
> Source: `docs/audits/2026-08-08-1712-open-audit-industrial-hmi-component-audit.md` (A2, A6, A7, A8)
> Related: `docs/backlog/industrial-hmi-component-audit-roadmap.md`; first-wave sibling plans `2026-08-08-1809-{1,2,3}-*`（validation / editor state / canvas correctness）；本 plan 与 `2026-08-08-1809-2`（editor state：F3 node-id 去重 / P1-1 事务 abort / P1-3 selection 修剪）互补——后者管「node id 空间 + 事务态 + selection」，本 plan 管「connection 声明生命周期 + 引擎回滚」。
> Execution Order: {2} — 与 plan {1}（symbols 几何，含 P0）独立；与 first-wave `2026-08-08-1809-2`（editor state）共享 `runtime-mutators.ts` 落点但触及不同函数（removeWorkingSymbol / applyUndoRedoDiff vs addWorkingSymbol / load），可并行；建议在 1809-2 之后执行以复用其 selection/transaction 对账纪律。

## Purpose

收口编辑器「config 变更后 connection 声明生命周期断裂 + 引擎场景回滚缺失」的 4 个 P1：

- **A2**：生产连线拖拽恒生成 `${junctionId}-conn-0`。`connection-wiring.ts:54` prod pointerdown → `connectionController.beginDrag(junction.id)` 只传 junctionId；`connection-adapter.ts:76` `beginConnectionDrag` 用空数组 `generateConnectionId(junctionId, [])` → 恒 `conn-0`；`commitConnectionDrag:142-148` 按 connectionId findIndex，第二次拖拽 idx≥0 → `next[idx]=written` **静默覆盖**前一条连线。结果：pipe-junction 经编辑器 UI 最多只能持 1 条连线（junction 扇出到多设备是 SCADA 核心原语）。e2e 走测试句柄 `handle.connection.connect`（显式 connectionId，`programmaticConnect` 直接 push），故完全绕过该路径——缺陷纯 prod、测试不可见。
- **A6**：`applyUndoRedoDiff`（`runtime-mutators.ts:100-113`）try 内先 `undoRedo.applyDiff`（working copy）再 `engine.applyDiff`；catch 仅 `session.workingConfig = beforeWorking` 回滚 working copy，**不回滚引擎**、`synced.config` 不回滚。`engine.applyDiff`（remove→build→update→reorder）无内部回滚，半途抛错时 leafer 树已半变。若 `synced.config === beforeWorking`（无待提交变更），下一轮 `syncWorkingCopy` diff 为空 → 引擎**永不愈合**，画布与 working copy/栈永久背离。
- **A7**：剪贴板 `reassignIdsRecursive`（`clipboard.ts:96-103`）只改 `node.id`/子树 id，**不**改 `node.custom.connections`。粘贴含连线的 junction：`connection.id` 仍是原件的（重复 id）；`connection.target` 仍指**原件** target id。若 target 同在选区被一起复制，副本 junction 连线指向原件而非副本；若 target 未被复制，副本静默重连到画布上的原件 target。
- **A8**：`removeWorkingSymbol`（`runtime-mutators.ts:84-91`）/`cutSelection`（`toolbox-runtime.ts`）删节点时仅 filter 节点，**不清理**其它 junction 上 `connection.target===被删id` 的连线声明 → 保存后成永久 dangling 数据污染（`listAllConnections` 的 dangling 检测恰恰证明此态被容忍而非清除）。

四者同属「编辑器把外部 config / 选区 / 拖拽 / undo 纳入 working copy 时，connection 声明与引擎场景没有单一 owner 在每个边界做全量对账」。与 first-wave 1809-2（node id + 事务态 + selection）互补，共同收口「config 入 working copy 边界」这条数据完整性咽喉。

## Current Baseline

- `editor/connection/connection-drag-controller.ts:73-78` `beginDrag(junctionId)`：只传 junctionId 给 `beginConnectionDrag({junctionId})`，有 `deps.findNode`/`getSymbols` 却不读现有 connections；`:107-111` endDrag → `commitConnectionDrag`。
- `editor/connection/connection-adapter.ts:67-80` `beginConnectionDrag`：`connectionId: args.connectionId ?? generateConnectionId(args.junctionId, [])`（prod 不传 connectionId → 空数组）；`:126-156` `commitConnectionDrag`：`idx = connections.findIndex(c=>c.id===state.connectionId)`；idx≥0 → `next[idx]=written`（覆盖），else push。`isRedrag`/`originalConnection` 分支因 prod 永不传 `existingConnection` 而为死代码。
- `editor/connection/anchor-snap.ts:144-153` `generateConnectionId(junctionId, existing)`：`index = existing.length`，空数组 → 恒 `${junctionId}-conn-0`；`:158` `readConnections(custom)` 已存在（抽取 junction custom.connections）。
- `editor/connection-wiring.ts:54` prod pointerdown → `connectionController.beginDrag(junction.id)`（确认 prod 唯一入口）。
- `editor/runtime-mutators.ts:84-91` `removeWorkingSymbol`：`session.workingConfig.symbols = symbols.filter(n=>n.id!==nodeId)` + deselect + pushOperation + syncWorkingCopy，**不扫**其它 junction 的 `connection.target`；`:100-113` `applyUndoRedoDiff`：try 内 `undoRedo.applyDiff` + `engine.applyDiff` + `synced.config=clone` + commit + notify；catch 仅 `session.workingConfig=beforeWorking` + onError，**不回滚 engine、不回滚 synced.config**。
- `editor/toolbox-runtime.ts` `cutSelection`（audit 标注 :174-191 同型 removeWorkingSymbol，删节点不 prune dangling connection）；`importConfig`/`load` 的 abortTransaction 已在 first-wave 1809-2 覆盖。
- `editor/renderer/editor-engine.ts` `applyDiff`（remove→build→update→reorder，无内部回滚）；`engine.build(config)` 可全量重建（leafer 无事务）。
- `editor/toolbox/clipboard.ts:64-91` `buildClipboardPaste`：`${id}-copy-${counter}` 不碰撞检查；`:96-103` `reassignIdsRecursive` 只改 `node.id` + 递归 children id，**不**改 `node.custom.connections`（connection.id / connection.target 原样保留）；`:105-112` `cloneNodeDeep` 已深克隆 custom（含 connections）——故副本 connection 与原件不共享引用，但 id/target 值仍是原件的。
- 机械门禁全绿（~1340 tests）。first-wave 1809-2 已覆盖 F3（node id 去重）/P1-1（事务 abort）/P1-3（selection 修剪），但未触及 connection 声明生命周期与引擎回滚。

## Goals

- A2：生产 UI 同一 junction 连续拖出多条连线不再互相覆盖；每次拖拽生成不碰撞 connectionId，commit 端 push 而非覆盖。
- A6：`engine.applyDiff` 半途抛错时，引擎场景回滚到调用前态（或显式标 desync 触发下轮全量同步），画布与 working copy/栈不永久背离。
- A7：粘贴含连线的子图时，副本 connection.id 不与原件重复、connection.target 重写到对应副本（命中副本映射用副本 id，未命中按 dangling 策略处理）。
- A8：删除被连线的设备节点时，其它 junction 上 `target===被删id` 的 connection 声明同 diff 内 prune（inverse 保留以便 undo 恢复）。
- 每条 Fix 配 failing-first 回归测试断言**可观测结果**（connection 数组内容 / engine 场景一致性），且 A2/A7/A8 至少跨 data 层（workingConfig custom.connections）断言。

## Non-Goals

- 不改 node id 去重 / 事务 abort / selection 修剪（F3/P1-1/P1-3，归属 first-wave 1809-2）。
- 不改 `diffScadaConfig` 递归 / `applyUpdate` children / 结构 mutator 嵌套（P1-2/P1-4，归属 first-wave 1809-3）。
- 不改 clipboard paste 的 `${id}-copy-${counter}` 碰撞检查（P2，归 backlog；本计划只改 connection.target/id 重写，node id 碰撞由 1809-2 的 node-id 纪律 + 本计划映射兜底）。
- 不改 `listAllConnections` dangling 检测的「容忍」语义（本计划在删除边界主动 prune，检测器保留作为诊断）。
- 不改 public 导出面（runtime 句柄签名不变）。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/editor/connection/connection-drag-controller.ts`（`beginDrag` 读现有 connections 传入）。
- `packages/flux-renderers-industrial/src/editor/connection/connection-adapter.ts`（`beginConnectionDrag` 接 `existingConnections` 喂 id 生成器；commit 端不命中即 push）。
- `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts`（`removeWorkingSymbol` prune dangling connection；`applyUndoRedoDiff` catch 回滚引擎）。
- `packages/flux-renderers-industrial/src/editor/toolbox-runtime.ts`（`cutSelection` 同型 prune dangling connection）。
- `packages/flux-renderers-industrial/src/editor/toolbox/clipboard.ts`（`buildClipboardPaste` 建 oldId→newId 全图映射，重写 connection.target/id）。
- `packages/flux-renderers-industrial/src/editor/renderer/editor-engine.ts`（如 A6 选择经 `engine.build(beforeWorking)` 全量重建，则在此暴露/复用）。
- 对应 connection / clipboard / undo-rollback 测试增 failing-first 用例。

### Out Of Scope

- `serialization/**`（归属 1809-1）。
- symbols 几何（归属本批 plan {1}）。
- viewport/meta 契约（归属本批 plan {3}）。
- connection overlay 渲染 / anchor-snap 数学（无 P1；align/distribute 局部坐标 P2 归 backlog）。

## Failure Paths

| 场景编号             | 触发                                                                                 | 行为                                                                                    | 可重试 | 用户可见表现                   |
| -------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------ | ------------------------------ |
| CONN-multi-drag      | 同 junction 经 UI 连续拖到 target-A 再拖到 target-B                                  | 两条 connections 并存（conn-0 + conn-1），不覆盖                                        | 否     | junction 扇出到多设备正常      |
| CONN-rollback-throw  | `applyUndoRedoDiff` 中 `engine.applyDiff` 抛错（mock unknown type / buildNode 失败） | engine 场景回到调用前态（或下轮全量同步愈合），working copy 与 engine 一致              | 否     | 画布不与 working copy 永久背离 |
| CONN-paste-wired     | 复制 junction+target → 粘贴                                                          | 副本 junction 的 connection.target 指向副本 target；connection.id 不与原件重复          | 否     | 副本子图内部连线如原件         |
| CONN-delete-dangling | 删一个被 junction 连线的设备                                                         | 其它 junction 上 target===被删id 的 connection 同 diff 内 prune（inverse 可 undo 恢复） | 否     | 保存后 config 无幽灵引用       |

## Test Strategy

档位：**必须自动化**。

理由：A2 使编辑器无法完成主建模功能（junction 扇出）；A7/A8 是数据正确性（副本连错对象 / 永久 dangling 污染可审计 config）；A6 是失败路径下的静默永久背离（最难诊断）。Proof 项在 Fix 前（failing-first）。A2 的 failing-first 必须走**生产拖拽路径**（connectionController.beginDrag），非测试句柄 programmaticConnect（后者绕过缺陷）。

## Execution Plan

### Phase 1 - A2 生产连线拖拽 id 不碰撞（connectionId 生成 + commit push）

Status: planned
Targets: `packages/flux-renderers-industrial/src/editor/connection/connection-drag-controller.ts`；`connection/connection-adapter.ts`；相关测试

- Item Types: `Proof` | `Fix`

- [ ] (Proof / failing-first) 增用例经**生产路径**：mount 含 junction J 的 config → `connectionController.beginDrag('J')` → move 到 target-A → endDrag（commit 写入 conn-0）→ 再 `beginDrag('J')` → move 到 target-B → endDrag → 断言 J 的 custom.connections 长度===2（conn-0 + conn-1），两条 target 分别为 A/B。当前会失败（第二次 endDrag 用 conn-0 覆盖 → 长度仍 1，target=B）。
- [ ] (Fix) `connection-drag-controller.ts` `beginDrag`：用 `readConnections(junctionNode.custom)` 读现有 connections，传入 `beginConnectionDrag({junctionId, existingConnections})`。
- [ ] (Fix) `connection-adapter.ts` `beginConnectionDrag`：接 `existingConnections`，`connectionId: args.connectionId ?? generateConnectionId(args.junctionId, args.existingConnections ?? [])`；commit 端 findIndex 不命中即 push（当前已支持 push，关键是 id 不碰撞使 idx 恒 -1）。
- [ ] (Proof / failing-first) 用例转 pass；既有 connection e2e（`scada-editor-canvas-connection.test.tsx` 走 programmaticConnect）+ redrag/overlay 测试零回归。

Exit Criteria:

- [ ] `beginDrag` 在 live 代码中读现有 connections 并传入 id 生成器（`connection-drag-controller.ts` 可见）。
- [ ] failing-first 用例（生产路径两次拖拽 → 两条 connections 并存）pass。
- [ ] 既有 connection 测试零回归。

### Phase 2 - A6 applyUndoRedoDiff 引擎回滚

Status: planned
Targets: `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts`（`applyUndoRedoDiff`）；`editor/renderer/editor-engine.ts`（如经 build 重建）；相关测试

- Item Types: `Proof` | `Fix` | `Decision`

- [ ] (Decision) 选定回滚策略：(a) catch 中 `engine.build(beforeWorking)` 全量重建（leafer 无事务，最稳）；或 (b) 置「引擎已 desync」标志强制下轮 `syncWorkingCopy` 全量同步（diff 为空时也重建）。记录抉择理由（性能 vs 简单性）。
- [ ] (Proof / failing-first) 增用例：注入一个使 `engine.applyDiff` 抛错的场景（如注册一个 build 时抛错的自定义符号 / mock unknown type）→ `applyUndoRedoDiff` 调用 → 断言 catch 后 `engine` 场景与 `session.workingConfig` 一致（如 `engine.getSymbol(...)` 集合等于 beforeWorking 的节点集），且 `synced.config` 不停留在导致空 diff 的态。当前会失败（engine 半变、working 回滚、永久背离）。
- [ ] (Fix) `applyUndoRedoDiff` catch：除 `session.workingConfig=beforeWorking` 外，按 Decision 回滚引擎（`engine.build(beforeWorking)`）并同步 `synced.config=clone(beforeWorking)`，确保下轮 diff 不为空时能愈合。
- [ ] (Proof / failing-first) 用例转 pass；既有 undo/redo 正常路径测试零回归。

Exit Criteria:

- [ ] `applyUndoRedoDiff` catch 在 live 代码中回滚引擎场景（`engine.build(beforeWorking)` 或等价 desync-愈合机制可见）。
- [ ] failing-first 用例（applyDiff 抛错 → engine 与 working copy 一致）pass。
- [ ] 既有 undo/redo 正常路径测试零回归。

### Phase 3 - A7 clipboard connection target/id 重写

Status: planned
Targets: `packages/flux-renderers-industrial/src/editor/toolbox/clipboard.ts`；相关测试

- Item Types: `Proof` | `Fix`

- [ ] (Proof / failing-first) 增用例：复制 junction J（connection.target='device-1'）+ device-1 一起 → `buildClipboardPaste` → 断言副本 J' 的 connection.target===副本 device-1' 的 id（非原件 device-1）；connection.id !== 原件 connection.id。当前会失败（target 仍指原件 device-1，id 重复）。
- [ ] (Fix) `buildClipboardPaste`：先对 clipboard.symbols 建 `oldId→newId` 全图映射（含子树递归，用 reassignIdsRecursive 产出的新 id 集），再遍历每个含 `custom.connections` 的节点，重写每个 `connection.target`（命中映射用副本 id，未命中按 dangling 策略：保留或丢弃，记录抉择）与 `connection.id`（经 `generateConnectionId(newJunctionId, [])` 或映射重写）。
- [ ] (Proof / failing-first) 用例转 pass；既有 clipboard copy/paste/cut 测试零回归。

Exit Criteria:

- [ ] `buildClipboardPaste` 在 live 代码中重写 connection.target（命中映射用副本）与 connection.id（不重复）。
- [ ] failing-first 用例（复制 junction+target → 副本连线指向副本）pass。
- [ ] 既有 clipboard 测试零回归。

### Phase 4 - A8 删除 prune dangling connection 声明

Status: planned
Targets: `packages/flux-renderers-industrial/src/editor/runtime-mutators.ts`（`removeWorkingSymbol`）；`editor/toolbox-runtime.ts`（`cutSelection`）；相关测试

- Item Types: `Proof` | `Fix`

- [ ] (Proof / failing-first) 增用例：working copy 含 junction J（connection.target='dev-1'）+ dev-1 → `removeWorkingSymbol('dev-1')` → 断言 J 的 custom.connections 不再含 target==='dev-1' 的条目；undo 后该 connection 恢复（inverse 完整）。cutSelection 同型一条。当前会失败（dangling connection 原样残留）。
- [ ] (Fix) `removeWorkingSymbol`：filter 节点后，扫描所有 junction 的 `custom.connections`，prune `connection.target===nodeId` 条目（连同 inverse 以便 undo 恢复）；经既有 pushOperation/syncWorkingCopy 入栈。
- [ ] (Fix) `cutSelection`（`toolbox-runtime.ts`）同型 prune。
- [ ] (Proof / failing-first) 用例转 pass；既有 remove/cut/undo 测试零回归。

Exit Criteria:

- [ ] `removeWorkingSymbol`/`cutSelection` 在 live 代码中 prune dangling connection（target===被删id）。
- [ ] failing-first 用例（删被连线设备 → 无 dangling；undo 恢复）pass。
- [ ] 既有 remove/cut/undo 测试零回归。

## Draft Review Record

> 起草后、执行前的独立审查证据（见 guide `Plan Review Rule`）。由独立子 agent（fresh session）填写。

- Reviewer / Agent: 独立子 agent fresh session `ses_01eea7a43ffesbZOiGr93pxNoF`（general）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 0 Blocker / 0 Major → 共识达成（连续一轮零 Blocker/Major）。Minor（非阻塞，执行时核验）：(a) 执行序注「1809-2 与本 plan 触及不同函数」措辞略不精确——两者共享 `applyUndoRedoDiff` 落点但触及不同分支（success-path selection 修剪归 1809-2，catch-block 引擎回滚归本计划），无逻辑冲突；(b) Phase 4「连同 inverse 以便 undo 恢复」措辞——`removeWorkingSymbol` 用 snapshot-based undo（prevSnapshot），pruned connections 经 stored prevSnapshot 恢复而非显式 inverse diff，术语略松但功能正确；(c) Baseline 引用 `:107-111 endDrag` 实际跨 105-112，cosmetic drift。reviewer 独立核对 15 处引用 vs live repo 全 PASS（含 `programmaticConnect` 确认绕过 A2 缺陷——显式 connectionId → idx 恒 -1 → push，从不调 `generateConnectionId`）；A2/A6/A7/A8 均为 Fix；与 1809-2 无 finding 双重认领。

## Closure Gates

- [ ] A2：生产 UI 同 junction 多条连线并存（生产路径 failing-first 用例 pass）。
- [ ] A6：applyUndoRedoDiff 的 engine.applyDiff 抛错时引擎回滚/愈合（failing-first 用例 pass）。
- [ ] A7：粘贴含连线子图，副本 connection.target 指向副本、id 不重复（failing-first 用例 pass）。
- [ ] A8：删除被连线设备 prune dangling connection，undo 可恢复（failing-first 用例 pass）。
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（A2/A6/A7/A8 均为 Fix）。
- [ ] 受影响 owner doc（`design-connection.md` §5 connection id 纪律 / §4.4 dangling、`design-toolbox.md` §4.3 clipboard connection 重写、`design-undo-redo.md` applyDiff 回滚）已同步到 live baseline，或明确写明 No owner-doc update required。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

_无（A2/A6/A7/A8 均为 in-scope Fix，不延期）。_

## Non-Blocking Follow-ups

- clipboard paste `${id}-copy-${counter}` 不碰撞检查现有 id（与 group/generateConnectionId 纪律不一致）—— P2，归 backlog（source: open-audit P2 簇）。
- align/distribute 对 group 子节点读局部 x/y 非 world —— P2，归 backlog（source: open-audit P2 簇）。

## Closure

Status Note: _关闭时填写_

Closure Audit Evidence:

- Auditor / Agent: _独立子 agent fresh session_
- Evidence: _task id / daily log link / findings 摘要_

Follow-up:

- _仅 non-blocking follow-up_
