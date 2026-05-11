# 维度 15：安全与性能红线

## 第 1 轮（初审）

### [维度15-01] surface 校验计划编译失败时静默降级为“无校验”并继续打开

- **文件**: `packages/flux-runtime/src/action-adapter.ts:43-50`, `packages/flux-runtime/src/action-adapter.ts:220-228`, `packages/flux-runtime/src/action-adapter.ts:270-278`
- **证据片段**:
  ```ts
  try {
    const compiled = runtime.compile({ type: 'page', body });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    return root?.validationPlan;
  } catch {
    return undefined;
  }
  ```
- **严重程度**: P1
- **现状**: `resolveSurfaceValidationPlan()` 编译失败时直接返回 `undefined`，随后 dialog/drawer 仍继续打开。
- **风险**: surface 在缺少 validation owner plan 的情况下继续运行，且失败路径没有结构化上报，容易把“校验能力缺失”伪装成“打开成功”。
- **建议**: 至少补上 monitor/host reporting，并明确 surface 编译失败后的退化语义。
- **为什么值得现在做**: 这是公共 openDialog/openDrawer 入口，一处修正即可覆盖所有 surface 打开路径。
- **误报排除**: 问题不在于用了 `try/catch`，而在于异常被吞后继续放行到更弱的运行状态。
- **历史模式对应**: compile failure 被静默降级为更弱能力。
- **参考文档**: `docs/architecture/security-design-requirements.md`, `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

### [维度15-02] legacy graph 插入命令在重连边时形成可避免的 O(n^2)

- **文件**: `packages/flow-designer-renderers/src/designer-command-adapter.ts:333-349`, `packages/flow-designer-renderers/src/designer-command-adapter.ts:381-410`, `packages/flow-designer-core/src/core-edge-commands.ts:131-145`, `packages/flow-designer-core/src/core-edge-commands.ts:221-226`
- **证据片段**:
  ```ts
  const incomingEdges = doc.edges.filter((e) => e.target === command.targetId);
  core.beginTransaction('insert-at-merge');
  for (const edge of incomingEdges) {
    core.reconnectEdge(edge.id, edge.source, newNode.id);
  }
  ```
- **严重程度**: P2
- **现状**: `insertChainNodeAtMerge` / `insertBranchPair` 先线性收集边，再在循环里调用内部会再次线性扫描边表的 core API。
- **风险**: graph fallback 路径在边较多时会退化为多次全量边表扫描/重建。
- **建议**: 以文档级批量变换替代“循环内逐条重连/删除”的实现。
- **为什么值得现在做**: 即使当前 tree-mode 主路径已绕开这里，legacy graph fallback 仍保留同类复杂度债。
- **误报排除**: 不是泛泛看到 `.find()` 就报，而是明确存在“循环内再次线性扫描整表”的嵌套结构。
- **历史模式对应**: graph mutation fallback 中的 avoidable O(n^2) 残留。
- **参考文档**: `docs/architecture/performance-design-requirements.md`, `docs/architecture/flow-designer/design.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度15-03] legacy `insertChainNode` 删除原出边时形成另一条 O(n^2) 热路径

- **文件**: `packages/flow-designer-renderers/src/designer-command-adapter.ts:279-299`, `packages/flow-designer-core/src/core-edge-commands.ts:207-226`, `packages/flow-designer-core/src/core/edge-operations.ts:44-48`
- **证据片段**:
  ```ts
  if (downstreamId) {
    for (const edge of outgoingEdges) {
      core.deleteEdge(edge.id);
    }
    core.addEdge(command.sourceId, newNode.id);
  }
  ```
