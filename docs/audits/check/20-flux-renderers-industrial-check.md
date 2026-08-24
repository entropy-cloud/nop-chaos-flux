# 20 flux-renderers-industrial 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-renderers-industrial/src/`（128 个源文件 / 16769 行，排除 `*.test.*` 与 `__tests__`）
  - 精读（全文逐行）：`renderer/`（scada-canvas + 5 hooks + scada-errors + renderer-definitions）、`engine/`（9/9）、`binding/`（9/9 非 fixture）、`serialization/`（9/16，4 个小 validator 与 fixture 未逐行）、`editor/`（35/45）、`symbols/`（19/33，base-shapes/device/instrument 抽样 + 全部公共装配层）≈ 83 文件 / 65%；其余经 grep 扫描（空 catch / `as any` / `@ts-ignore` / rAF / addEventListener / ResizeObserver / timer / 硬编码中文 / i18n key）+ 门禁脚本复核（`check-scada-symbol-keys`、`check-i18n-keys`、`check-oversized-code-files`）。
  - 核心链路（scada-canvas → use-scada-engine → ScadaCanvasEngine / RefreshPipeline / PointStore / Animator / EventBridge / InteractionOverlay / viewport / points-bridge / config-sync / events / handles）100% 精读。
- 结论概览：**P0 x1 / P1 x3 / P2 x4 / P3 x10**。总评：本包工程质量显著高于均值——注释纪律、失败路径登记、防泄漏（rAF/RO/listener 配对清理）、i18n、React19 纪律（latest-ref、无 render 副作用、无 setState 镜像）均扎实；本次发现集中在**增量同步路径的边角**：pipe-junction 连线增量不回画布（P0）、嵌套选区剪切半删（P1）、viewport policy 被 runtime 身份 churn 重放（P1）、editor destroy 句柄不释放资源（P1）。未发现违反"禁直连 store / 禁 BEM / raw HTML"契约的问题。

---

## P0 缺陷

### F-01 pipe-junction `custom.connections` 增量更新不重建 stub——连线提交/联动/undo 后画布不渲染（数据与画布永久背离）

- 位置：`packages/flux-renderers-industrial/src/symbols/pipe/pipe-junction.ts:106-144`（applyProps）；`packages/flux-renderers-industrial/src/symbols/composite.ts:89`（"其余声明层字段（custom/states/bindings/animations）不写节点"）
- 摘录（pipe-junction.ts applyProps，全文无 `props.custom` 消费）：

```ts
applyProps: (node, props) => {
  const state = junctionState.get(node);
  if (!state) return;
  if (props.width !== undefined || props.height !== undefined) { /* 重算 body + stub points */ }
  const patch: Record<string, unknown> = {};
  if (props.flow !== undefined) { ... }
  if (props.dashOffset !== undefined) patch.dashOffset = props.dashOffset;
  if (props.strokeWidth !== undefined) patch.strokeWidth = props.strokeWidth;
  if (props.stroke !== undefined) patch.stroke = props.stroke;
  if (props.fill !== undefined) patch.fill = props.fill;
  ...
  applyCompositeProps(node, { root: node, body: state.body }, props); // custom 键在此被丢弃
},
```

