# 维度 07: 生命周期与副作用归属

## 第 1 轮（初审）

### [维度07-01] NodeRenderer 在 render/useMemo 中创建 import bindings child scope，仍存在 render-phase runtime mutation

- **文件**: `packages/flux-react/src/node-renderer.tsx`
- **行号范围**: `182-193`
- **证据片段**:

  ```tsx
  const renderScope = useMemo(
    () => {
      if (!importBindings || Object.keys(importBindings).length === 0) {
        return props.scope;
      }

      return runtime.createChildScope(props.scope, importBindings, {
        pathSuffix: 'imports',
        scopeKey: `${props.node.id}:imports`,
      });
    },
  ```

- **严重程度**: P1
- **effect 职责**: import bindings scope 的创建、持有与 teardown。
- **应归属层级**: React commit 阶段的 lifecycle effect，或 runtime 提供 commit-safe 的 scope owner API；不应在 render/useMemo 阶段创建 runtime-owned scope。
- **现状**: `useMemo` 在 render 阶段调用 `runtime.createChildScope()`，而 `createChildScope()` 会登记 runtime-owned scope disposer；cleanup 依赖后续 `useLayoutEffect` 执行。
- **风险**: React 并发/中断 render 或异常 render 时，render 阶段创建的 scope 可能没有对应 committed effect cleanup；同时也重新引入“render phase must stay side-effect free”的历史风险。
- **建议**: 采用与 import frame 安装相同的 commit-safe 模式：在 `useLayoutEffect` 中创建/替换 import bindings scope，用 ref/external-store 发布已提交 scope；未提交前返回 `null` 或继承父 scope，避免 render 阶段写 runtime。
- **为什么值得现在做**: owner 文档已明确 NodeRenderer 的 import 安装修复边界；这里是同一文件内仍存活的 residual render-phase runtime mutation，后续重构容易误以为 NodeRenderer 已完全收敛。
- **误报排除**: 这不是 reopened adjudications 中“已修复的 prepared-import installation”旧问题；旧问题是 `runtime.importStack.installPrepared()` 的 render-phase mutation，本条是 `runtime.createChildScope()` 在 render/useMemo 中创建并登记 runtime-owned child scope。
- **历史模式对应**: 对应 Bug 15 “RenderNodes render 阶段调用 store setter”的同类原则：render 阶段不得触发 Zustand/runtime owner 写入；需要 buffer 后在 effect/commit 阶段 flush。
- **参考文档**: `docs/architecture/renderer-runtime.md`（render phase side-effect free、NodeRenderer import 边界）、`docs/bugs/15-render-nodes-setstate-during-render-fix.md`、`docs/references/reopened-design-decisions-and-audit-adjudications.md`。
- **复核状态**: 未复核

### [维度07-02] useNodeScopes 在 render/useMemo 中创建 action scope / component registry

- **文件**: `packages/flux-react/src/use-node-scopes.ts`
- **行号范围**: `42-56`
- **证据片段**:

  ```tsx
  const nodeActionScope = useMemo(() => {
    if (input.actionScopePolicy !== 'new') {
      return undefined;
    }

    return createNodeOwnedActionScope(runtime, actionScope, input.nodeId);
  }, [runtime, actionScope, input.actionScopePolicy, input.nodeId]);
  ```

