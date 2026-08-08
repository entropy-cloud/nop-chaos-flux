> Audit Status: planned
> Audit Type: open-ended
> Mission: industrial-hmi-component-audit
>
> Remediation mapping: P0/P1 分两波进 plans。第一波 `docs/plans/2026-08-08-1809-{1,2,3}-*`：A9(=F4)/A10(=F2)→1809-1；A5(=P1-1)→1809-2；F1(Proof)/F3(node-id 去重)→1809-2。第二波 `docs/plans/2026-08-08-1910-{1,2,3}-*`：A1(P0)/A11/A12→1910-1；A2/A6/A7/A8→1910-2；A3/A4→1910-3。P2 簇（本轮 13 行 + carry-forward F5–F11）登记于 `docs/backlog/industrial-hmi-component-audit-roadmap.md ## Follow-up Backlog`。

# Open-Ended Adversarial Audit — `flux-renderers-industrial`

- 执行时间：2026-08-08 17:12（mission driver `2026-08-08-171203`）
- 审计对象：`packages/flux-renderers-industrial/`（runtime `scada-canvas` + editor `scada-editor-canvas` + symbols / binding / engine / serialization / connection / undo-redo 子系统；~100 source / ~100 test files）
- 对照基线：`AGENTS.md`、`docs/skills/react19-best-practices-review.md`、`docs/references/reopened-design-decisions-and-audit-adjudications.md`
- 去重背景：本轮**刻意从上一轮 1712 自报的盲区切入**（symbols 形状几何正确性、connection/undo-redo 组合态、engine/renderer 生命周期）。上一轮 11 条（F1–F11）见 `docs/analysis/2026-08-08-1712-.../round-01.md`；本轮对其做了 live/fixed 核对（见文末「去重与状态」）。

## 触发视角

交叉使用：**契约考古学家**（接口承诺 vs 实现）、**恶意输入者**（不可信 config 的 DoS / 数据损坏）、**生命周期追踪者**（创建/销毁/暂停的资源对称性）、**新人开发者**（mock 是否掩蔽产线行为）、**组合爆炸测试者**（load×drag、delete×connection、resize×binding 组合）。

## 优先级汇总

| #   | 优先级 | 一句话                                                                                                                                                                                                                                                                                | 置信   |
| --- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| A1  | **P0** | 复合图元按「中心点」约定放置子 `Ellipse`/`Group`，但 leafer-ui 默认 `around` 是 top-left → gauge 表盘溢出符号框一半、设备转子偏到右下；测试 mock 不建模 bounds 故 1340 测试全绿却掩蔽该缺陷                                                                                           | 确定   |
| A2  | P1     | 生产连线拖拽恒生成 `${junctionId}-conn-0`，第二次拖拽覆盖第一次 → pipe-junction 经 UI 最多只能持一条连线（redrag 路径在 prod 死代码）                                                                                                                                                 | 确定   |
| A3  | P1     | 零缩放守卫自毁：`readZoomLayerScale` 对 `scaleX===0` 返回 0（`Number.isFinite(0)` 为真），`syncViewportFromZoomLayer` 把 `viewport.scale=0` 落地 → 之后 `viewportToWorld` 除以 0 产 Infinity，且 `handlePluginMove` 完全无零守卫                                                      | 确定   |
| A4  | P1     | runtime `scada-canvas.tsx` 忽略 `props.meta.disabled`/`visible`（编辑器 `scada-editor-canvas.tsx:217` 却遵守）→ 只读监控画面仍可 pan/zoom/click，违反 AGENTS.md `meta` 契约                                                                                                           | 确定   |
| A5  | P1     | `load`/`importConfig`/`resetSession` 不 abort 进行中的 transform 事务 → 拖拽中 host 调 load，pointerup 时 `commitTransaction` 用旧快照 diff 出整页 bogus undo 条目                                                                                                                    | 很可能 |
| A6  | P1     | `applyUndoRedoDiff` 引擎 `applyDiff` 半途抛错时只回滚 working copy，不回滚 leafer scene → 画布与 working copy/栈永久背离，且 `synced.config` 不更新使下一轮 diff 为空、背离不愈合                                                                                                     | 很可能 |
| A7  | P1     | 剪贴板 `reassignIdsRecursive` 只改 `node.id`，不改 `custom.connections` 的 `id`/`target` → 粘贴含连线的 junction：连线指向原件（非副本）或留重复 connection id                                                                                                                        | 确定   |
| A8  | P1     | `removeWorkingSymbol`/`cutSelection` 不清理其它 junction 上 `target===被删id` 的连线声明 → 保存后成永久 dangling 数据污染（`listAllConnections` 的 dangling 检测恰恰证明此态被容忍而非清除）                                                                                          | 确定   |
| A9  | P1     | `validateScadaConfig` 只有递归深度上限，无数组广度/总量上限 → 不可信 config 注入 `symbols: new Array(5_000_000)` 校验全量遍历后引擎再全量构建，主线程冻结/OOM（上一轮 F4，**仍 live**）                                                                                               | 很可能 |
| A10 | P1     | `assertShape` 的 `'number'` 分支 `typeof v==='number'` 未拒 NaN/±Infinity → grid.size / animation.from / scale.k/b 放行非有限值 corrupt 几何/动画/量程（上一轮 F2，**仍 live**）                                                                                                      | 确定   |
| A11 | P1     | `scada-instrument-level`/`thermometer`/`progress` 无 `parts.resize` → width/height 只路由到 extent（液柱/bar），罐体/管体永不 resize，改尺寸容器留在原地                                                                                                                              | 确定   |
| A12 | P1     | `pipe-junction.applyProps` 不把 `stroke`/`fill` 路由到 stubs（只到 body）→ 改色后半截接线头不变色                                                                                                                                                                                     | 很可能 |
| P2  | P2     | 见末尾 P2 簇（冗余手写 memo、interactionOverlay 销毁后惰性重建、engineRef 未清、错误去重 Set 无界、visual-state 默认绑定盲、round-rect 固定圆角、双向箭头缺 startArrow、空 children 崩溃、Group 承载几何属性、config-sync 双跑、paste 无 id 碰撞检查、align/distribute 嵌套局部坐标） | 混合   |