- **严重程度**: P2
- **现状**: `insertChainNode` 先 `filter` 出所有出边，再逐条调用 `deleteEdge()`；每次删除都会再次线性扫描并重建边数组。
- **风险**: graph fallback 路径上单次插入链节点可退化为多次全量边表重写。
- **建议**: 一次性构造新边集并单次 `setDocument()`，避免循环内逐条删除。
- **为什么值得现在做**: 与 [维度15-02] 同属同根复杂度债，适合一起收敛。
- **误报排除**: 问题不在于单个 `filter`，而在于“循环内重复 deleteEdge -> 全量扫描”的组合。
- **历史模式对应**: graph mutation fallback 中的 avoidable O(n^2) 残留。
- **参考文档**: `docs/architecture/performance-design-requirements.md`, `docs/architecture/flow-designer/design.md`
- **复核状态**: 未复核

### [维度15-04] `DesignerCore.getDocument()` / `getSnapshot()` 直接暴露 live graph 引用

- **文件**: `packages/flow-designer-core/src/core.ts:147-160`, `packages/flow-designer-core/src/core/snapshot.ts:37-50`, `packages/flow-designer-core/src/core/snapshot.ts:81-115`
- **证据片段**:
  ```ts
  function getDocument(): GraphDocument {
    return doc;
  }
  // snapshot cache
  snapshot: {
    doc: input.doc,
    selection,
  }
  ```
- **严重程度**: P1
- **现状**: public getter 直接返回内部 `doc` 与 cached snapshot 中的 by-reference 只读视图。
- **风险**: 按当前架构基线，by-reference readonly view 本身不是缺陷；该条仅在出现真实 mutation 路径、脱离框架只读纪律、或 owner 文档明确要求 detached snapshot 时才成立。
- **建议**: 若后续发现真实 mutation 路径，再补 focused contract tests；否则不应因零拷贝只读视图本身而修改实现。
- **为什么值得现在做**: 需要明确澄清它在当前基线下属于候选误报，避免后续继续把零拷贝 readonly view 误判为问题。
- **误报排除**: 当前 `frontend-programming-model.md` 与 `capability-projection-manifest.md` 已明确：readonly 不等于 clone-on-read。
- **历史模式对应**: 零拷贝只读读面被误判为 live-state 泄漏。
- **参考文档**: `docs/architecture/flow-designer/design.md`, `docs/architecture/flow-designer/runtime-snapshot.md`
- **复核状态**: 未复核

### [维度15-05] source/reaction 级联上限命中后仍有残余 console-only 可观测性缺口

- **文件**: `packages/flux-runtime/src/async-data/reaction-runtime.ts:150-159`, `packages/flux-runtime/src/async-data/source-registry.ts:227-230`
- **证据片段**:
  ```ts
  if (!enteredGlobalCascade) {
    console.error('[flux-runtime] Global reaction cascade depth limit exceeded');
    dispose();
    return;
  }
  ```