- **严重程度**: P1
- **effect 职责**: node-owned `ActionScope` / `ComponentHandleRegistry` lifecycle 创建与释放。
- **应归属层级**: commit-safe React lifecycle effect 或具体 owner runtime；创建带 runtime ownership 的 scope/registry 不应发生在 render/useMemo 阶段。
- **现状**: `useMemo` 调用 `runtime.createActionScope()` / `runtime.createComponentHandleRegistry()`，后续才用 `useEffect` cleanup 释放。`runtime.createActionScope()` 会把 scope 加入 runtime-owned 集合，属于 runtime mutation。
- **风险**: 未提交 render、StrictMode replay、异常 render 或 Suspense-like 中断时，已创建的 action scope / registry 可能没有对应释放；命名空间、component handle registry 边界也可能出现短暂的未提交 owner。
- **建议**: 将 node-owned scope/registry 创建移动到 `useLayoutEffect`，通过 committed ref 或 `useSyncExternalStore` 发布；对于需要新 scope 才能渲染的节点，采用 commit 前 `null`/fallback，再二次渲染已提交边界。
- **为什么值得现在做**: 当前审计基线不接受过渡态主路径；NodeRenderer 是核心运行时热路径，render-phase owner 创建会成为后续 lifecycle/action-scope 问题的复制模板。
- **误报排除**: 这不是“普通 React memo 优化”问题；`createNodeOwnedActionScope()` 最终调用 runtime owner API，具备全局释放语义。也不是 reopened adjudication 中已修复的 import 安装问题，而是 node-owned scope/registry 的另一条 live creation path。
- **历史模式对应**: 对应 `docs/bugs/15-render-nodes-setstate-during-render-fix.md` 中“render 阶段不得触发 store/runtime 写入”的 guardrail。
- **参考文档**: `docs/architecture/renderer-runtime.md`（Render phase must stay side-effect free、Execution Boundary Ownership Matrix）、`docs/bugs/15-render-nodes-setstate-during-render-fix.md`。
- **复核状态**: 未复核

### [维度07-03] declarative surface scope 在 render/useMemo 中无条件创建，closed/unopened 路径存在 scope lifecycle 漂移

- **文件**: `packages/flux-renderers-basic/src/use-surface-renderer.ts`
- **行号范围**: `114-128`
- **证据片段**:
  ```tsx
  const declarativeScope = React.useMemo(
    () =>
      runtime.createChildScope(
        node.scope,
        {
          dialogId: id,
          ...(openingData ?? {}),
          ...(kind === 'drawer' ? { drawerId: id } : {}),
        },
  ```
- **严重程度**: P1
- **effect 职责**: declarative dialog/drawer surface scope 创建、替换、关闭时释放。
- **应归属层级**: `SurfaceRuntime` / surface owner lifecycle，或 React commit 阶段 effect；不应在 render/useMemo 中无条件创建 runtime child scope。
- **现状**: hook 每次 render 根据 `openingData/openRevision` 创建 `declarativeScope`；即使 `effectiveOpen` 为 false 也会创建。后续释放主要依赖 `surfaceRuntime.close(id)` dispose entry scope，但未打开或已 closed publish 的 scope 不一定进入 entry。
- **风险**: closed/unopened declarative surface 仍会产生 runtime-owned child scope；依赖变化时旧 scope 可能未被 `SurfaceRuntime` entry dispose 覆盖，形成 scope/source/reaction lifecycle 漂移。
- **建议**: 仅在 surface commit-open 时由 `SurfaceRuntime.open()` 或 commit-safe effect 创建 scope；close、controlled false、unmount、依赖替换应统一走 surface runtime owner dispose。closed summary publication 不应顺带持有新建 child scope。
- **为什么值得现在做**: surface owner 文档已要求 surface-family cleanup 由 runtime-owned summary contract 管理；这里把 scope 创建放回 renderer render 阶段，会削弱 plan 211 后 surface lifecycle 收敛成果。
- **误报排除**: reopened adjudications 中“Declarative Surface historical double-state fixes already belong to Plan 211”不覆盖本条；本条不是旧的 `localOpen` 双状态，也不是已裁定的 close-reopen cleanup，而是 live code 中 `createChildScope()` 的 render-phase allocation 与 unopened scope cleanup 边界。
- **历史模式对应**: Bug 15 render-phase mutation；surface cleanup 历史模式中的 owner/cleanup 分散问题。
- **参考文档**: `docs/architecture/renderer-runtime.md`（Surface Ownership、creator-owned boundaries、render phase side-effect free）、`docs/references/reopened-design-decisions-and-audit-adjudications.md`、`docs/bugs/15-render-nodes-setstate-during-render-fix.md`。
- **复核状态**: 未复核