- 输入→路径→错误结果推理链：
  1. 输入：编辑器中从 pipe-junction 拖出一条连线吸附到目标设备并释放（`wireConnectionDrag` → `ConnectionDragController.endDrag` → `onCommit`）。
  2. 路径：`runtime-mutators.ts:49-62 writeConnection` → `applyPatchToWorkingNode` 写 `custom.connections` → `syncWorkingCopy`（`runtime-factories.ts:187-217`）→ `diffScadaConfig` 产出 `updated:[{id, patch:{custom:…}}]`（diff.ts SYMBOL_KEYS 含 `custom`）→ `engine.applyUpdate`（editor-engine.ts:409-441 / runtime config-adapter.ts:137-168）→ `definition.applyProps(node, {custom:…})`。
  3. 错误结果：pipe-junction 的 `applyProps` 对 `props.custom` 无任何分支（`applyCompositeProps` 显式声明 custom 不写节点）→ **stub（管段折线）不重建**。新连线在 working copy 中存在（`listConnections` 可见）但画布上永不出现；同理 `recomputeLinkagesForMovedNode`（editor-working-helpers.ts:137-174）移动设备后只改数据、connection 的 undo/redo 也只 patch custom——connection-link.ts 文件头声称的"让 stub 视觉跟随目标设备"未端到端成立。runtime 侧同版本 config diff 更新 `custom` 走同一路径，同样 stale。
  4. 对照证据该缺口是真实漏项而非设计：同文件族中 valve（device/valve.ts:140-143）**有** `props.custom?.openRatio` 消费分支，证明 custom 增量消费是既有模式；仅 pipe-junction 的 `custom.connections`（其核心语义字段）漏掉。
  5. 测试盲区佐证：e2e 仅断言连线拖拽不平移视口（scada-editor-interaction-correctness.spec.ts #1，拖到空白无 commit）与 `listConnections` 数据面，无"提交后 stub 上屏"断言。
- 影响：编辑器连线功能主路径产出不可见；运行态 custom 增量 diff 同样不回画布；仅全量重建（首载/版本变更/importConfig/undo catch 的 engine.build）可见正确 stub。
- 修复方向：pipe-junction `applyProps` 增加 `props.custom?.connections` 分支——按新 connections 重建/增删 stub 子节点并更新 `junctionState`（或最小实现：重算既有 stub 的 points + 补建缺失 stub）；补一条"提交后 stub 上屏"的 e2e/单测。

## P1 隐患

### F-02 cutSelection 顶层 filter 丢失嵌套子图元——剪切 group 子节点"删不掉"，但其 connection 声明却被误剪

- 位置：`packages/flux-renderers-industrial/src/editor/toolbox-runtime.ts:176-200`（cutSelectionFn），关键行 184
- 摘录：

```ts
const { clipboard: cb, forward: cutForward } = buildClipboardCut(nodes); // nodes 经 collectAllSymbols 递归解析，可含嵌套子图元
...
let nextSymbols = session.workingConfig.symbols.filter((s) => !removedSet.has(s.id)); // ← 仅顶层 filter
nextSymbols = pruneDanglingConnections(nextSymbols, removedSet); // ← 递归剪除指向被删 id 的 connection
```

- 特定条件：选区含 group 内嵌套子图元（leafer Editor 可选中 group 子节点；`selectionNodes()` 在 P1-C2 修复后特意递归解析嵌套选区）。
- 后果：嵌套子图元不出现在顶层 `symbols` 数组 → filter 未删除它（**剪切退化为复制**：节点留在画布，粘贴产生副本）；但 `pruneDanglingConnections` 仍把它当"已删 id"剪掉其它 junction 上指向它的 connection 声明——视觉连线声明丢失而节点本体还在。与 `removeWorkingSymbol`（runtime-mutators.ts:104，`detachNodesRecursive` 递归解链）不对称。
- 修复方向：cutSelectionFn 改用 `detachNodesRecursive(symbols, removedSet)`（与 removeWorkingSymbol 同一语义），prune 保留。

### F-03 声明 viewport policy 时，任何非空 config diff 都会经 sizing effect 重放 fit——用户 pan/zoom 被重置（违背 config-sync 自身裁定）

- 位置：`packages/flux-renderers-industrial/src/renderer/hooks/use-scada-engine.ts:278-295`（sizing effect，deps 含 `runtime`）+ `:303-340`（reloadBindings → `setRuntime(next)` 身份 churn）；`use-scada-config-sync.ts:270-273`（"初始视口策略只在全量（reset）路径应用：diff 增量重应用会重置用户在画布上的平移/缩放"）与 `:337-347`（refit 注册）
- 摘录（use-scada-engine.ts:278-295）：