- **严重程度**: P2
- **现状**: 残余的 global/source cascade limit 失败路径仍然只打 `console.error`，没有统一 host reporting。
- **风险**: 运行时会进入被限流后的降级状态，但 host/debugger 只能看到零散 console 文本。
- **建议**: 统一接入 `reportRuntimeHostIssue()` / monitor，并带上 runtime、scope、source/reaction 标识。
- **为什么值得现在做**: 上限保护真正触发时最需要可观测性，否则保护机制本身会变成难排查的静默降级。
- **误报排除**: 这里明确只指残余的 console-only 路径，不重报已走 host reporting 的 reaction fire-count limit。
- **历史模式对应**: 失败安全阀只写 console，不进结构化诊断。
- **参考文档**: `docs/architecture/performance-design-requirements.md`, `docs/architecture/api-data-source.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度15-06] source/reaction 级联深度计数器是模块级共享状态，会跨 runtime 串扰

- **文件**: `packages/flux-runtime/src/async-data/reaction-runtime.ts:15-16`, `packages/flux-runtime/src/async-data/source-registry.ts:12-13`, `packages/flux-runtime/src/runtime-factory.ts:573-578`
- **证据片段**:
  ```ts
  let globalCascadeDepth = 0;
  const MAX_GLOBAL_CASCADE_DEPTH = 200;
  let sourceCascadeDepth = 0;
  const MAX_SOURCE_CASCADE_DEPTH = 100;
  ```
- **严重程度**: P1
- **现状**: `createRendererRuntime()` 会创建新的 source/reaction registry，但真正的 depth counter 仍是模块顶层变量。
- **风险**: 一个 runtime 实例中的级联活动会影响另一个实例的限流判断，形成跨实例串扰与难复现降级。
- **建议**: 把 cascade counter 下沉到 registry/runtime 实例内，至少做到 per-runtime owner。
- **为什么值得现在做**: 这是 live runtime 的基础保护逻辑，所有多实例页面/测试都可能命中。
- **误报排除**: 问题不是“有全局常量”，而是可变计数器本该 owner-local 却被做成 process-global。
- **历史模式对应**: 模块级共享可变状态破坏实例隔离。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

### [维度15-07] auto-layout 失败时只 `console.warn`，host 无法看到结构化失败信号

- **文件**: `packages/flow-designer-renderers/src/use-designer-auto-layout.ts:92-113`, `packages/flow-designer-renderers/src/designer-page-body.tsx:236-248`
- **证据片段**:
  ```ts
  .catch((error: unknown) => {
    console.warn('[flow-designer] Auto-layout failed', error);
  })
  .finally(() => {
    setLayoutBusy(false);
  });
  ```
- **严重程度**: P2
- **现状**: 初始 auto-layout 失败后只做 `console.warn`，随后 `layoutBusy` 归零；statusPath 看起来只是“busy 结束了”。
- **风险**: 设计器 host 无法区分“布局没触发”和“布局失败后静默回退”。
- **建议**: 把 layout failure 接入 monitor/host reporting，并在 designer status/debug surface 暴露最近一次 layout error。
- **为什么值得现在做**: Flow Designer 是复杂交互面，failure semantics 需要对 host 可见。
- **误报排除**: 这里不是笼统说“所有布局路径都只有 console”，而是针对已证实的初始 auto-layout effect 路径。
- **历史模式对应**: degraded behavior 被隐藏成普通 idle 状态。
- **参考文档**: `docs/architecture/performance-design-requirements.md`, `docs/architecture/flow-designer/canvas-adapters.md`
- **复核状态**: 未复核

### [维度15-08] `DataSourceController.getState()` 直接返回 live 内部状态对象

- **文件**: `packages/flux-runtime/src/async-data/api-data-source-controller.ts:93-96`, `packages/flux-runtime/src/async-data/formula-data-source-controller.ts:144-147`
- **证据片段**:
  ```ts
  return {
    getState() {
      return mutable.state;
    },
  };
  ```
- **严重程度**: P1
- **现状**: controller 的公开 `getState()` 返回 canonical state 本体作为零拷贝只读读面。
- **风险**: 在当前框架基线下，by-reference readonly view 本身不构成缺陷；只有出现真实 mutation 路径或越过只读纪律边界时才成立。
- **建议**: 保留当前实现；若未来出现框架外 consumer 或 mutation 证据，再补局部文档或 focused tests。
- **为什么值得现在做**: 需要把这条标记为候选误报，避免把性能基线和只读读面设计误判为问题。
- **误报排除**: 当前架构已明确 getter/snapshot 可返回 by-reference readonly view。
- **历史模式对应**: 零拷贝只读读面被误判为 live-state 泄漏。
- **参考文档**: `docs/architecture/performance-design-requirements.md`, `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度15-09] tree-mode `plusButtonHandlerHolder` 是模块级共享回调，多个 designer 实例会互相串扰

- **文件**: `packages/flow-designer-renderers/src/designer-canvas.tsx:14-25`, `packages/flow-designer-renderers/src/designer-canvas.tsx:66-73`, `packages/flow-designer-renderers/src/designer-page-body.tsx:101-110`
- **证据片段**:
  ```ts
  const plusButtonHandlerHolder = { current: null };
  plusButtonHandlerHolder.current = handlePlusButtonClick;
  return () => {
    plusButtonHandlerHolder.current = null;
  };
  ```