### [维度07-04] ReportDesignerPageRenderer 用 React effect 编排 report core 与 spreadsheet core 双向同步

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx`
- **行号范围**: `446-479`
- **证据片段**:

  ```tsx
  useEffect(() => {
    const nextReportSpreadsheet = snapshot.document.spreadsheet;

    if (nextReportSpreadsheet === lastAppliedReportSpreadsheetRef.current) {
      return;
    }

    lastAppliedReportSpreadsheetRef.current = nextReportSpreadsheet;
    syncingSpreadsheetFromReportRef.current = true;
    spreadsheetCore.replaceDocument(snapshot.document.spreadsheet);
  }, [snapshot.document.spreadsheet, snapshot.spreadsheetSyncSource, spreadsheetCore]);
  ```

- **严重程度**: P1
- **effect 职责**: report designer domain core 与 spreadsheet core 的 document 同步、origin suppression、双向传播。
- **应归属层级**: report-designer bridge/core runtime 层；React renderer 只应 mount、subscribe、dispose，不应承载两个 domain store 的一致性协议。
- **现状**: React effect 读取两个 `useSyncExternalStore` snapshot，然后用 refs (`syncingSpreadsheetFromReportRef`, `lastSyncedSpreadsheetRef`) 在 commit 后同步另一个 core。
- **风险**: 同步语义依赖 React commit/effect 排序，render 与 effect 之间会出现 report snapshot 与 spreadsheet snapshot 不一致的窗口；origin suppression 由组件 refs 实现，绕开 domain core 的事务/来源模型，后续其他 host 或非 React 使用方无法复用。
- **建议**: 将 bidirectional spreadsheet/document sync 移入 `createReportDesignerBridge()` 或 report designer core，使用显式 origin token / transaction guard；React renderer 只订阅已收敛后的 core snapshot，并在 unmount 时 dispose core。
- **为什么值得现在做**: `report-designer-page` 是 domain-host-renderer，已经是公开主路径；v1 基线下不应让核心 domain consistency 依赖 React effect 作为过渡胶水。
- **误报排除**: 这不是 DOM effect、event listener 或纯 UI focus 管理；effect 直接调用 `spreadsheetCore.replaceDocument()` 与 `core.syncSpreadsheetDocument()`，属于跨 domain runtime 状态同步。
- **历史模式对应**: “DataSource 轮询/缓存/去重曾放在 React effect 后移入 flux-runtime”的同类 owner 漂移；React effect 不应定义 runtime/domain source lifecycle。
- **参考文档**: `docs/architecture/renderer-runtime.md`（source lifecycle semantics remain runtime-owned、domain-host-renderer owner 分类）、`docs/skills/react19-best-practices-review.md`（Flux 响应式结算语义不定义在 React effect 排序里）。
- **复核状态**: 未复核

### [维度07-05] Carousel 订阅了 `reInit` 事件但 cleanup 只解除 `select`

- **文件**: `packages/ui/src/components/ui/carousel.tsx`
- **行号范围**: `92-100`
- **证据片段**:

  ```tsx
  React.useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on('reInit', onSelect);
    api.on('select', onSelect);

    return () => {
      api?.off('select', onSelect);
    };
  }, [api, onSelect]);
  ```

- **严重程度**: P2
- **effect 职责**: Embla carousel external API event subscription lifecycle。
- **应归属层级**: React 层 adapter effect；这是正确位于 React 层的外部 UI library subscription，但 cleanup 不完整。
- **现状**: effect 同时注册 `reInit` 与 `select`，卸载或 `api/onSelect` 变化时只注销 `select`，遗留 `reInit` listener。
- **风险**: Carousel remount、API 替换或 StrictMode effect replay 后会累积 `reInit` listener；旧 listener 可能在 unmount 后触发 stale `setCanScrollPrev/Next`，造成重复更新或内存泄漏。
- **建议**: cleanup 中同时执行 `api.off('reInit', onSelect)` 和 `api.off('select', onSelect)`；若 Embla API 可能变化，使用闭包内 `const currentApi = api` 保证注销同一实例。
- **为什么值得现在做**: 这是低成本、确定性的 cleanup 缺陷；React 19/StrictMode 下订阅 cleanup 完整性比旧模式更容易暴露。
- **误报排除**: 不是 runtime 迁移问题，也不是 derived-state-in-effect 工具噪音；缺陷点是注册/注销事件集合不对称，代码证据直接成立。
- **历史模式对应**: lifecycle cleanup guardrail：全局/外部订阅必须在组件卸载或依赖变化时完整清理。
- **参考文档**: `docs/skills/react19-best-practices-review.md`（未清理的全局事件、订阅、观察器）、`docs/references/audit-tooling.md`（heuristic suspect 仅作线索，需 live code 复核）。
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度07-06] SchemaRenderer 在 render/useMemo 中创建 root ActionScope 与 ComponentHandleRegistry

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\schema-renderer.tsx`
- **行号范围**: `224-235`
- **证据片段**:

  ```tsx
  const rootActionScope = useMemo(
    () => props.actionScope ?? runtime.createActionScope({ id: 'root-action-scope' }),
    [props.actionScope, runtime],
  );
  const ownsRootActionScope = props.actionScope == null;
  const rootComponentRegistry = useMemo(
    () =>
      props.componentRegistry ??
      runtime.createComponentHandleRegistry({ id: 'root-component-registry' }),
    [props.componentRegistry, runtime],
  );
  ```