```ts
useEffect(() => {
  const current = runtimeRef.current;
  if (!current) return;
  const container = containerRef.current;
  const targetWidth = container?.clientWidth || latest.current.width || 0;
  ...
  if (targetWidth > 0 && targetHeight > 0) {
    current.engine.setSize(targetWidth, targetHeight);
    current.refitViewportOnResize?.();   // ← runtime 身份变化即重放声明 policy
  }
}, [runtime, containerRef, args.width, args.height]);
```

- 特定条件：schema 声明 `viewport: {fit|center}` 且 host 推送同版本 config 的非空 diff（config prop 为 source-enabled，可表达式绑定产出新身份）。
- 后果：diff 路径 → `reloadBindings` → `setRuntime(新对象)` → sizing effect 因 `runtime` 依赖重跑 → `refitViewportOnResize` → `applyScadaViewportPolicy` 无条件 `engine.fit/center` → **用户手动 pan/zoom 丢失**。config-sync 侧已用 `config === prevRef.current` 早退守卫避免自己的 effect 重放初始视口（本轮-10 注释），但 use-scada-engine 的 sizing effect 未同步设防，守卫被旁路。
- 修复方向：sizing effect 的 refit 仅在尺寸真变化时执行（比较 `engine.getSize()` 与 target），或将 refit 触发收敛到 ResizeObserver 回调一条通路（runtime 对象身份不参与）。

### F-04 editor `component:destroy` 句柄只销毁 engine——observer/test handle/runtime 均不释放，且 editor `setSize` 无 destroyed 守卫

- 位置：`packages/flux-renderers-industrial/src/editor/renderer/hooks/use-editor-handles.ts:82-89`；`use-editor-engine.ts:143-157`（releaseRuntime 才做全量释放，句柄路径不触达）；`editor-engine.ts:147-150`（setSize 无 `isDestroyed` 早退）
- 摘录（use-editor-handles.ts:82-89）：

```ts
if (method === 'destroy') {
  const current = latest.current.runtime;
  if (current && !current.engine.isDestroyed()) {
    current.engine.destroy();
  }
  latest.current.onDestroyed?.();
  return { ok: true };
}
```

- 特定条件：host 对 `scada-editor-canvas` 调用 `component:destroy` 后（画布显示 destroyed，组件仍挂载）。
- 后果（与 runtime 同名句柄不对称——runtime destroy → `useScadaEngine.destroy()` → `releaseRuntime()` 全量释放）：
  1. `window.__flux_scada_editor_<cid>` 测试句柄不移除（`removeScadaEditorTestHandle` 只在 releaseRuntime/unmount 调用），持有已销毁 engine/app 引用（泄漏 + 陈旧断言锚点）；
  2. ResizeObserver 仍挂着容器，回调 rAF 里 `runtimeRef.current` 非空、engine 已销毁 → `editor-engine.setSize` **无 destroyed 守卫**（对照 runtime `scada-engine.ts:315-319` 有守卫）→ `app.resize` 打到已销毁 app；
  3. `runtimeRef`/React state 仍持已死 runtime，后续句柄靠 `isDestroyed()` 二次判定兜底（当前已覆盖）。
- 修复方向：把 destroy 句柄接到 releaseRuntime 等价路径（hook 暴露 `destroy`，同 runtime 模式）；editor `setSize`/`forceRender` 补 `destroyed` 早退。

## P2 风险

### F-05 editor `getSymbol` 句柄返回 leafer 原生键名——与 runtime 契约不对称，注释与实现背离

- 位置：`packages/flux-renderers-industrial/src/editor/renderer/editor-engine.ts:297-303`；消费方 `use-editor-handles.ts:117-127`；对照 runtime `engine/scada-engine.ts:273-281`
- 摘录（editor-engine.ts:297-303）：

```ts
/** 读图元实例属性（与 runtime getSymbolProps 对称，经 fromNodeAttrs 反向映射）。 */
getSymbolProps(id: string): Partial<ScadaSymbolProps> | undefined {
  const leaf = this.registry.get(id);
  if (!leaf) return undefined;
  const raw = leaf.node.get() as Record<string, unknown>;
  return raw as Partial<ScadaSymbolProps>;   // ← 未调 fromNodeAttrs，注释宣称的对称不存在
}
```

