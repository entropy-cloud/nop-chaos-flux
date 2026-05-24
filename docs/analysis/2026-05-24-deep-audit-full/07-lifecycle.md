# 维度 07：生命周期与副作用归属

## 第 1 轮（初审）

## 零发现结论

本轮按维度 07 要求审计了 `useEffect` / `useLayoutEffect` 的数据获取、订阅、DOM 操作、状态同步、轮询、缓存、定时器、事件监听、cleanup、render-phase setState/store set 与 StrictMode-safe cleanup。未发现新的可报告问题。

补充说明：必读 owner 文档中指定的 `docs/bugs/15-setstate-during-render.md` 在当前路径不存在；按 `AGENTS.md` 规则检索后读取了实际文件 `docs/bugs/15-render-nodes-setstate-during-render-fix.md`。主 agent 提供的 `render-nodes.tsx:340 readOwn()` 基线已按要求排除：当前代码位于 `useLayoutEffect` commit-phase，不是 render-phase store read/write 重犯。

## 读过的关键 effect 文件 / 分类与排除理由

### React/runtime 边界与节点生命周期

- `packages/flux-react/src/schema-renderer.tsx`: root runtime/page/surface 创建后的 commit-phase 同步、外部回调发布、schema import 预加载、StrictMode-safe dispose。runtime 资源由 runtime 工厂创建，cleanup 使用 `queueMicrotask` 区分 StrictMode replay；schema import effect 有 `AbortController` 与 request id stale guard。
- `packages/flux-react/src/node-renderer.tsx`: `xui:imports` import frame 安装、named action namespace 注册、import binding child scope dispose。owner 文档明确要求 NodeRenderer 在 layout effect 中 commit-safe 安装 import/named-action 边界。
- `packages/flux-react/src/render-nodes.tsx`: fragment scope 创建、snapshot commit、fragment scope cache cleanup。`readOwn()` / `setSnapshot()` 在 `useLayoutEffect` 中执行，符合 Bug 15 的“render-phase 禁止，commit-phase flush”修复方向。
- `packages/flux-react/src/use-node-scopes.ts`: node-owned action scope / component registry lifecycle，cleanup 使用 `queueMicrotask`，避免 StrictMode replay 误释放仍当前的 owner。
- `packages/flux-react/src/node-renderer-effects.ts`: render monitor 与 node lifecycle actions；这是 React mount/unmount 与 schema `onMount` / `onUnmount` 的中央桥接。

### Runtime-owned source / reaction 桥接

- `packages/flux-renderers-data/src/data-source-renderer.tsx`: React effect 只负责注册/注销；轮询、缓存、取消、去重等由 `runtime.registerDataSource()` 所属 runtime 层管理。
- `packages/flux-renderers-basic/src/reaction.tsx`: React effect 只负责 commit-phase 注册与 `registration.dispose()`；reaction 执行语义在 runtime。
- `packages/flux-react/src/use-source-value.ts`、`packages/flux-react/src/use-node-source-props.ts`: observer 由 runtime 创建，effect 仅驱动当前 React mounted source input；dispose 明确，未发现并发/cleanup 漏洞。

### Surface / form owner 生命周期

- `packages/flux-renderers-basic/src/use-surface-renderer.ts`: surface uncontrolled open 初始化、declarative open/close、closed summary publish、unmount cleanup。历史 double-state 裁定已核对；当前代码以 `SurfaceRuntime` / `SurfaceStore` 为 owner。
- `packages/flux-renderers-form/src/renderers/form.tsx`: form runtime dispose、lifecycle handler registration、`initAction` dispatch/cancel、component handle registration。form renderer 是 owner boundary；dispose 使用 StrictMode-safe microtask。
- `packages/flux-react/src/form-publication.ts`、`packages/flux-react/src/status-path.ts`、`packages/flux-react/src/node-renderer-resolved.tsx`: status/value publication、hidden field participation；cleanup 有 unsubscribe / clear publication / notify reset。

### 复杂字段与局部 adapter lifecycle

- `packages/flux-renderers-form/src/field-utils/field-handlers.tsx`
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-controller.ts`
- `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`
- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`
- `packages/flux-renderers-form-advanced/src/key-value.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-draft-controller.ts`
- 分类：adapter transform、variant detect/switch async guard、field/child validation registration、local draft dispose。
- 排除理由：这些 effect 管理 composite field 局部交互或向 form/validation runtime 注册；异步路径有 abort / sequencer / mounted guard，cleanup 明确。未发现 render-phase setState/store set。

### Domain host / designer / spreadsheet / word/code DOM bridge

- `packages/flow-designer-renderers/src/designer-page-body.tsx`
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-sync.ts`
- `packages/flow-designer-renderers/src/use-designer-shortcuts.ts`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`
- `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-resize.ts`
- `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-keyboard.ts`
- `packages/word-editor-renderers/src/editor-canvas.tsx`
- `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts`
- `packages/word-editor-renderers/src/hooks/use-word-editor-save.ts`
- `packages/flux-code-editor/src/use-code-mirror.ts`
- `packages/flux-code-editor/src/code-editor-renderer.tsx`
- 分类：third-party DOM/editor mount、window/document keyboard listener、mouse/resize listener、autosave timer、core init/dispose、namespace registration、local XYFlow state bridge。
- 排除理由：这些副作用依赖真实 DOM、第三方 imperative API 或 host workbench lifecycle，正确位于 React/host renderer 层；均可见 cleanup 或有明确 stale/abort guard。

### Debugger / UI / playground host effects