- **严重程度**: P1
- **effect 职责**: root action scope / root component registry 的创建、发布、替换与释放。
- **应归属层级**: commit-safe React lifecycle effect 或 renderer runtime root owner；不应在 render/useMemo 阶段调用 runtime owner API。
- **现状**: `useMemo` 在 render 阶段调用 `runtime.createActionScope()` 和 `runtime.createComponentHandleRegistry()`，随后才由 effects 发布/cleanup。`createActionScope()` 会把 scope 加入 runtime-owned 集合，属于 runtime mutation；component registry 也是 root capability boundary 创建。
- **风险**: 未提交 render、异常 render、StrictMode replay 或 Suspense-like 中断时，root capability boundary 可能先于 commit 被创建并进入 runtime ownership，cleanup 依赖后续 effect 不可靠。该问题位于 `SchemaRenderer` root 主路径，影响所有 schema tree。
- **建议**: 将 root action scope / component registry 创建移动到 `useLayoutEffect` 或 runtime root owner 的 commit-safe API；commit 前可渲染准备态或使用外部传入 scope/registry，已提交后再发布到 `CompiledSchemaTree`。释放应统一通过 runtime release/dispose owner。
- **为什么值得现在做**: 已有 07-01/07-02 暴露了 node 级 render-phase runtime mutation；root boundary 若继续保留同类模式，会成为后续修复的反例和复制模板。
- **误报排除**: 这不是已报告的 07-02 `useNodeScopes`，也不是 07-01 `NodeRenderer` import bindings child scope；本条是 `SchemaRenderer` root boundary 自身的 render-phase runtime mutation。也不是普通 memo 缓存，因为调用的是 runtime owner API。
- **历史模式对应**: 对应 Bug 15 “render 阶段不得触发 store/runtime 写入”的 guardrail；也对应本轮 07-01/07-02 的 “create in render, cleanup in effect” residual 模式。
- **参考文档**: `docs/architecture/renderer-runtime.md`（render phase must stay side-effect free、Execution Boundary Ownership Matrix）、`docs/bugs/15-render-nodes-setstate-during-render-fix.md`。
- **复核状态**: 未复核

