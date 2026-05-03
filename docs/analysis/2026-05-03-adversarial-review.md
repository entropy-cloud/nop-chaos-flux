# 对抗性审查报告 — 2026-05-03

> 审查方式：先读 `AGENTS.md`、`docs/index.md`，再做开放式代码巡检。重点追查跨包契约、文档/实现偏移、隐藏生命周期语义和设计器边界条件，而不是做风格清单。

---

## 发现 1：projected form 只重映射了值和错误，没有重映射 validation 元数据

**在哪里**：

- `packages/flux-renderers-form-advanced/src/detail-view/projected-form-runtime.ts:102-205`
- `packages/flux-react/src/field-frame.tsx:101-123`
- `packages/flux-renderers-form/src/field-utils/field-validation.ts:8-30`
- `docs/architecture/object-field.md:45-97`

**是什么**：

`createProjectedFormRuntime()` 会把 `getFieldState()`、`getError()`、`setValue()`、`validateAt()` 等路径都前缀回 parent owner，但 `validation` 和 `rootPath` 直接透传 parent：

```ts
get validation() {
  return parentForm.validation;
}
get rootPath() {
  return parentForm.rootPath;
}
```

与此同时，React/field 工具层又按相对字段名查询 validation 元数据：

```ts
const validationField = name ? getCompiledValidationField(validationModel, name) : undefined;
```

这意味着 `object-field`、`variant-field`、`detail-view` 这类 projected child editor，虽然读写值时用的是相对名，但 validation model 仍然是父级绝对路径模型。`firstName` 之类相对字段名很容易在 compiled validation model 中查不到对应节点。

**为什么值得关心**：

- 这不是简单的 UI 小偏差，而是 child editor 的 validation 语义在悄悄退化
- `required`、动态 required、`showErrorOn`、隐藏字段策略等都可能落回 owner 默认值，或者直接丢失字段级行为
- 文档明确声称 projected runtime/view 会把 child field 继续绑定到 parent owner；但现在只有“值路径”被投影，“validation 元数据路径”没有一起投影，语义并不完整

**信心水平**：确定

---

## 发现 2：validation 在 `bootstrapping` / `refreshing` 状态下仍可执行，和 owner 生命周期契约冲突

**在哪里**：

- `packages/flux-runtime/src/form-runtime-validation.ts:374-425`
- `docs/architecture/form-validation.md:178-195`

**是什么**：

`validatePath()` 只显式拦截了 `disposed`：

```ts
if (sharedState.lifecycleState === 'disposed') {
  return createValidationResult([]);
}
```

但文档的 owner lifecycle 规则写得很清楚：

- `compiledModel === null` 只允许出现在 `bootstrapping` / `refreshing` / `disposed`
- ordinary validation 不能在 `compiledModel === null` 时执行
- transitional state 可以延迟请求，但不应把“还没 ready”当成“验证通过”

当前实现里，如果字段/model 还没接上，很多路径会直接返回空错误结果。

**为什么值得关心**：

- 这会把“owner 尚未 ready”误判成“validated OK”
- 今天可能只是边缘语义洞，但随着 page-root owner、非 form validation owner、动态 schema replacement 增多，这个洞会变成难排查的时序 bug
- 这类 bug 最危险的地方在于：行为看起来是“偶发不报错”，不是显式崩溃，所以很容易长期潜伏

**信心水平**：确定

---

## 发现 3：`submitForm` 的跨表单 targeting 被 `flux-action-core` 提前拦截，runtime 支持路径到不了

**在哪里**：

- `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts:211-224`
- `packages/flux-runtime/src/action-adapter.ts:131-158`
- `docs/architecture/action-scope-and-imports.md:443-452`

**是什么**：

`flux-action-core` 在 built-in `submit` / `submitForm` 分支里，先要求当前 `ctx.form` 必须存在：

```ts
if (!ctx.form) {
  return { ok: false, error: new Error('submit requires form runtime') };
}
```

但 `flux-runtime` 的 adapter 明确支持另一条路径：如果 `targeting.formId` 存在，则通过 `componentRegistry.resolve({ componentId: formId })` 找目标表单，再调用它的 `submit` capability。

也就是说，runtime 已经支持“当前 action 不在该表单内部，但按 `formId` 定向提交”的语义，而 dispatcher 在更早一层把它挡掉了。

**为什么值得关心**：

- toolbar、page action、dialog 外层 action 定向提交某个 form 时，可能会莫名失败
- 这是典型的跨包契约撕裂：adapter 看起来支持，dispatcher 却让真实执行根本到不了 adapter
- 这种错位特别容易在单包测试都通过时漏掉，直到集成场景才暴露

**信心水平**：确定

---

## 发现 4：`timeout` 会切断上层 abort 传播，导致“超时”与“取消”语义互相打架

**在哪里**：

- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:66-76`
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:268-283`
- `packages/flux-action-core/src/operation-control.ts:37-76`
- `docs/architecture/action-scope-and-imports.md:568-582`

**是什么**：

`runSingleActionWithTimeout()` 用 `withTimeout()` 包裹执行；`withTimeout()` 内部新建了一个全新的 `AbortController`，并把这个新 signal 传给真实 action：

```ts
return withTimeout(
  (signal) => runSingleAction(ctx, action, actionCtx, signal),
  timeoutMs,
  () => createTimedOutResult(...),
);
```