- `packages/nop-debugger/src/panel/*.tsx`
- `packages/ui/src/components/ui/*.tsx`
- `apps/playground/src/**/*.tsx`
- 分类：debugger subscription/UI probing、carousel/sidebar/mobile/dialog drag DOM listeners、playground demo hash/keyboard/beforeunload/timer effects。
- 排除理由：均属于 UI shell、debug tooling 或 demo host lifecycle，不是 Flux runtime 语义 owner；抽查未发现缺失 cleanup 或 runtime/store 职责错放。

## effect 清单摘要

### 应迁移到 runtime

- 无确认项。
- `data-source` / `reaction` 当前只在 React 层做 mount registration，实际数据源轮询、缓存、取消、reaction 执行都由 runtime owner 管理。
- root schema import preload 虽使用 React effect 与 `AbortController`，但当前属于 `SchemaRenderer` root loading/error 边界协调，且 `runtime.prepareSchema` 承担实际准备逻辑；未形成 renderer-local runtime 语义旁路。

### 正确位于 React 层

- DOM / third-party imperative bridge：CodeMirror、Word editor canvas、Spreadsheet grid mouse/keyboard/resize、dialog drag、mobile media query。
- Host/workbench lifecycle：flow designer、report designer、word editor namespace registration、core init/dispose、debug probe。
- Commit-phase runtime bridge：NodeRenderer import frame/named action setup、RenderNodes fragment scope commit、FormRenderer form runtime dispose、Surface renderer open/close bridge。
- UI-only local effects：tree progressive child render timeout、fullscreen Escape listener、XYFlow local state synchronization、debugger panel UI subscriptions。

## 总结评估

本轮未发现新的生命周期与副作用归属缺陷。当前实现总体符合 owner 文档中的关键约束：render phase 未发现新的 store/state writer；runtime-owned 长生命周期资源均有注册/注销或 `dispose()`；React effects 主要承担 DOM/host bridge 与 commit-phase boundary installation；cleanup 对 StrictMode replay 的高风险路径已使用 `queueMicrotask` 或显式 owner ref；全局事件监听、timer、AbortController 抽查未见明显泄漏。

## 建议第 2 轮深挖方向

未发现新的高价值问题。若主 agent 仍需第 2 轮，可只做定向复查：

- `packages/report-designer-renderers/src/page-renderer.tsx` 的 report/spreadsheet 双向同步是否存在状态所有权问题（更偏维度 04）。
- `packages/word-editor-renderers/src/editor-canvas.tsx` autosave ownership 是否需未来文档化（当前无缺陷证据）。
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-controller.ts` async adapter 的竞态/错误路径可在维度 06 继续看。

## 维度复核追加发现

### [维度07-01] Declarative surface scope 在 render/useMemo 路径分配，违反 commit-safe runtime-owned scope allocation

- **文件+行号**: `packages/flux-renderers-basic/src/use-surface-renderer.ts:110`
- **证据片段**:
  ```ts
  const declarativeScope = React.useMemo(
    () =>
      runtime.createChildScope(
        node.scope,
        {
          dialogId: id,
          ...(openingData ?? {}),
          ...(kind === 'drawer' ? { drawerId: id } : {}),
        },
        {
  ```
- **严重程度**: P1
- **现状**: `useSurfaceRenderer` 在 React render 阶段执行 `useMemo` factory，并直接调用 `runtime.createChildScope(...)` 创建 declarative dialog/drawer surface scope。该 scope 随后才在 effect 中通过 `openSurface()` 注册为 `SurfaceEntry`。
- **风险**: React render 阶段可能被中断、丢弃或 StrictMode 重放。`createChildScope` 是 runtime-owned resource allocation，会向 runtime scope lifecycle 注册资源；如果 render 未 commit，则该 scope 可能永远不会进入 `SurfaceEntry`，也不会走 surface close/dispose 路径，导致 scope 泄漏、生命周期不对称，以及 declarative surface 与 action-opened surface 的 child scope 语义不一致。
- **建议**: 将 declarative surface scope 分配迁移到 commit-safe 路径，例如 `useLayoutEffect` / owned lifecycle effect 中创建，并在 render 阶段使用 preparing/null 或已提交 scope 快照。只有 scope 创建并提交后再 open/upsert `SurfaceEntry`；替换或卸载时显式 dispose 未使用的旧 scope。
- **误报排除**: 不是单纯的“计算值 useMemo”。`runtime.createChildScope` 在 runtime 层创建 scope store 并登记 owned scope disposer；这是 runtime-owned resource allocation。`docs/architecture/renderer-runtime.md` 明确要求 runtime-owned React boundaries 只能 after commit 分配，并点名包括 declarative surface scopes。因此该处不是低价值风格问题，而是与现行文档基线冲突。
- **参考文档**: `docs/architecture/renderer-runtime.md`; `docs/architecture/surface-owner.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 维度复核追加成立。

## 维度复核结论

- `[维度07-01]`: 保留（P1）。live `use-surface-renderer.ts` 仍在 `useMemo` render 路径调用 `runtime.createChildScope(...)`，而 renderer runtime/surface owner docs 明确要求 runtime-owned declarative surface scope after commit 分配。

## 子项复核建议

`[维度07-01]`。该项为 P1 且会驱动实际改代码。

## 子项复核结论

- `[维度07-01]`: 子项复核通过（P1）。live code 仍在 render/useMemo 路径创建 declarative surface child scope，且 renderer-runtime/surface-owner 文档要求 runtime-owned declarative surface scope after commit 分配。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                    | 摘要                                                                                                         |
| --------- | -------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 维度07-01 | P1       | `packages/flux-renderers-basic/src/use-surface-renderer.ts` | Declarative surface child scope 在 render/useMemo 路径创建，违反 runtime-owned scope after-commit 分配要求。 |