- **严重程度**: P2
- **现状**: tree-mode 节点上的“+”点击通过模块级 holder 间接转发，而不是走当前 designer 实例自己的 bridge。
- **风险**: 多实例并存时最后挂载者会覆盖前者回调；任一实例卸载还会把另一个实例的 handler 清空。
- **建议**: 改成实例级 context/bridge，禁止 module-level singleton 承载交互转发。
- **为什么值得现在做**: 这是 live 用户交互路径，会直接造成同页多实例串扰。
- **误报排除**: 这里不是机械地反对模块变量，而是 holder 直接承载用户点击路由，且 cleanup 会影响别的存活实例。
- **历史模式对应**: 模块级共享可变桥接状态导致跨实例串扰。
- **参考文档**: `docs/architecture/flow-designer/canvas-adapters.md`, `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

### [维度15-10] formula data source 首轮 publish 失败没有进入 monitor/host reporting

- **文件**: `packages/flux-runtime/src/async-data/formula-data-source-controller.ts:172-185`, `packages/flux-runtime/src/async-data/api-data-source-controller.ts:16-24`, `packages/flux-runtime/src/async-data/api-data-source-controller.ts:86-86`
- **证据片段**:
  ```ts
  void Promise.resolve()
    .then(() => {
      publish();
    })
    .catch((error: unknown) => {
      updateState((current) => ({ ...current, status: 'error', error }));
    });
  ```
- **严重程度**: P2
- **现状**: formula source 的首轮 `publish()` 失败会写回 state/status，但不会走 `reportRuntimeHostIssue()` 或 `monitor.onError()`。
- **风险**: host/debugger 看不到首轮 publish 失败；未配置 `statusPath` 时更接近静默失败。
- **建议**: 在 formula controller 的 `publish()/start()/refresh()` 失败链补统一 reporting。
- **为什么值得现在做**: runtime-critical failure path 只写本地状态，不足以满足当前可观测性要求。
- **误报排除**: 问题不在于 state 没更新，而在于 host 侧没有结构化失败信号。
- **历史模式对应**: owner 内失败只写局部状态，不上报诊断。
- **参考文档**: `docs/architecture/security-design-requirements.md`, `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度15-11] `DesignerCore.getConfig()` 直接暴露 live `NormalizedDesignerConfig`

- **文件**: `packages/flow-designer-core/src/core.ts:163-165`, `packages/flow-designer-core/src/core/config.ts:3-59`
- **证据片段**:
  ```ts
  const normalizedConfig = normalizeConfig(config);
  function getConfig(): NormalizedDesignerConfig {
    return normalizedConfig;
  }
  ```