---

## A1 — `[P0]` 复合图元几何：中心点约定 vs leafer top-left 默认（mock 掩蔽）

**来源视角**：契约考古学家 × 新人开发者。

**位置**：

- `symbols/composite.ts:94-100`（`createCompositeGroup`：`new Group(attrs)`，`attrs=toShapeAttrs(props)` 不含 `around`）
- `symbols/device/pump.ts:33-42`（impeller `Ellipse` `{x:width/2,y:height/2}`）
- `symbols/instrument/gauge.ts:30-48`（body `Ellipse` `{x:width/2,y:height/2,width,height}`；needle `Line` 锚 `{x:width/2,y:height/2}`）
- 同型：`motor.ts`/`fan.ts`/`indicator.ts`/`sensor.ts`/`thermometer.ts` 内层 `Ellipse`/`Group` 均按 `width/2` 放置
- `symbols/base-shapes/common.ts:3-31`（`toShapeAttrs` 透传 x/y/width/height，**不**设 `around`）
- `symbols/symbol-factory.ts:9-17`（`instantiateSymbol` 无任何后补偿）
- `engine/config-adapter.ts:115`（`instantiateSymbol(...)` 即产线入口）

**问题（机制已定）**：leafer-ui 2.2.9 的布局矩阵 `__updateLocalMatrix`（`@leafer/core core.esm.js:6090-6095`）在 `around`/`origin` 均未设置时，平移量**恒等于** `data.x,data.y`，且局部 box 为 `(0,0)→(w,h)`——即默认 `x,y = 包围盒左上角`（top-left）。`around` 偏移仅在 `data.around` 真值时才施加（`core.esm.js:6092-6094`）。全包 grep 确认 `src/` 内**从未**设置 `around`。

因此以「中心点」语义放置的子形状在真实 leafer 画布上整体偏移到右下并溢出：

- gauge body `Ellipse{x:60,y:60,w:120,h:120}` 在 top-left 下占据 `(60,60)→(180,180)`，而符号框是 `(0,0)→(120,120)` —— 一个 120 直径表盘只有左上四分之一落在符号 footprint 内，右下溢出 60px；needle 锚点落在 body 的**左上角**而非圆心。
- pump impeller `Ellipse{x:28,y:28,w:36,h:36}` 占据 `(28,28)→(64,64)`，圆心在 `(46,46)`（非 body 圆心 `(28,28)`），并向右下溢出 8px。

内部矛盾本身就是铁证：body `Rect{x:0,y:0,w,h}` 用 top-left（正确填满符号框），而同组 inner `Ellipse` 用中心点——两种约定不可能同时正确。唯一能让 gauge body「填满 120×120 框」的解释是中心点约定，但 leafer 默认不是。