- 风险：editor `component:getSymbol` 返回 `fontSize/scaleX+scaleY/dashPattern/Text fill`（raw leafer 面），runtime 返回 `textSize/scale/strokeDash/textColor`（schema 面）——同一句柄族两套键名；host 对 editor 做 `getSymbol→setSymbolProps` 往返会喂错键（runtime 侧 P2-10 修复过的同型缺陷在 editor 侧复发）。
- 修复方向：editor `getSymbolProps` 复用 `fromNodeAttrs(leaf.node, raw)`，与注释及 runtime 对齐。

### F-06 inspector 每次渲染全量 `validateScadaConfig`——拖拽期间每帧 O(n) 校验，威胁编辑包络

- 位置：`packages/flux-renderers-industrial/src/editor/inspector/inspector-panel.tsx:34`
- 摘录（inspector-panel.tsx:29-37，组件体每渲染执行）：

```ts
const node: ScadaSymbolNode | undefined = selectedNodeId
  ? findNode(runtime.session.workingConfig.symbols, selectedNodeId)
  : undefined;
...
const validation = validateScadaConfig(runtime.session.workingConfig); // ← 每渲染全量校验，无 memo/无失效标记
const fieldErrors = validation.ok
  ? {}
  : parseFieldErrors(validation.errors, selectedNodeId, runtime.session.workingConfig);
```

- 链路：拖拽每帧 `handleGeometryChange` → microtask `notifySession` → `bumpSessionVersion`（scada-editor-canvas.tsx:79）→ inspector 重渲染 → 全树校验（validator 对每节点 ~40 字段检查）。1k 图元 ≈ 40k 检查/帧尚可，10k 图元 ≈ 400k/帧会侵蚀拖拽 30fps 包络；字段键入路径同理。
- 修复方向：校验结果挂 session 失效标记（mutator 写入时置脏，读取时才重算），或仅在 `parseFieldErrors` 消费路径按需执行。

### F-07 `evaluateFlux` 每次求值重建全量点表 eval scope——expression 绑定场景 O(E×P) 二次方

- 位置：`packages/flux-renderers-industrial/src/binding/refresh-pipeline.ts:260-283`（evaluateFlux → `buildEvalScope()`）与 `:354-391`（buildEvalScope 遍历全部 pointIds）
- 摘录：

```ts
private evaluateFlux(expression: string): FluxEvalOutcome {
  ...
  const scope = this.buildEvalScope();   // ← 每个表达式求值都 O(P) 重建 {pointId: value} 全表
  const value = this.options.compiler.evaluateValue(compiled, scope, this.options.env);
```

- 风险：`collectBindings` 对每个 `binding.expression` 调 `resolver.evaluate` → `evaluateFlux` → `buildEvalScope`。N 个 expression 绑定 × P 个声明点 = O(N×P) 每帧（scope-dirty 全量重算时更甚）。1 万点 + 全 expression 绑定 ≈ 1e8 次-map 写/帧，超出帧预算；纯 `binding.point` 路径不受影响（O(1) 读）。
- 修复方向：`flushFrame`/`collectBindings` 入口构建一次共享 eval scope（脏帧内复用），`syncExpressionPoint` 的懒求值 `get` 闭包同理可共享 data 底座。

### F-08 editor 扩展句柄的存在性检查只扫顶层 symbols——嵌套子图元经句柄不可达

- 位置：`packages/flux-renderers-industrial/src/editor/renderer/hooks/use-editor-handles.ts:150-153`（addSymbol duplicate 检查 `symbols.find`）、`:157-163`（removeSymbol `symbols.some`）、`:165-174`（updateSymbol）、`:196-214`（group/ungroup）
- 摘录：

```ts
case 'removeSymbol': {
  ...
  const exists = current.session.workingConfig.symbols.some((s) => s.id === nodeId); // 仅顶层
  if (!exists) return { ok: false, error: new Error('symbol-not-found') };
```