### [维度07-07] SchemaRenderer 在 render/useMemo 中创建 runtime、page runtime 与 surface runtime，root owner 生命周期仍由 render 阶段启动

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\schema-renderer.tsx`
- **行号范围**: `133-162`
- **证据片段**:

  ```tsx
  const runtime = useMemo(() => {
    const resolvedRegistry = props.registry ?? registry;
    const expressionCompiler = createExpressionCompiler(
      props.formulaCompiler ?? createFormulaCompiler(),
    );

    return createRendererRuntime({
      registry: resolvedRegistry,
      env: envRef.current,
  ```

  ```tsx
  const page = useMemo(() => runtime.createPageRuntime(initialPageDataRef.current), [runtime]);
  const ownedSurfaceRuntime = useMemo(() => runtime.createSurfaceRuntime(), [runtime]);
  ```

- **严重程度**: P1
- **effect 职责**: root `RendererRuntime`、`PageRuntime`、root `SurfaceRuntime` 的创建、挂载、替换与 dispose。
- **应归属层级**: React commit 阶段的 root owner lifecycle，或外部 host 显式传入的 already-owned runtime；不应在 render/useMemo 阶段启动拥有 dispose 语义的 runtime owner。
- **现状**: `SchemaRenderer` 在 render/useMemo 中创建完整 runtime family，并在后续 `useEffect` cleanup 中用 microtask 延迟 dispose。当前实现为 StrictMode cleanup 做了补偿，但创建本身仍发生在 render phase。
- **风险**: 并发/中断 render 或 render 抛错时，已经创建的 runtime/page/surface owner 可能没有对应 committed cleanup；runtime 内部 owned pages、surface runtimes、validation owners、module cache、action dispatcher 等生命周期会早于 React commit 存活。
- **建议**: 提供 commit-safe root runtime holder：在 layout effect 中创建/替换 runtime family，并通过 `useSyncExternalStore`/state 发布 committed runtime；commit 前返回准备态。若必须支持外部传入 runtime，则把 owner 创建责任移出 `SchemaRenderer`，避免 render 阶段创建 disposable runtime。
- **为什么值得现在做**: `SchemaRenderer` 是全树入口；如果 root runtime family 仍允许 render-phase allocation，后续仅修 NodeRenderer/FormRenderer 无法真正关闭生命周期盲区。
- **误报排除**: renderer-runtime 文档确实提到 React-owned runtime cleanup 要 StrictMode-safe，但这只覆盖 effect cleanup replay，不豁免 render-phase owner creation。本条不是重复 07-06 的 action scope/registry，而是更上层的 root runtime/page/surface family 创建路径。
- **历史模式对应**: 对应 Bug 15 render-phase mutation 原则，以及 DataSource 生命周期从 React effect 迁回 runtime owner 的 owner 收敛模式。
- **参考文档**: `docs/architecture/renderer-runtime.md`（render phase side-effect free、React-owned runtime cleanup StrictMode-safe、runtime dispose）、`docs/bugs/15-render-nodes-setstate-during-render-fix.md`。
- **复核状态**: 未复核

### [维度07-08] FormRenderer 在 render/useMemo 中创建 FormRuntime，runtime-owned form set 只能等 runtime.dispose 清空

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\form.tsx`
- **行号范围**: `158-180`
- **证据片段**:

  ```tsx
  const ownedForm = useMemo(
    () =>
      runtime.createFormRuntime({
        id: formId,
        name: formName,
        initialValues: initialValuesRef.current,
        parentScope,
        statusPath,
        valuesPath,
  ```

- **严重程度**: P1
- **effect 职责**: renderer-owned `FormRuntime` 的创建、发布、替换与 dispose。
- **应归属层级**: concrete form owner 的 commit-safe lifecycle effect，或 runtime 提供可释放并从 owned set 注销的 form owner API。
- **现状**: Form renderer 在 render/useMemo 中调用 `runtime.createFormRuntime()`。该 runtime API 会将 form 加入 `ownedFormRuntimes`（`runtime-owned-factories.ts:320`），组件 effect cleanup 调用 `disposedForm.dispose()`，但没有对应 `ownedFormRuntimes.delete(formRuntime)` release 路径，集合只在 root `runtime.dispose()` 时整体 clear。
- **风险**: 未提交 render 或异常 render 会泄漏已创建 form runtime；即使正常 unmount，已 dispose 的 form runtime 仍留在 runtime-owned set，直到 root runtime dispose。长生命周期页面中反复挂载/替换表单会累积 stale form runtime 引用，root dispose 时还会再次遍历并调用已 disposed form。
- **建议**: 将 `createFormRuntime()` 移入 `useLayoutEffect` 并以 committed holder 发布；同时补 runtime-level `releaseFormRuntime(form)` 或让 form dispose 回调从 owned set 注销，避免组件局部 dispose 与 runtime-owned set 分离。
- **为什么值得现在做**: `form` 是核心 owner renderer，form runtime 又承载验证、提交、状态发布等关键生命周期；这里若不收敛，会持续复制 “render 创建 owner + effect 补偿 cleanup” 的历史模式。
- **误报排除**: 这不是单纯 “useMemo 冗余” 或 React Compiler 风格问题；`createFormRuntime()` 明确登记 runtime ownership。也不是 07-01/07-02 的 NodeRenderer 路径，而是 concrete form owner 主路径。
- **历史模式对应**: 对应 Bug 15 render-phase runtime mutation；也对应 07-01/07-02/07-03 中 child scope/action scope/surface scope 的 create-in-render lifecycle 漂移模式。
- **参考文档**: `docs/architecture/renderer-runtime.md`（Form data scope + FormRuntime creator-owned boundary、helpers createScope lifecycle baseline、render phase must stay side-effect free）、`docs/bugs/15-render-nodes-setstate-during-render-fix.md`。
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度07-09] detail draft FormRuntime 由交互路径反复创建，closeDraft 只 dispose 不释放 runtime-owned form 引用

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-view.tsx:330-342`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-field.tsx:192-204`, `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-draft-controller.ts:111-138`, `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\runtime-owned-factories.ts:309-321`
- **行号范围**: `detail-view.tsx:330-342`; `detail-field.tsx:192-204`; `detail-draft-controller.ts:111-138`; `runtime-owned-factories.ts:309-321`
- **证据片段**:

  ```tsx
  const newDraftForm = runtime.createFormRuntime({
    id: `detail-view-draft:${scopePath ?? 'static'}:${Date.now()}`,
    initialValues,
    parentScope,
    validation: props.templateNode.validationPlan,
  });

  if (!openSequencer.isCurrent(openToken)) {
    newDraftForm.dispose();
    return;
  }

  openDraft(newDraftForm);
  ```

  ```ts
  const openDraft = React.useCallback(
    (nextDraftForm: FormRuntime) => {
      if (!mountedRef.current) {
        nextDraftForm.dispose();
        return;
      }

      confirmSequencer.invalidate();
      setConfirming(false);
      draftFormRef.current?.dispose();
      assignDraftForm(nextDraftForm);
  ```

  ```ts
  const formRuntime = createManagedFormRuntime({
    ...inputValue,
    reportDependentRevalidationFailure,
    executeValidationRule: (compiledRule, rule, field, scope, signal) =>
      executeRuntimeValidationRule(compiledRule, rule, field, scope, signal, {
        dispatch: (action, ctx) => input.dispatchAction(action, ctx),
      }),
  });

  ownedFormRuntimes.add(formRuntime);
  ```

- **严重程度**: P2
- **effect 职责**: detail-view/detail-field 草稿表单的创建、打开、关闭、替换与释放。
- **应归属层级**: draft form owner runtime 或 runtime-level releasable form owner API；React controller 可以触发打开/关闭，但不应只做局部 `dispose()` 而留下 root runtime ownership 引用。
- **现状**: `detail-view` 与 `detail-field` 在每次打开编辑面板时通过 `runtime.createFormRuntime()` 创建 draft form；`openDraft`/`closeDraft`/unmount cleanup 只调用 `FormRuntime.dispose()`。但 `createFormRuntime()` 会把 form 加入 `ownedFormRuntimes`，当前没有对应的 per-form release/delete 路径，直到 root `runtime.dispose()` 才整体清空。
- **风险**: 用户在长生命周期页面中反复打开/取消/确认 detail draft，会不断把已关闭 draft form 留在 root runtime 的 owned set 中；这些 stale form runtime 持有 scope、validation owner、field registration、child contract 等对象引用，造成内存累积，并在 root dispose 时被再次遍历 dispose，扩大 teardown 成本和生命周期归属混乱。
- **建议**: 为 `RendererRuntime` 增加 `releaseFormRuntime(form)` 或让 `FormRuntime.dispose()` 通过 owner 回调从 `ownedFormRuntimes` 注销；detail draft controller 的 `openDraft`/`closeDraft`/unmount cleanup 应走同一 release API。若 draft form 语义需要独立 owner，可封装为 detail-draft runtime controller，统一管理创建、替换与释放。
- **误报排除**: 这不是已报告的 07-08 `FormRenderer` render/useMemo 创建 form runtime；本条是用户交互路径下的 detail draft form，创建发生在 `handleOpen()`，但仍通过同一个 runtime-owned factory 注册到 root owned set，且局部 close/cancel/replace 只 dispose 不 release，因此是独立的生命周期 residual。
- **参考文档**: `docs/architecture/renderer-runtime.md`（FormRuntime creator-owned boundary、runtime owners must expose explicit teardown）、`docs/architecture/value-adaptation-and-detail-field.md`、`docs/bugs/15-render-nodes-setstate-during-render-fix.md`。
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度07-10] import-owned ActionScope 在 NodeRenderer render/useMemo 中创建且没有对应 release

- **文件**: `packages/flux-react/src/node-renderer.tsx`; `packages/flux-runtime/src/runtime-factory.ts`
- **行号范围**: `node-renderer.tsx:71-77`; `runtime-factory.ts:157-165`
- **证据片段**:

  ```tsx
  const importOwnedActionScope = useMemo(() => {
    if (!nodeImports?.length) {
      return undefined;
    }

    return createImportOwnedActionScope(runtime, props.actionScope, props.node.id);
  }, [runtime, props.actionScope, props.node.id, nodeImports]);
  ```

  ```ts
  const actionScope = createActionScope({
    id: scopeInput.id ?? `action-scope-${actionScopeCounter}`,
    parent: scopeInput.parent,
  });

  ownedActionScopes.add(actionScope);
  ```

- **严重程度**: P1
- **effect 职责**: import-owned action scope 的创建、namespace 安装、卸载与 runtime owned set 释放。
- **应归属层级**: React commit 阶段 lifecycle effect 或 import runtime owner；不应在 render/useMemo 中创建 runtime-owned action scope。
- **现状**: `NodeRenderer` 对带 `nodeImports` 的节点在 render 阶段通过 `useMemo` 调用 `runtime.createActionScope()`；该 API 会把 scope 加入 runtime 的 `ownedActionScopes`。当前文件只在 `installPrepared()` cleanup 中 pop import frame，没有对 `importOwnedActionScope` 调用 `runtime.releaseActionScope()`。
- **风险**: 未提交 render、异常 render 或 StrictMode replay 会创建无法由 effect cleanup 覆盖的 action scope；即使正常卸载，import-owned scope 也会留在 runtime owned set 直到 root runtime dispose，长生命周期页面中反复挂载 import-owned 节点会累积 namespace/capability owner 引用。
- **建议**: 将 import-owned action scope 的创建移动到 `useLayoutEffect` 并通过 committed holder 发布；cleanup 中显式 `runtime.releaseActionScope(importOwnedActionScope)`。也可把 import frame 与其 action scope 封装为同一个 runtime-owned registration，由 `importStack.pop()` 统一释放。
- **误报排除**: 这不是已报告的 07-02 `useNodeScopes` node-owned scope，也不是 reopened 文档中已修复的 prepared-import installation render-phase mutation；本条是 `NodeRenderer` 内另一条 import-owned action scope 创建路径，并且存在缺失 release 的独立 lifecycle residual。
- **参考文档**: `docs/architecture/renderer-runtime.md`（render phase must stay side-effect free、NodeRenderer import 边界）、`docs/references/reopened-design-decisions-and-audit-adjudications.md`、`docs/bugs/15-render-nodes-setstate-during-render-fix.md`。
- **复核状态**: 未复核

### [维度07-11] useHostScope 在 useState initializer 中创建 host projection child scope，host 作用域仍从 render 阶段进入 runtime ownership

- **文件**: `packages/flux-react/src/workbench/hooks.ts`; `packages/flux-runtime/src/runtime-host-projection-scope.ts`
- **行号范围**: `hooks.ts:49-65`; `runtime-host-projection-scope.ts:58-64`
- **证据片段**:
  ```tsx
  const [store] = useState<HostScopeStore>(() =>
    createHostScopeStore(
      runtime.createHostProjectionScope({
        parentScope,
        projection: scopeData,
        path,
        scopeLabel,
      }),
    ),
  );
  ```
  ```ts
  const hostScope = input.createChildScope(input.parentScope, input.projection, {
    scopeKey: `${input.path}:${input.scopeLabel}-host`,
    pathSuffix: input.scopeLabel,
  });
  ```
- **严重程度**: P1
- **effect 职责**: complex host renderer 的 projected host scope 创建、替换、projection 更新与 dispose。
- **应归属层级**: commit-safe React lifecycle effect 或 runtime host-scope owner；不应在 `useState` 初始化期间创建 runtime child scope。
- **现状**: `useHostScope()` 的 lazy initializer 在 render 阶段调用 `runtime.createHostProjectionScope()`，后者立即通过 `createChildScope()` 创建 runtime-owned child scope。后续 `useLayoutEffect` 只处理 parent/path 改变后的替换和 unmount dispose，无法覆盖未提交 render。
- **风险**: `designer-page`、`spreadsheet-page`、`report-designer-page`、`word-editor-page` 等 host renderer 的初次 render 如果被中断或抛错，已创建的 host projection scope 会进入 runtime owned scope disposer 集合但没有 committed cleanup；host projection 持有 document/runtime/selection 等大对象，泄漏成本高于普通局部 UI state。
- **建议**: 改为 commit-safe holder：初始 render 返回父 scope或 `null`/fallback，在 `useLayoutEffect` 中创建 host projection scope并通过 `useSyncExternalStore`/state 发布；unmount 和 parent/path 变化统一 dispose 已提交 scope。若需要同步首帧 projection，可由 runtime 提供不会注册 owned disposer 的 prepare/commit 两阶段 API。
- **误报排除**: 这不是普通 `useState` 初始化缓存，也不是 07-01/07-03 已报告的 import/surface child scope；本条调用的是 `runtime.createHostProjectionScope()`，内部直接创建 runtime-owned child scope，且影响所有使用 `useHostScope` 的 domain-host renderer。
- **参考文档**: `docs/architecture/renderer-runtime.md`（source lifecycle semantics remain runtime-owned、render phase must stay side-effect free、domain-host-renderer owner 分类）、`docs/architecture/data-domain-owner.md`、`docs/bugs/15-render-nodes-setstate-during-render-fix.md`。
- **复核状态**: 未复核

## 深挖第 5 轮追加

未发现新的高价值问题。深挖结束。