**为什么值得关心（P0）**：这是「合法 config → 每个复合设备/仪表/传感器图元在真实画布上视觉错位/溢出」的系统性渲染错误，覆盖 device/instrument/sensor-control 三族复合图元。更危险的是**测试矩阵无法发现它**：`test-support/leafer-ui-mock.ts:125-137` 是纯属性袋，明确对 `getBoundsToWorld`/`getBounds`/`worldBox` **抛错**以声明「mock 不建模 bounds」，故 1340 条单测全绿而几何是错的——且若干 `*-symbols.test.ts` 把错值（如 `rotor.x===width/2`）当成期望固化下来。这正是本仓注释反复警告过的「mock↔真实层漂移掩蔽 live defect」失败模式（见 mock.ts:125-137、scaleOfWorld 修正注释）的又一次实例，只是这次落在几何定位而非交互变换。注意：独立基础形状（`rect`/`ellipse`/`line`）用 top-left 自洽，**不受影响**；缺陷仅限复合图元的内层中心点放置。

**修复**：每个按中心放置的 `Ellipse`/`Group` 加 `around:'center'`（最小 diff，与 leafer 原生锚定对齐）；或改为 top-left 语义（`x: width/2 - r`）。同时补一条**真实 leafer 渲染**的几何断言（boxBounds 落在符号框内），堵住 mock 盲区。

**验证**：`instantiateSymbol('scada-instrument-gauge', {props:{width:120,height:120}})` 后读 `body.boxBounds` 应为 `{x:0,y:0,width:120,height:120}`（当前为 `{x:60,y:60,...}`）。

---

## A2 — `[P1]` 生产连线拖拽恒覆盖 `conn-0`，junction 经 UI 最多持一条连线

**来源视角**：组合爆炸测试者（load × 多次连线）。

**位置**：`editor/connection/connection-drag-controller.ts:73-78`（`beginDrag` 仅传 `junctionId`）→ `editor/connection/connection-adapter.ts:67-80`（`beginConnectionDrag`：`connectionId: args.connectionId ?? generateConnectionId(args.junctionId, [])`）+ `:142-148`（commit 按 `connectionId` findIndex 命中即**覆盖**）；`editor/connection-wiring.ts:49-59`（prod pointerdown 入口）；`editor/connection/anchor-snap.ts:144-153`（`generateConnectionId`：`index = existing.length`，空数组→恒 `conn-0`）。

**问题**：生产 UI 的连线唯一入口是 `wireConnectionDrag` 挂的 `pointerdown → connectionController.beginDrag(junction.id)`，**不传** `connectionId`/`existingConnection`。故每次拖拽 `beginConnectionDrag` 都用空数组生成 `${junctionId}-conn-0`。`commitConnectionDrag` 在 release 时读 junction **真实** connections，按 `connectionId`(=conn-0) `findIndex`：第一次 idx=-1 push；第二次起 idx≥0 → `next[idx]=written` **静默覆盖**前一条连线。后果：pipe-junction 经编辑器 UI 永远只能持 1 条连线（SCADA 里 junction 扇出到多设备是核心原语）。`isRedrag`/`originalConnection` 分支因 `existingConnection` 永不传入而在 prod 为死代码。e2e（`scada-editor-canvas-connection.test.tsx`）走测试句柄 `handle.connection.connect`（显式 connectionId，`programmaticConnect` 直接 push），故完全绕过该路径——缺陷纯 prod、测试不可见。

**为什么值得关心**：编辑器无法完成其主建模功能；每次新增连线静默丢弃前一条连线的 target/锚点（虽入 undo 栈可回退，但用户无可见提示）。根因是「生成 id」与「读现有 connections」职责分裂：`beginDrag` 有 `deps.findNode`/`getSymbols` 却没用来读现有 connections 喂给 id 生成器。

**修复**：`beginDrag` 读 `readConnections(junctionNode.custom)` 传入 `beginConnectionDrag({junctionId, existingConnections})`，由其 `generateConnectionId(junctionId, existing)` 产不碰撞 id；commit 端 findIndex 不命中即 push。补 failing-first：同 junction 连续两次拖到不同 target，断言两条 connections 并存。

---

## A3 — `[P1]` 零缩放守卫自毁：`handlePluginZoom` 的早退反而把 `scale=0` 落地

**来源视角**：异常路径侦探 × 生命周期追踪者。

**位置**：`engine/scada-engine.ts:444-498`（`handlePluginZoom:455-456` 早退调 `syncViewportFromZoomLayer`；`handlePluginMove:475-479` **无**零守卫直接同步；`syncViewportFromZoomLayer:481-487` 经 `readZoomLayerScale` 读 scale；`readZoomLayerScale:494-495` `typeof scaleX==='number' && Number.isFinite(scaleX) ? scaleX : fallback`）→ 下游 `engine/viewport.ts:43-52`（`worldToViewport` 乘 scale、`viewportToWorld` 除 scale）。