而 `runSingleAction()` 会优先用这个新的 signal 覆盖原来的 `actionCtx.signal`。

结果是：一旦 action 配了 `timeout`，父 interaction/unmount/上游取消就未必还能传到真正的底层工作。

**为什么值得关心**：

- 文档明确把 cancellation 当作 shared execution semantics，而不是 UI 提示
- 现在的实现相当于“加了超时，就可能失去父级取消能力”
- 对请求型 action、host action、长耗时 namespaced action，这会制造后台继续跑的陈旧异步工作；系统表面上已经 timeout/cancel，底层却还在执行

**信心水平**：确定

---

## 发现 5：tree mode 每次树编辑都会重建整个 core，文档承诺的 shared history/selection 并不稳定

**在哪里**：

- `packages/flow-designer-renderers/src/designer-page.tsx:61-95`
- `packages/flow-designer-renderers/src/designer-page.tsx:442-463`
- `packages/flow-designer-renderers/src/designer-command-adapter.ts:58-64`
- `packages/flow-designer-core/src/core.ts:55-75`
- `docs/architecture/flow-designer/tree-mode.md:296-301`

**是什么**：

tree mode 把 `treeDocument` 放在 React state 中，每次变更先重新投影成 `GraphDocument`，然后：

```ts
const core = useMemo(() => createDesignerCore(document, config), [document, config]);
```

与此同时，tree command adapter 又会在应用 tree 变更时调用：

```ts
treeOwner.setTreeDocument(nextTree);
core.replaceDocument(projectTreeDocumentToGraph(nextTree, core.getConfig()));
```

也就是说，当前 core 先被 `replaceDocument(...)` 改一次，接着下一次 render 又因为 `document` 变了而整体 `createDesignerCore(...)` 一次。`core.ts` 里 history、selection、snapshot cache 都是在 core 创建时初始化的。

**为什么值得关心**：

- 文档说 `graph` 和 `tree` 两个 Core 共享 `selection`、`history`、`clipboard`、`snapshot`
- 但当前 tree mode 更像“树 -> 投影成图 -> 重建一个新的图编辑器 core”，不是“稳定的 tree runtime owner”
- undo/redo、选择态、branch focus、clipboard 这类 core-owned 状态都可能在 tree 编辑后被重置或变得脆弱

**信心水平**：确定

---

## 发现 6：Flow Designer 文档宣称“port-first connection model”，但交互链路基本仍是 node-to-node

**在哪里**：

- `docs/architecture/flow-designer/design.md:271-290`
- `packages/flow-designer-core/src/types.ts:28-35,44-49`
- `packages/flow-designer-renderers/src/designer-command-types.ts:13-66`
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/render-ports.tsx:31-44`
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx:379-400`
- `packages/flow-designer-core/src/core-edge-commands.ts:36-93`
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/xyflow-utils.ts:72-93`

**是什么**：

文档里把 port 级连接建模写成了明确 baseline：先验存在性、方向、role、maxConnections、edgeType 都应以 port 为中心校验。

代码里也确实有 port 痕迹：

- `GraphEdge` 类型有 `sourcePort?` / `targetPort?`
- `beforeConnect` hook 签名支持 port
- UI 会渲染带 `id={port.id}` 的 `Handle`

但真实交互链路里，连接命令只传 `source` 和 `target`：

```ts
type DesignerCommand =
  | { type: 'addEdge'; source: string; target: string; ... }
  | { type: 'reconnectEdge'; edgeId: string; source: string; target: string }
```

`handleConnect()` / `handleReconnect()` 也直接把 handle 信息丢掉了；`addEdgeCommand()` 创建的新 edge 也只保存 node id；`createXyflowEdges()` 回渲染时同样没有 `sourceHandle` / `targetHandle`。

**为什么值得关心**：

- 这是设计文档与 live editing 语义的正面冲突，不是“还没优化”的小缺口
- 一旦节点有多个输出口，例如条件分支、true/false 端口、并行出口，用户新建或重连的边无法稳定保留端口身份
- 结果会是：模型类型声称支持 port，UI 也画出了 port，但真正保存和校验的仍然只是 node-to-node 关系

**信心水平**：确定

---

## 总评

这次审查里，最值得优先盯住的 3 个方向是：

1. **投影/owner 语义是否真的闭环**
   当前最危险的问题不是某个 API 崩溃，而是 `projected form`、validation owner、relative path authoring 这些设计上非常核心的语义，只闭合了“值路径”，没有闭合“validation 元数据”和“lifecycle 仲裁”。这类问题会持续制造“看起来大体能用，但边界行为总是不稳定”的系统感受。

2. **action 执行栈的 shared semantics 是否在跨包边界被破坏**
   `submitForm` 和 `timeout/abort` 两个问题都说明，`flux-action-core` 与 `flux-runtime` 之间的职责边界虽然文档上已经说清，但实现上仍存在提前拦截、语义覆盖、信号丢失。动作系统一旦出现这种层间撕裂，后续新增 built-in / host action 会越来越难保持一致。

3. **Flow Designer 目前更像“投影图壳”，还不是稳定的领域 runtime**
   tree mode core 重建、port 语义未落地，说明设计器在文档层面已经进入“领域运行时”叙事，但实现层面仍然偏向 UI 壳层。这不是坏事，但需要尽快决定：是把文档降回现实基线，还是把 runtime 真正补齐到文档承诺的层级。