- **严重程度**: P1
- **现状**: public `getConfig()` 返回内部持有的配置对象，当前语义应按零拷贝只读读面解释。
- **风险**: 在缺少真实 mutation 证据的情况下，这条不能仅因 by-reference 暴露成立。
- **建议**: 不以 clone/freeze 作为默认修复方向；如未来发现特殊例外需要可写协议，再通过显式文档或注释收口。
- **为什么值得现在做**: 需要把“config by-reference”与真实模块级共享可变状态问题区分开。
- **误报排除**: 当前框架总原则已明确 projection/getter 暴露只读接口，底层实现可绑定内部对象。
- **历史模式对应**: 零拷贝只读读面被误判为 live-state 泄漏。
- **参考文档**: `docs/architecture/flow-designer/design.md`, `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

### [维度15-12] `PageStoreApi.getState()` / `PageRuntime.store.getState()` 暴露 live page data 引用

- **文件**: `packages/flux-core/src/types/runtime.ts:219-225`, `packages/flux-runtime/src/form-store.ts:401-425`, `packages/flux-runtime/src/runtime-owned-factories.ts:127-153`, `packages/flux-runtime/src/page-runtime.ts:44-57`
- **证据片段**:
  ```ts
  export interface PageStoreApi {
    getState(): PageStoreState;
    setData(data: Record<string, any>): void;
    updateData(path: string, value: unknown): void;
  }
  ```
- **严重程度**: P1
- **现状**: `getState()` 直接返回 store state；managed page runtime 把 `data` 暴露为零拷贝只读读面。
- **风险**: 按当前基线，by-reference readonly view 合法；没有真实 mutation 证据时不能据此成立缺陷。
- **建议**: 不引入默认 clone；若后续发现 page store 被交给不受只读纪律约束的外部 consumer，再单独收口。
- **为什么值得现在做**: 需要明确撤销这类“仅因 by-reference 暴露就成立”的判断。
- **误报排除**: 当前总原则已经明确 getter/snapshot 的 readonly 是接口语义，不是 copy 语义。
- **历史模式对应**: 零拷贝只读读面被误判为 live-state 泄漏。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

## 深挖第 6 轮追加

### [维度15-13] `component:getValues` 与默认 submit fallback 把 live form values 伪装成 snapshot/result 暴露

- **文件**: `packages/flux-runtime/src/form-component-handle.ts:54-55`, `packages/flux-runtime/src/form-runtime-submit-flow.ts:249-253`, `packages/flux-renderers-form/src/renderers/form-definition.ts:187-193`
- **证据片段**:
  ```ts
  case 'getValues':
    return { ok: true, data: form.store.getState().values };
  const executeSubmit = submitLifecycleAction
    ? () => submitLifecycleAction(options)
    : () => Promise.resolve({ ok: true, data: store.getState().values });
  ```
- **严重程度**: P1
- **现状**: public capability `getValues` 与默认 submit 结果直接返回 `store.values` 的 by-reference 只读视图；当前框架总原则允许这种零拷贝语义。
- **风险**: 只有在 form owner 文档把 `snapshot/result` 明确限定为 detached copy 时，这条才成立。当前顶层基线已明确 readonly 不等于 copy。
- **建议**: 将“snapshot/result”文案按框架统一语义解释为 readonly read surface，而不是默认要求 clone；除非后续 owner 文档显式收紧。
- **为什么值得现在做**: 需要避免把框架级 readonly view 语义与通用防御性快照语义混淆。
- **误报排除**: 这不是 `valuesPath` 问题；但也不能仅因 return-by-reference 就判定 contract break。
- **历史模式对应**: 零拷贝只读读面被误判为 copy-snapshot 违约。
- **参考文档**: `docs/components/form/design.md`, `docs/architecture/form-external-publication-and-reserved-bindings.md`
- **复核状态**: 未复核

## 深挖第 7 轮追加

### [维度15-14] `ReportDesignerCore.getSnapshot()` 与 host projection 直接暴露 live report-designer 内部对象

- **文件**: `packages/report-designer-core/src/core.ts:78-116`, `packages/report-designer-renderers/src/host-data.ts:34-86`
- **证据片段**:
  ```ts
  function buildSnapshot(): ReportDesignerRuntimeSnapshot {
    return {
      document: state.document,
      activeMeta,
      fieldSources,
      preview,
    };
  }
  ```
- **严重程度**: P1
- **现状**: `getSnapshot()` 与 host projection 直接复用内部对象作为对外 readonly projection 的实现承载。
- **风险**: 按当前总原则，host projection 暴露的是只读接口，底层实现允许直接绑定内部对象；没有真实 mutation 证据时，这条不能仅因 by-reference 暴露成立。
- **建议**: 保留零拷贝 projection 设计；若后续发现 host scope 被交给不受框架纪律约束的外部消费者，再单独收口该边界。
- **为什么值得现在做**: 需要把“只读接口”与“必须 clone”彻底解耦，避免继续误报 complex host family 的高性能实现。
- **误报排除**: 当前 `frontend-programming-model.md` 与 `capability-projection-manifest.md` 已明确：projection 是只读接口，内部实现可以是 live 对象。
- **历史模式对应**: 零拷贝只读 projection 被误判为 live-state 泄漏。
- **参考文档**: `docs/architecture/complex-control-host-protocol.md`, `docs/architecture/report-designer/design.md`, `docs/architecture/capability-projection-manifest.md`
- **复核状态**: 未复核

### [维度15-15] `ReportDesignerCore.getMetadata()` 只有浅拷贝，嵌套 metadata 仍是 live alias

- **文件**: `packages/report-designer-core/src/core.ts:214-220`, `packages/report-designer-core/src/runtime/metadata.ts:1-9`
- **证据片段**:
  ```ts
  export function cloneMetadataBag(input: MetadataBag | undefined): MetadataBag {
    return input ? { ...input } : {};
  }
  ```
- **严重程度**: P2
- **现状**: `getMetadata()` 只做浅拷贝；按当前零拷贝只读基线，这本身不足以成立问题。
- **风险**: 只有在 metadata surface 被特殊文档要求 detached copy，或出现真实 mutation 证据时才成立。
- **建议**: 不默认把 shallow clone 收紧为 deep clone；只有在例外 owner contract 明确要求时才调整。
- **为什么值得现在做**: 需要避免把“内部实现没有做深拷贝”自动等同于“只读接口违约”。
- **误报排除**: 当前框架总原则允许 projection/getter 的内部实现直接绑定内部对象。
- **历史模式对应**: 零拷贝只读 projection 被误判为 clone-depth 缺陷。
- **参考文档**: `docs/architecture/report-designer/design.md`, `docs/architecture/capability-projection-manifest.md`
- **复核状态**: 未复核

## 深挖第 8 轮追加

### [维度15-16] `createApiRequestExecutor()` 对 pre-aborted signal 仍继续调用 fetcher

- **文件**: `packages/flux-runtime/src/async-data/request-runtime.ts:366-380`, `packages/flux-runtime/src/__tests__/async-data-contracts.test.ts:300-320`
- **证据片段**:
  ```ts
  if (options?.signal) {
    if (options.signal.aborted) {
      controller.abort();
    }
  }
  const requestPromise = env.fetcher<T>(executableApi, {
    signal: controller.signal,
  });
  ```
- **严重程度**: P1
- **现状**: 父 signal 已取消时，runtime 只会先 abort 子 controller，但不会在调用 `env.fetcher(...)` 之前短路。
- **风险**: 若 host fetcher 不主动检查 pre-aborted signal，请求仍可能继续执行。
- **建议**: 评估是否需要把 pre-aborted signal 视为 runtime 侧的同步短路语义，并补相应 contract/test。
- **为什么值得现在做**: 这触及取消语义边界；即使最终不改，也值得确认 contract 归属。
- **误报排除**: 问题不是 listener 清理，而是 pre-aborted signal 是否应被 runtime 自己 short-circuit。
- **历史模式对应**: host transport 与 runtime abort contract 的责任边界不清。
- **参考文档**: `docs/architecture/performance-design-requirements.md`, `docs/architecture/api-data-source.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度15-01]: 保留为 P2。surface validation plan 编译失败后继续打开且缺少结构化上报，当前主路径不应保留这种次优退化语义。
- [维度15-02]: 保留为 P2。`insertChainNodeAtMerge`、`insertBranchPair` 与 [维度15-03] 指向同一类 legacy graph fallback O(n^2) 残留；当前 v1 基线不接受以“fallback/legacy”作为降级理由。
- [维度15-03]: 并入 [维度15-02]。它提供了同一根因的第二条证据路径，但不再单独保留为最终项。
- [维度15-04]: 驳回。按当前框架基线，`getDocument/getSnapshot` 作为 by-reference readonly view 本身不构成问题；除非后续发现真实 mutation 路径。
- [维度15-05]: 保留为 P2。残余 console-only failure path 仍然存在，未满足 runtime 失败可观测性要求。
- [维度15-06]: 保留为 P1。模块级 depth counter 与 per-runtime owner 模型明显冲突，存在跨 runtime 串扰。
- [维度15-07]: 保留为 P2。初始 auto-layout failure 是明确 observability gap，host 无法感知结构化失败。
- [维度15-08]: 驳回。`DataSourceController.getState()` 的 by-reference readonly view 与当前总原则一致；仅凭 live 引用不能成立。
- [维度15-09]: 保留为 P2。`plusButtonHandlerHolder` 会在多实例 tree-mode 下造成真实跨实例串扰。
- [维度15-10]: 保留为 P2。formula publish 首轮失败确有 host/monitor reporting 缺口。
- [维度15-11]: 驳回。`getConfig()` 作为零拷贝只读读面不再成立为问题。
- [维度15-12]: 驳回。`PageStoreApi.getState()` 的 by-reference readonly view 与当前总原则一致。
- [维度15-13]: 驳回。当前框架总原则已明确 readonly 接口不等于 detached copy；这条不再构成现行 contract break。
- [维度15-14]: 驳回。report-designer snapshot / host projection 作为零拷贝 readonly projection 合法；仅凭 by-reference 暴露不能成立。
- [维度15-15]: 驳回。浅拷贝 metadata 在当前总原则下同样不足以单独成立。
- [维度15-16]: 驳回。按当前文档，这仍然更接近 transport boundary contract gap，而不是已确认的 runtime 违约。