**问题**：`readZoomLayerScale(0, fallback)` —— `Number.isFinite(0)` 为 `true` → 返回 `0`（**不**走 fallback）。`handlePluginZoom` 的零守卫 `if (rawScale===0 || !isFinite)` 检测到了 0，却随即调 `syncViewportFromZoomLayer()`，后者再次用 `readZoomLayerScale` 读回 `0` 并写入 `this.viewport.scale=0`。守卫注释（L453-454）声称「早退前用 fallback 读回有限视口态」——**与实现矛盾**。一旦 `viewport.scale=0`：所有 `viewportToWorld`（viewport.ts:50 除以 scale）返 `Infinity/NaN`，经 `EventBridge`（scada-engine.ts:422）进 `symbol:click/hover` 的 world 坐标派发给用户 action；`applyViewportState`（L378）算 `next/cur.scale = x/0 = Infinity` 再 `zoomLayer.scaleOfWorld(anchor, Infinity)` → zoomLayer 矩阵不可逆 corrupt。更甚：`handlePluginMove` 根本没有零守卫，move 事件带 `scaleX===0` 时直接落地。

**为什么值得关心**：这是「防御代码反而放大故障」的典型——守卫的存在让审阅者以为零缩放已处理，实际它把瞬时 `scaleX=0`（空画布 zoom-to-fit、程序化 setScale(0)、矩阵瞬时 corrupt）固化成永久 `viewport.scale=0` 的不可恢复态。P1 而非 P0：触发需 `scaleX===0` 瞬态，非 authoring 主路径。

**修复**：`readZoomLayerScale` 拒 0（`&& scaleX!==0`）；或 `syncViewportFromZoomLayer` 在读到 0/非有限时回退 `this.viewport.scale`。`handlePluginMove` 补同形零守卫。加回归：注入 `zoomLayer.scaleX=0` 的 zoom/move 事件，断言 `viewport.scale` 保持非零有限。

---

## A4 — `[P1]` runtime `scada-canvas` 忽略 `meta.disabled`/`meta.visible` 契约

**来源视角**：契约考古学家。

**位置**：`renderer/scada-canvas.tsx:188,272,300`（只读 `meta.cid`/`testid`/`className`，**不读** `disabled`/`visible`）vs `editor/scada-editor-canvas.tsx:217`（`const disabled = props.meta.disabled === true` → 272-273 `aria-disabled`/`inert`、275/305 事件早退）。

**问题**：AGENTS.md「Renderer Component Contract」明确 `props.meta` 提供 disabled/visible/className/testid。编辑器画布遵守 `disabled`，runtime 画布不遵守——同一包内对同一契约非对称实现。host 在只读监控画面上设 `disabled:true`，scada-canvas 仍全量派发 pan/zoom/click（EventBridge 触发、`helpers.dispatch` 执行）。

**为什么值得关心**：SCADA 的「只读监控」是一等用例（操作员不应在监控大屏上误触发改动/导航）。契约违背使 `disabled` 形同虚设，安全语义落空。P1。

**修复**：`scada-canvas.tsx` 读 `props.meta.disabled`，disabled 时不下挂 EventBridge 的交互监听（或引擎层门控 leafer move/tap）；`visible:false` 时不渲染。

---

## A5 — `[P1]` `load`/`importConfig` 不 abort 进行中的 transform 事务 → bogus undo 条目

**来源视角**：时序攻击者（拖拽中 host 调 load）。

**位置**：`editor/editor-session.ts:78-84`（`resetSession` 清 `undoStack`，但不动 `UndoRedoAdapter` 的 `inTransaction`/`prevAtOpStart`）；`editor/runtime-mutators.ts:204-229`（`load`）；`editor/toolbox-runtime.ts:221-247`（`importConfig`）；`editor/undo-redo/undo-redo-adapter.ts:28-30,39-44`（事务态独立对象；grep 确认 `abortTransaction` 仅内部调用）。

**问题**：若 transform 拖拽进行中（pointerdown 后、pointerup 前）host 经 runtime 句柄调 `load`/`importConfig`（`use-editor-engine.ts:173,195` 任意时刻可调）：`resetSession` 换 working copy + 清栈，但 adapter 仍 `inTransaction=true`、`prevAtOpStart` 指向**旧** config 快照。随后 pointerup 的 `commitTransaction(session.workingConfig)` 用「旧快照 vs 新 working copy」diff 出整页 bogus 变更，生成 inverse 入栈；undo 回滚掉 load、redo 重放垃圾。拖拽剩余帧的 `applyPatchToWorkingNode` 也在对已脱离的节点写（视觉 no-op）。

