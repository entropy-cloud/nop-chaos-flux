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