## 子项复核结论

- [维度15-02]、[维度15-03]: 合并保留。两条都属于同一个 graph fallback O(n^2) 设计残留，按一个 remediation owner 收口。
- [维度15-04]: 驳回。缺少真实 mutation 证据，且当前顶层文档已明确允许零拷贝 readonly view。
- [维度15-05]: 保留。仅缩窄到 residual global/source cascade limit 的 console-only 路径。
- [维度15-06]: 保留。模块级共享 depth counter 明确存在跨 runtime 串扰。
- [维度15-07]: 保留。仅对初始 auto-layout failure 路径成立，不扩大表述。
- [维度15-08]: 驳回。当前总原则下这只是合法的 by-reference readonly view。
- [维度15-09]: 保留。多实例 tree-mode 下会发生 last-writer-wins 覆盖与 cleanup 串扰。
- [维度15-10]: 保留。state/status 会更新，但 monitor/host 仍然看不到结构化失败。
- [维度15-11]: 驳回。config 读面同样适用零拷贝只读规则。
- [维度15-12]: 驳回。page store 读面按当前基线属于合法零拷贝 readonly view。
- [维度15-13]: 驳回。当前框架把 readonly interface 与 clone 语义解耦，这条不再成立为 contract break。
- [维度15-14]、[维度15-15]: 驳回。report-designer projection/getter 的 by-reference readonly 实现与当前基线一致。
- [维度15-16]: 驳回。按现行文档，这是 transport boundary contract gap，不是 runtime 侧已知违约。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                     | 一句话摘要                                                                          |
| ----- | -------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| 15-01 | P2       | `packages/flux-runtime/src/action-adapter.ts`                            | surface validation plan 编译失败后继续打开且缺少结构化上报                          |
| 15-02 | P2       | `packages/flow-designer-renderers/src/designer-command-adapter.ts`       | graph fallback 结构插入命令存在 O(n^2) 残留（含 merge/branch/insertChainNode 路径） |
| 15-05 | P2       | `packages/flux-runtime/src/async-data/reaction-runtime.ts`               | residual cascade limit 失败路径仍只打 console                                       |
| 15-06 | P1       | `packages/flux-runtime/src/async-data/reaction-runtime.ts`               | source/reaction depth counter 是模块级共享状态                                      |
| 15-07 | P2       | `packages/flow-designer-renderers/src/use-designer-auto-layout.ts`       | auto-layout 失败对 host 不可见                                                      |
| 15-09 | P2       | `packages/flow-designer-renderers/src/designer-canvas.tsx`               | `plusButtonHandlerHolder` 模块级共享导致多实例串扰                                  |
| 15-10 | P2       | `packages/flux-runtime/src/async-data/formula-data-source-controller.ts` | formula publish 首轮失败缺 monitor/host reporting                                   |