- 风险：内部 mutator（removeWorkingSymbol/updateWorkingNode）与键盘删除均支持嵌套子图元（递归），句柄层对嵌套 id 返回 `symbol-not-found`——同一操作两个入口语义不一致；addSymbol 的 duplicate-id 检查也只对顶层，嵌套同名 id 会绕过检查（后续由 `resolveUniqueNodeId` 兜底改 id，与 duplicate-id 报错语义冲突）。
- 修复方向：句柄存在性检查改用 `collectAllSymbols`/`findNodeInWorking` 递归口径。

## P3 提示

1. **超 500 行文件（D8，WARN 档非 ERROR 红名单）**：`engine/scada-engine.ts`（547）、`binding/refresh-pipeline.ts`（505）落在 `check-oversized-code-files` 的 WARN 区间（500-700，"evaluate for split"），非 ERROR 红名单（ERROR 红名单当前仅 `flux-renderers-layout/wizard-renderer.tsx:716`，属包外预存）。按 AGENTS"超 500 行应评估拆分"提示登记。
2. **editor `data-cid` 落点不一致**：`scada-editor-canvas.tsx:278-284` 把 `data-cid` 放在内层 canvas 容器 div，组件根（`.nop-scada-editor-layout`，palette/inspector 的祖先）无标记；runtime `scada-canvas.tsx:320-323` 在根。debugger"攀最近 data-cid 祖先"在 editor 面板区会失锚。
3. **数字字段清空写 0**：`inspector-field.tsx:81-87` `onChange(Number(e.target.value))`——清空输入框时 `Number('')===0`，把数值属性写成 0 而非 undefined/跳过。
4. **方向键多选 nudge 产 N 个 undo entry**：`scada-editor-canvas.tsx:361-371` 对选区逐 id 调 `updateWorkingNode`（每次 snapshot+push+notify），与同文件 delete/ungroup 的"批量单 diff"纪律（P2-4）不一致；多选按一次方向键 = N 步 undo。
5. **palette 点击固定落 (50,50)**：`editor-palette.tsx:38-49`（drop 路径已修指针落点 P1-11，click 路径仍堆叠）。
6. **`forceRender` 无 destroyed 守卫**：`engine/scada-engine.ts:380-382`（test-handle 路径，destroy 后调用会打到死 app）。
7. **`measureTextWidth` 每次 create 新建 canvas 元素**：`symbols/base-shapes/text.ts:14-36`——批量文本图元首屏（1 万文本）时 1 万次 `createElement('canvas')` GC churn，可模块级缓存 2d ctx。
8. **parseError 场景 `scada:error` 可能重复派发**：`scada-canvas.tsx:262-266` effect deps 含 `eventsApi`，其身份随 config 变化（eventIndex 重建）——config 身份 churn + 持续 parseError 时每次重派。低频边角。
9. **`resolveStateDriver` 缺省取 `targets[0]`（插入序）**：`refresh-pipeline.ts:441-456`——bindings key 序变化可翻转 state-driver；已有 `stateSource` 显式逃生门且 config-types.ts:42-48 已文档化，提示 author 侧约定。
10. **scope-dirty 全量绑定重算**：`refresh-pipeline.ts:116-122`——任一 scope 写入触发全部绑定重算（文档化设计，直连 scope 绑定大场景的帧成本依赖合帧兜底）；与 F-07 叠加时放大。另：`use-scada-engine.ts:174-177` mount effect 对 container 缺失无重试机制（生产框架层 `node-renderer-resolved.tsx:422` 对 !visible 整体卸载使其不可达，仅单测直挂 renderer 时可见——suspect，防御性提示）。

## 检查过程记录