**为什么值得关心**：undo 栈在「load/import 与拖拽并发」下被污染，用户一次 undo 回退语义无关的整次装入。load/import 是 host 级 API（快捷键/程序化/「装入」按钮都可能），并发窗口真实存在。P1（很可能；需并发触发）。

**修复**：`load`/`importConfig`/`resetSession` 在 `resetSession` 前调 `undoRedo.abortTransaction()` 并 cancel 活跃 connection drag。加 failing-first：beginTransaction → load → pointerup，断言栈空或仅含 load 本身。

---

## A6 — `[P1]` `applyUndoRedoDiff` 引擎半途失败只回滚 working copy，不回滚 leafer scene

**来源视角**：异常路径侦探。

**位置**：`editor/runtime-mutators.ts:100-113`（`applyUndoRedoDiff`：try 内先 `undoRedo.applyDiff` 纯函数改 working，再 `engine.applyDiff`；catch 仅 `session.workingConfig = beforeWorking`，不恢复引擎、`synced.config` 不回滚）；`editor/renderer/editor-engine.ts:221-239`（`engine.applyDiff` 顺序 remove→build→update→reorder 无内部回滚）。同型存在于 `runtime-factories.ts:169-176`（`syncWorkingCopy`）与 `toolbox-runtime.ts:159-162`。

**问题**：`engine.applyDiff` 抛错（如某节点 `buildNode` 失败——插件卸载后 unknown type、注册符号自定义构建拒收）时 leafer 树已半变（部分 removed、部分未 build）。catch 把 working copy 回滚到 `beforeWorking`，但引擎不回滚，`synced.config` 停在调用前值。若 `synced.config === beforeWorking`（无待提交变更），下一轮 `syncWorkingCopy` diff 为空 → 引擎**永不愈合**，画布与 working copy/栈永久背离。

**为什么值得关心**：失败路径下的静默永久背离，后续编辑作用于 desynced scene。P1（很可能；需 `engine.applyDiff` 抛错，非主流但插件/unknown-type 场景可达）。

**修复**：catch 中 `engine.build(beforeWorking)` 全量重建（leafer 无事务），或置「引擎已 desync」错误强制下轮全量同步。

---

## A7 — `[P1]` 剪贴板粘贴含连线 junction：`target` 指向原件、connection id 重复

**来源视角**：组合爆炸测试者（copy × connection）。

**位置**：`editor/toolbox/clipboard.ts:96-103`（`reassignIdsRecursive` 只改 `node.id`/子树 id，**不**改 `node.custom.connections`）+ `:64-91`（`buildClipboardPaste` 仅按单调 counter 产 `${id}-copy-${n}`）。

**问题**：粘贴一个被复制的 pipe-junction 时，`custom.connections` 原样保留：`connection.id` 仍是原件的（与源 junction 的 connection id 重复）；`connection.target` 仍指**原件** target id。若 target 同在选区被一起复制，粘贴出的 junction 连线指向**原件**而非副本——两副本未被连线；若 target 未被复制，粘贴 junction 静默重连到仍画布上的原件 target。

**为什么值得关心**：复制「已接线的子图」是 HMI 编辑主流程，用户预期副本内部连线如原件。当前产出连错对象的连线（数据正确性）。P1（很可能）。

**修复**：粘贴时建 `oldId→newId` 全图（含子树）映射，重写每个 `connection.target`（命中映射用副本、未命中按 §4.4 dangling 保留/丢弃）与 `connection.id`（`generateConnectionId`）。加 failing-first：复制 junction+target → 粘贴 → 断言副本 junction 连线 target 指向副本 target。

---

## A8 — `[P1]` 删除图元不清理 dangling 连线声明（永久数据污染）

**来源视角**：生命周期追踪者 × 数据完整性。

**位置**：`editor/runtime-mutators.ts:84-91`（`removeWorkingSymbol` 仅 filter 节点 + push remove diff，不扫其它 junction 的 `connection.target`）；`editor/toolbox-runtime.ts:174-191`（`cutSelection` 同型）。

**问题**：删一个被连线的设备节点，其它 junction 上 `target===该id` 的 connection 声明原样留在 working copy。undo 能恢复（节点回来→dangling 转 valid），但**保存后**或**不 undo** 时这些 dangling 声明永久驻留 config。`listAllConnections`（connection-adapter.ts:266-291）专门标 `dangling` 恰恰证明此态被「容忍」而非「清除」。对可审计/导出的 HMI config，幽灵引用是真实完整性问题。

**为什么值得关心**：删除是高频操作，每次删被连线的设备都留 dangling。P1（行为确定；是否算「缺陷」取决于产品是否明确要保留——若是则应文档化「故意保留」，当前是静默）。

**修复**：`removeWorkingSymbol`/`cutSelection` 同 diff 内 prune 所有 `connection.target===removedId` 条目（含 inverse 以便 undo 恢复）。

---

## A9 — `[P1]` `validateScadaConfig` 有深度上限、无广度/总量上限 → 不可信 config DoS（上一轮 F4，仍 live）

**来源视角**：恶意输入者 × 10x 规模运维者。

**位置**：`serialization/validate.ts:23-40`（symbols/variables 仅 `Array.isArray` 后 `forEach` 全量递归；广度上限 grep 全 serialization 子树为空，仅 `MAX_VALIDATE_DEPTH=100` 深度上限）。

**问题**：`symbols: new Array(5_000_000)` 的 config：validator 全量遍历 + per-node `validateSymbolNode`；通过后 `engine.reset/build` + `tree-registry` + `reverse-index.build` + 首帧 `RefreshPipeline` 再全量多遍。10万图元是 benchmark 已测上限，但**超阈值无 fail-closed**——攻击者/损坏 host JSON 可注入数百万节点直至主线程冻结/OOM。低代码渲染器威胁模型里 config 是不可信输入（AMIS 系常态）。上一轮 F4 报告同问题，核对代码**仍 live**。

**为什么值得关心**：深度有防御、广度没有的不对称。P1。修复：`validate.ts` 加 `MAX_SYMBOLS`/`MAX_TOTAL_NODES`/`MAX_VARIABLES`（参考 benchmark 10万留余量），超限 push error 早退。

---

## A10 — `[P1]` `assertShape` 数字分支未拒 NaN/Infinity（上一轮 F2，仍 live）

**来源视角**：恶意输入者。

**位置**：`serialization/validators/helpers.ts:54-55`（`assertShape` `'number'` 分支 `ok = typeof v === 'number'`）vs 同文件 `checkNumberField:23`（已 `Number.isFinite`）。受影响：`validate.ts:61`（grid.size）、`validators/animation.ts`（animation.from/to `{x,y}`）、`validators/point-declaration.ts`（scale.k/b）。

**问题**：P2-3 的 finite 修复只落 `checkNumberField`，所有走 `assertShape` 的数值子字段仍放行 NaN/±Infinity。`JSON.parse('{"size":1e400}')`→`Infinity` 直过：grid.size=Infinity 发散、animation.from={x:NaN} 经 animator 算术 NaN 化 rotation/position、scale.k=Infinity 经 applyLinearScale corrupt 点值。上一轮 F2 报告同问题，核对 helpers.ts:55 **仍 live**。

**为什么值得关心**：已被识别并部分修复的同类 bug 的系统性残留——修复者只改一个 helper。validate 是不可信 config 唯一数值防线。P1。修复：`assertShape` number 分支加 `&& Number.isFinite(v)`，或抽共享 `isFiniteNumber`。

---

## A11 — `[P1]` `level`/`thermometer`/`progress` 无 `parts.resize`，容器永不随尺寸变更

**来源视角**：10x 规模运维者 × 契约考古学家。

**位置**：`symbols/instrument/level.ts`（无 `parts.resize`，仅自定义 `applyProps` 处理 height→extent）、`thermometer.ts`（同）、`progress.ts`（同）；对照 `composite.ts:72-78`（`applyCompositeProps` EXTENT_FIELDS：有 extent part → 路由 extent，否则调 `parts.resize`）+ `pump.ts:48-55`/`gauge.ts:66-74`（device/gauge 有 resize hook，重算 body 容器）。

**问题**：plan 2026-08-06-0900-2 P2-4 给 device/instrument-gauge/sensor-control 都加了 `parts.resize`（width/height 变更时重算 body 容器 + 子形状锚点），但漏了 level/thermometer/progress（因它们有 extent part，作者假定 width/height→extent 即正确）。结果：改这些仪表的**几何尺寸**时，只有 liquid/bar（extent）变，罐体/管体/track 留在 create 期尺寸、bulb/label 不重定位。例：level 默认 body width 60，diff 改 width=200 → liquid width=196 但 body 仍 60 → liquid 溢出罐体。

**为什么值得关心**：与 sibling 图元的 resize 纪律不一致；binding-driven 液位（bindings.height→extent）正确，但属性面板/几何 resize 路径破损。P1。

**修复**：三者补 `parts.resize`（重算 body + bulb/label 锚点），extent 仍由 height binding 驱动；或显式区分「几何 height」与「液位 height」语义。

---

## A12 — `[P1]` `pipe-junction.applyProps` 不把 stroke/fill 路由到 stubs → 半截接线头不变色

**来源视角**：契约考古学家。