1. **前置阅读**：`docs/references/quick-reference.md`、`docs/architecture/renderer-runtime.md`（契约基线：props.props/meta/regions/events/helpers、标准 hooks、事件转发、one-shot scope 纪律）。
2. **核心精读**（按数据流顺序）：scada-canvas.tsx → use-scada-engine / use-scada-config-sync / use-scada-points-bridge / use-scada-events / use-scada-handles → scada-engine.ts（含 plugin-interaction sync / zoomLayer 双源同步 / applyViewportState 锚点数学）→ event-bridge / hit / viewport / interaction-overlay / tree-registry / config-adapter → point-store / refresh-pipeline / animator / dirty-collector / bind-resolver / reverse-index / flux-eval / value-to-state / expression-errors → visual-state / symbol-factory / symbol-registry / register-builtin / composite / compound / style-resolver。核实项：init/dispose 配对（engine destroy、pipeline/animator/collector destroy、EventBridge detach、RO disconnect、rAF cancel——全部成对且幂等）；缩放钳制（clampScale/clampViewport、零/NaN 守卫、插件 wheel 锚点钳制）；点位批处理（setPointValues 批量 + drainDirty + 合帧 flush，性能红线"不逐点 setState"达成）；断线/stale 值面（无长连通道，deadband/去重上报在位）；表达式 fallback（compile/evaluate 失败 continue + reportOnce 去重，画布不升级 error——§8.1 契约遵守）。
3. **editor 精读**：scada-editor-canvas / use-editor-engine / use-editor-handles / editor-engine / editor-adapter / editor-session / runtime-factories / runtime-mutators / toolbox-runtime / editor-working-helpers / undo-redo 全家（stack/adapter/compute-inverse/coalesce）/ clipboard / z-order / align-distribute / connection 全家（wiring/drag-controller/adapter/anchor-snap/link/overlay/renderer）/ inspector 全家 / palette / toolbox-panel / test-handle 三件套 / editor-errors / 双 schemas / 双 index。核实项：undo 栈增量逆 diff、事务节流（一拖拽一步）、peek+commit 两段式失败回滚、嵌套递归纪律（collectAllSymbols/detachNodesRecursive）、id 碰撞自增（add/group/paste/connection）。
4. **grep 扫描**（生产代码，排除 test/test-support）：`as any`/`@ts-ignore`/`@ts-expect-error` = **0**；空 catch 共 7 处全部有注释理由（诊断通道隔离、JSON.parse 草稿、measureText fallback、probe 失败降级）；`setInterval`/`setTimeout` = 0；`addEventListener` 3 处（editor-adapter transform 事务 pointerup、connection-wiring 2 处）均与 removeEventListener/cleanup 配对且 `{once:true}` 纪律；`requestAnimationFrame` 5 处全部有 cancel 配对（rafIdRef / cancelClock / cancelFrame / cancelTick）；ResizeObserver 2 处（runtime/editor engine）均 disconnect 于 releaseRuntime；硬编码中文 UI 字符串 = 0（仅测试标题）。
5. **门禁复核**（只读 node 脚本，未跑 pnpm）：`check-scada-symbol-keys` PASS（31 字段对齐）；`check-i18n-keys` PASS（industrial.scada.\* 命名空间在 zh-CN/en-US locale 在位）；`check-oversized-code-files`——本包无 ERROR 级（>700）项，2 文件 WARN（见 P3-1）。
6. **e2e 交叉核对**：确认两处已知 watch-only 残留（edge line geometric / edge polygon leafer-render-timing）属 flow-designer 域（`tests/e2e/flow-designer-edge-creation.spec.ts` 族），与本包 F-01 无重叠，未重复上报；scada connection e2e 仅覆盖"拖拽不平移视口"与数据面 `listConnections`，无 stub 上屏断言（F-01 测试盲区佐证）。
7. **反误报排查**：disabled→enabled 事件重接（engine 恒装 EventBridge + latest-ref 早退，scada-canvas.tsx:199-202 注释成立）；visible:false mount 死锁（框架层 node-renderer-resolved.tsx:422 整体卸载使 renderer 层守卫不可达，降为 P3-10 suspect）；points-bridge fallback `{}` 身份 churn（useSyncExternalStoreWithSelector 缓存 selector 结果，快照不变时复用，无重渲染风暴）；importConfig 回刷（nonce 单次消费 + baseline 身份匹配，L4 修复在位）。
8. 铁律遵守：未修改 `packages/` 下任何文件；未运行 pnpm 命令；本报告为唯一写出的文件。