**位置**：`symbols/pipe/pipe-junction.ts:103-137`（`applyProps` 路由 flow/dashOffset/strokeWidth 到 stubs L126-135，然后 `applyCompositeProps` 仅 `{root,body}` parts L136 → stroke/fill 只到 body）。

**问题**：改 junction 的 `stroke`（或 fill-driven stroke）时，body 变色但 stubs（4 个接线头）保留 create 期颜色 → 半截接线头与主体色不一致。pipe-symbols 测试未覆盖 stubs 的 stroke 传播。

**为什么值得关心**：颜色变更产出半涂接头，视觉契约破裂。P1（很可能）。

**修复**：`applyProps` 把 stroke/fill 同步写 stubs；或 `applyCompositeProps` 传 `{root, body, stubs}` 让 BODY_FIELDS 路由覆盖 stubs。加回归：改 stroke 后断言 stubs 与 body 同色。

---

## P2 簇（记录，不单独驱动 remediation plan）

| 位置                                                                | 一句话                                                                                                                                                             | 置信   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| `renderer/scada-canvas.tsx`、`hooks/use-scada-*`                    | 普遍手写 `useCallback`/`useMemo`（scada-canvas 7 处、use-scada-events 8 处、use-scada-points-bridge 4 处…），违反 AGENTS.md「React Compiler 基线下默认不加 memo」  | 确定   |
| `engine/scada-engine.ts:156-159`                                    | `interactionOverlay` getter 无 `destroyed` 检查，销毁后访问惰性重建 overlay 到已销毁 app（潜伏，结合下方 engineRef 缺陷可达）                                      | 确定   |
| `renderer/scada-canvas.tsx:222-228`                                 | `engineRef`/`runtimeRef` 的同步 effect 无 cleanup，unmount 后仍指已销毁 engine（使上一条可达）                                                                     | 确定   |
| `engine/event-bridge.ts:161-166` + `binding/point-store.ts:310-315` | 错误去重以 message 字符串为键（同文案异因被吞）+ Set 生命周期内无界增长（上一轮 F9，仍 live）                                                                      | 很可能 |
| `symbols/visual-state.ts:71-72`                                     | revert 仲裁读 `getConfigNode`（raw 实例），不合并 defaults → 自定义符号 defaults 级 binding 被 revert 覆盖（builtin defaults 无 binding 故不触发，窄）             | 很可能 |
| `symbols/base-shapes/round-rect.ts:33`                              | 固定 `cornerRadius:8`，无按尺寸缩放/无 per-instance 钩子                                                                                                           | 确定   |
| `symbols/pipe/pipe-junction.ts:88`                                  | `bidirectional` 只给 `endArrow`，缺 `startArrow`（语义误导）                                                                                                       | 很可能 |
| `symbols/composite.ts:100`                                          | `createCompositeGroup` 空 children → `body=undefined` → `applyCompositeProps` 对 undefined `set` 崩溃（自定义复合作者陷阱）                                        | 确定   |
| `symbols/composite.ts:98-99`                                        | `toShapeAttrs` 把 width/height/fill/stroke 写到 `Group`（无渲染意义，且 sized Group 改变 leafer bounds 语义，叠加 A1）                                             | 很可能 |
| `renderer/hooks/use-scada-config-sync.ts:205-252`                   | 每次 config 变更 effect 双跑（reloadBindings→setRuntime→identity 变→effect 再跑空 diff）                                                                           | 确定   |
| `editor/toolbox/clipboard.ts:64-91`                                 | paste 的 `${id}-copy-${counter}` 不碰撞检查现有 id（与 group/generateConnectionId 纪律不一致，counter 撞上既有 `-copy-N` 则重复 id）                               | 确定   |
| `editor/toolbox/align-distribute.ts:38-110`                         | align/distribute 对 group 子节点读**局部** x/y（非 world），与 snap/hit/linkage 已统一的 `collectWorldBounds` 纪律矛盾，嵌套选区对齐错位（docstring 标注 M3 接受） | 确定   |
| `renderer/hooks/use-scada-points-bridge.ts:260,284`                 | compiledCache/lastReportedErrors 清理 effect 依赖仅 `[config]`，expressionCompiler 换身份不清理 → 旧编译产物喂新 evaluator                                         | 很可能 |

---

## 去重与状态（上一轮 F1–F11 live/fixed 核对）

| 上一轮                                            | 状态        | 说明                                                                                                                              |
| ------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| F1 cloneConfig 缺 variables 守卫                  | **已修复**  | `editor-session.ts:118` 现为 `...(config.variables !== undefined ? {...} : {})`，且 `cloneNode` 已深克隆 custom（P2-#4）          |
| F2 assertShape NaN/Infinity                       | **仍 live** | 本轮 **A10** 重报（helpers.ts:55 未变）                                                                                           |
| F3 拖拽 id 碰撞 + addWorkingSymbol 不去重         | **仍 live** | 本轮并入 A2/A7/A8 的「id/connection 纪律」主题；`runtime-mutators.ts:76-82` addWorkingSymbol 仍 `[...symbols, node]` 不查重       |
| F4 validate 无广度上限                            | **仍 live** | 本轮 **A9** 重报                                                                                                                  |
| F5 parseScadaConfig 非对象 cast + 浅拷贝 aliasing | 未变        | P2，不重报                                                                                                                        |
| F6 两份克隆语义分裂                               | 部分缓解    | custom 深克隆已统一，但 `cloneConfigSnapshot` 的 variables 仍数组浅克隆、viewport/background 不克隆（见连接/undo agent 报告，P2） |
| F7 Animator.pause 不停时钟                        | 未变        | P2，不重报                                                                                                                        |
| F8 recomputeExpressionPoints O(n²)                | 未变        | P2，不重报                                                                                                                        |
| F9 错误去重 Set 无界                              | **仍 live** | 本轮 P2 簇收录                                                                                                                    |
| F10 binding.scale 仅 isPlainObject                | 未变        | P2，与 A10 同根因（建议合并修）                                                                                                   |
| F11 drop type 不校验                              | 未变        | P2，不重报                                                                                                                        |

历史裁定核对：`docs/references/reopened-design-decisions-and-audit-adjudications.md` 5 条裁定均针对 form/basic/react 等包，与 industrial 无重叠；本轮无「旧问题重报」。

---

## 总评：当前最值得关注的 1–3 个方向

1. **A1（P0）是头号杠杆，且暴露了一个系统性测试盲区。** 复合图元的中心点放置约定与 leafer 默认 top-left 不兼容，使每个设备/仪表/传感器图元在真实画布上错位，而 1340 条测试因 mock 不建模 bounds 全绿。这不是孤立 bug——它说明「mock 掩蔽 live defect」这一本仓已多次中招的失败模式（mock.ts 注释、scaleOfWorld 修正史）**仍然没有一道真实渲染的几何回归网**。补一张真实 leafer boxBounds 断言网，能一次性吊起 A1/A11/A12 以及未来同类几何漂移。
2. **编辑器「config 入 working copy」边界缺单一 owner（A2/A5/A6/A7/A8 + 上一轮 F3）。** id 生成、事务 abort、引擎回滚、connection 生命周期、clone 深度——都散落在 session/mutators/working-helpers/clipboard/undo-adapter 各写一份。这条边界是数据完整性的咽喉，却没有任何一处集中兜底。建议把「外部 config/选区 → working copy 的归一化 + 事务边界 + 连线/引用一致性」收口到单点。
3. **数值/校验防线仍是「同类修复只做一半」（A9/A10 + 上一轮 F2/F4/F10）。** finite 修复只落 `checkNumberField`、深度上限有广度没有、binding scale 弱于 declaration scale——validate 层的防御纵深是零散补的。一次「同类对齐」扫荡（统一 finite helper + 广度/总量上限 + scale 同形校验）能关闭 malformed 数值与超规模输入两整类问题。

## 本次审查的盲区自评

- **未做真实 leafer 渲染验证**：A1 的机制从源码（core.esm.js:6090-6095）+ mock 抛 bounds API（mock.ts:125-137）+ 内部约定矛盾三重交叉推定为「确定」，但**未**在真实浏览器跑一次 gauge boxBounds 断言。一张真实渲染截图即可一锤定音，建议作为 remediation 第一步。
- **A3/A5/A6 的触发依赖瞬时态/并发**：零缩放瞬态、拖拽中 load、引擎 applyDiff 抛错——均基于静态阅读推得「确定/很可能」，未实际复现。
- **leafer 交互层真实数学未深读**：`interaction-overlay.ts`、`hit.ts`、`anchor-snap.ts` 的具体数学（hit-testing、吸附阈值、视口变换）只扫表面；mock↔真实漂移若藏在数学里本轮可能漏。
- **未跑性能基准**：A9（DoS 阈值）、config-sync 双跑（P2）均为静态推得。
- **未覆盖 host 集成面**：`RendererEnv.monitor`/`plugins.onError`/`expressionCompiler` 由 host 注入，本轮假设其符合 contract，未验异常 host 退化。

下一轮最适合切入：**真实 leafer 渲染回归网（验证 A1 并堵同类）** + **leafer 交互/视口数学的真实/Mock 漂移** + 用最小复现固化 A3/A5/A6 触发点。

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
