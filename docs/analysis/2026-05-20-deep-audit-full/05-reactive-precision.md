# 维度 05: 响应式订阅精度

## 第 1 轮（初审）

### [维度05-01] DesignerPageBody 对 DesignerCore 使用全量 snapshot 订阅，导致画布/工作台在无关 shell 与历史状态变化时整树重渲染

- **文件**: `packages/flow-designer-renderers/src/designer-page-body.tsx:100-115`, `packages/flow-designer-renderers/src/designer-page-body.tsx:145-156`, `packages/flow-designer-renderers/src/designer-context.ts:55-62`
- **行号范围**: `designer-page-body.tsx:100-115,145-156`; 订阅 helper 在 `designer-context.ts:55-62`
- **证据片段**:

  ```tsx
  export function useDesignerFullSnapshot(): DesignerSnapshot {
    const { core } = useDesignerContext();
    return useSyncExternalStore(core.subscribe, core.getSnapshot, core.getSnapshot);
  }

  export function DesignerPageBody(...) {
    const snapshot = useDesignerSnapshot(core);
    ...
    const designerScope = useDesignerHostScope({ snapshot, config, core, path: props.path });
  ```

- **严重程度**: P2
- **订阅位置**: `DesignerPageBody` 通过 `useDesignerSnapshot(core)` 订阅 `core.subscribe` + `core.getSnapshot` 的完整 `DesignerSnapshot`。
- **订阅范围**: 当前订阅包含 `doc`、`selection`、`activeNode/activeEdge/activeBranch`、`canUndo/canRedo`、`isDirty`、`gridEnabled`、`paletteCollapsed`、`inspectorCollapsed`、`viewport` 等全部设计器状态；`designerScope` 也基于完整 snapshot 构造 host projection。
- **实际需要**: `DesignerPageBody` 本体只需要少数 shell/status 字段：状态发布需要 `isDirty/canUndo/canRedo/selection`，Workbench 折叠只需要 `paletteCollapsed/inspectorCollapsed`，tree debug 才需要 tree-mode snapshot；host scope projection 也可从更窄的派生 selector 输入生成，而不是把整个 snapshot 作为所有工作台区域的 invalidation 输入。
- **重渲染频率**: 设计器交互高频路径包括节点移动、选中、连线、视口变化、左右面板折叠、undo/redo 状态变化；当前任一 `DesignerCore.emit(...)` 都会唤醒 full snapshot 订阅，随后 `DesignerPageBody` 重新创建 toolbar/inspector/dialog slot render、`WorkbenchShell` props、`DesignerContext.Provider` 子树和 host scope replace 路径。
- **现状**: owner 文档要求 selector-style reads 与 split context，且 `designer-context.ts` 已提供 `useDesignerSnapshotSelector`，但 `DesignerPageBody` 仍走 full snapshot 主路径。`getDesignerSnapshot` 虽有 identity cache，可避免完全无变化时的新对象，但任何局部状态变化都会生成新的全量 snapshot，并驱动整个工作台边界重渲染。
- **风险**: 大型 Flow Designer 页面中，视口拖动、节点选区变化或历史状态变化可能导致 toolbar、inspector slot、dialog slot、host projection scope 和 WorkbenchShell 整体重复计算，扩大本应局部的交互 invalidation；后续复杂 renderer slot 接入后会更明显。
- **建议**: 将 `DesignerPageBody` 拆成按频率分层的 selector 订阅：shell 折叠状态、status summary、tree debug、host projection 分别使用 `useDesignerSnapshotSelector` 或专用 slice hook；`useDesignerHostScope` 接收已裁剪的 host projection slice，而不是完整 `DesignerSnapshot`。
- **为什么值得现在做**: 这是 Flow Designer 的核心热路径，且项目已经有 `useDesignerSnapshotSelector` 作为现成收窄机制；修复不需要改变 DSL 语义，主要是把 full snapshot consumer 改成几个明确 slice consumer，ROI 高于清理普通冗余 memo。
- **误报排除**: 这不是“React Compiler 会自动 memo”的问题；订阅源本身过宽，Compiler 不能阻止 external store full snapshot 更新唤醒组件。也不是调试专用路径，`DesignerPageBody` 是 `designer-page` 主工作台路径。
- **历史模式对应**: 对应 `renderer-runtime.md` 的“Selective data access / split context boundaries reduce unrelated rerenders”，以及维度 05 历史教训中“DialogHost 因数组引用不等导致每次渲染”的同类过宽 invalidation 模式。
- **参考文档**: `docs/architecture/performance-design-requirements.md`（Subscription granularity over broad invalidation）；`docs/architecture/renderer-runtime.md:44-56,847-872`；`docs/skills/react19-best-practices-review.md` Store 订阅基线。
- **复核状态**: 未复核

### [维度05-02] DesignerCanvasContent 订阅完整 DesignerSnapshot，导致视口/历史/折叠等非画布数据变化也重建画布桥 props

- **文件**: `packages/flow-designer-renderers/src/designer-canvas.tsx:58-67`, `packages/flow-designer-renderers/src/designer-canvas.tsx:172-181`, `packages/flow-designer-renderers/src/designer-context.ts:55-62`
- **行号范围**: `designer-canvas.tsx:58-67,172-181,246-294`; 订阅 helper 在 `designer-context.ts:55-62`
- **证据片段**:

  ```tsx
  export function DesignerCanvasContent(...) {
    const { core, dispatch, config } = useDesignerContext();
    const snapshot = useDesignerFullSnapshot();

    const canvas = renderDesignerCanvasBridge({
      snapshot,
      canvasConfig: config.canvas,
      nodeTypeSizeMap,
      pendingConnectionSourceId,
  ```

- **严重程度**: P2
- **订阅位置**: `DesignerCanvasContent` 通过 `useDesignerFullSnapshot()` 订阅完整 `DesignerSnapshot`。
- **订阅范围**: 完整 snapshot 包括画布确实需要的 `doc`、`selection`、`viewport`，但也包括 `canUndo/canRedo`、`isDirty`、`paletteCollapsed`、`inspectorCollapsed`、shell grid 状态等。
- **实际需要**: 画布桥主要需要节点/边、selection、active node/edge/branch、viewport 和 grid/canvas 配置；历史按钮状态、dirty、左右面板折叠等不应驱动画布组件重建。
- **重渲染频率**: undo/redo 可用性、dirty 状态、palette/inspector 折叠、属性面板打开状态等会随着命令频繁变化；当前这些变化会重新执行 `DesignerCanvasContent`，重新生成 `renderDesignerCanvasBridge(...)` 的大量 inline handler props，并把新 `snapshot` 传给底层 canvas。
- **现状**: `designer-context.ts` 明确提供“Fine-grained snapshot selector hook”，但画布主组件仍使用 full snapshot。`renderDesignerCanvasBridge` 只是把 props 透传给 `DesignerXyflowCanvasBridge`，无法在订阅层面过滤无关 store 更新。
- **风险**: 画布是 Flow Designer 最重的 UI 子树；非画布状态变化引发画布 prop 重建，会增加 React Flow / XYFlow 适配层 reconcile 压力，尤其在大图节点/边较多或视口操作频繁时放大交互抖动。
- **建议**: 增加 `selectDesignerCanvasSnapshot` + equality，只选择 `doc`、`selection`、active target、`viewport`、`gridEnabled` 等画布实际消费字段；历史/dirty/折叠等留给 toolbar/workbench 自己的 selector。
- **为什么值得现在做**: 当前已经存在 selector hook，且画布是明确热路径；这是订阅结构问题，不是机械移除 `useMemo/useCallback`，对真实交互成本更有价值。
- **误报排除**: 不是因为 full snapshot hook 本身必须删除；文档注释允许 full snapshot，但推荐 selector。这里命中的是主画布热路径，且实际消费字段明显小于订阅字段。
- **历史模式对应**: 对应 `performance-design-requirements.md` 的“Avoid full-tree updates for local state changes”和 `renderer-runtime.md` 的 selector-style reads 约束。
- **参考文档**: `docs/architecture/performance-design-requirements.md:23-32`; `docs/architecture/renderer-runtime.md:44-56`; `docs/skills/react19-best-practices-review.md:240-244`。
- **复核状态**: 未复核

### [维度05-03] ReportToolbarRenderer 使用 useOwnScopeSelector 订阅整个 host scope 快照，所有 projected 字段变化都会重算工具栏可见性和文本模板

- **文件**: `packages/report-designer-renderers/src/report-designer-toolbar.tsx:15-26`, `packages/report-designer-renderers/src/report-designer-toolbar.tsx:80-100`
- **行号范围**: `report-designer-toolbar.tsx:15-26,80-100`
- **证据片段**:
  ```tsx
  export function ReportToolbarRenderer(props: RendererComponentProps<ReportToolbarSchema>) {
    const runtime = useRendererRuntime();
    const scopeSnapshot = useOwnScopeSelector((data: Record<string, unknown>) => data, Object.is);
    const itemsOverride = props.props.itemsOverride as ToolbarItem[] | undefined;
    ...
    const runtimeSnapshot = useMemo(
      () => ({ ...scopeSnapshot, ...props.props }),
      [scopeSnapshot, props.props],
    );
  ```
- **严重程度**: P2
- **订阅位置**: `ReportToolbarRenderer` 的 `useOwnScopeSelector((data) => data, Object.is)`。
- **订阅范围**: 当前订阅 report-designer host scope 的 entire own snapshot；只要 own snapshot identity 改变，工具栏都会重渲染并重建 `runtimeSnapshot`。
- **实际需要**: 默认工具栏通常只需要命令可用性、dirty/canUndo/canRedo、selection/preview 等少量状态；自定义 `itemsOverride` 的 `visible`/`text` 模板也应声明或推导所需路径，而不是默认订阅全部 `document`、`fieldSources`、`inspector`、`fieldDrag`、`activeMeta` 等 host projection。
- **重渲染频率**: Report Designer 中 selection、inspector loading/error、field drag、spreadsheet document sync、preview 状态和 field sources 更新都可能替换 host scope snapshot；工具栏因此在很多与按钮可见性无关的交互中重算每个 toolbar item 的 `evalBooleanLike` / `evalTextTemplate`。
- **现状**: `useOwnScopeSelector` 没有 path 参数，返回完整 data 又使用 `Object.is`，等同于 full own-scope subscription。该文件是运行时 renderer，不是测试或调试 helper。
- **风险**: 工具栏通常常驻在 report designer 顶部；当表格选区或 inspector 高频变化时，工具栏和所有按钮/Badge/Switch 都被无关 host projection 更新唤醒，增加复杂报表编辑时的响应成本。
- **建议**: 给 `ReportToolbarRenderer` 引入窄 selector：默认 toolbar 仅选择 dirty/canUndo/canRedo/selection/preview 等实际字段；对自定义模板，优先支持显式 `scopePaths` / `dependsOn` 或编译期依赖收集后传入 path-aware selector。若暂不支持动态依赖，至少避免默认项订阅整个 snapshot。
- **为什么值得现在做**: 这是常驻 workbench UI，且问题由一行 full snapshot selector 造成；收窄后可直接减少 report designer 所有交互中的无关顶部栏重渲染。
- **误报排除**: 这不是合理的“host projection readonly view by reference”问题；发现不质疑引用返回，而是 selector 明确选择 entire own snapshot。也不是 debug renderer，`ReportToolbarRenderer` 是公开 renderer。
- **历史模式对应**: 对应 FieldFrame 曾订阅全量 form values 的历史教训：局部 UI 为方便表达式求值而订阅 owner 全量数据。
- **参考文档**: `docs/architecture/performance-design-requirements.md:28-32`; `docs/architecture/renderer-runtime.md:44-56,643-649`; `docs/skills/react19-best-practices-review.md:240-244`。
- **复核状态**: 未复核

### [维度05-04] ScopeDebugRenderer 在 render 订阅并 stringify 完整 scope，作为普通 renderer 注册后容易在生产 schema 中形成全 scope 热路径

- **文件**: `packages/flux-renderers-basic/src/scope-debug.tsx:8-47`, `packages/flux-renderers-basic/src/scope-debug.tsx:49-55`, `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:226-231`
- **行号范围**: `scope-debug.tsx:8-55`; 注册位置 `basic-renderer-definitions.ts:226-231`
- **证据片段**:

  ```tsx
  function stringifyDebugValue(value: unknown) {
    const seen = new WeakSet<object>();
    const json = JSON.stringify(value, (_key, currentValue: unknown) => {
      ...
    });
    return JSON.stringify(JSON.parse(json), null, 2);
  }

  export function ScopeDebugRenderer(props: RendererComponentProps<ScopeDebugSchema>) {
    ...
    const scopeText = useScopeSelector((scopeData) => stringifyDebugValue(scopeData));
  ```

- **严重程度**: P2
- **订阅位置**: `ScopeDebugRenderer` 的 `useScopeSelector((scopeData) => stringifyDebugValue(scopeData))`。
- **订阅范围**: 当前订阅 lexical visible scope 的全部数据，并在 selector 内对整个 scope 执行 `JSON.stringify` + `JSON.parse` + pretty stringify。
- **实际需要**: Debug 场景可能需要全量 scope，但普通运行时不应无门槛引入全 scope render-time serialization；至少需要显式 debug gate、可配置 paths、或只在展开/启用时订阅。
- **重渲染频率**: 任意 scope change 都会触发 selector，且 selector 本身遍历完整 scope；在表单输入、CRUD 查询状态、designer host projection 高频变化时，成本与 scope 大小线性相关，并可能随嵌套对象扩大。
- **现状**: `scope-debug` 被作为 basic renderer 注册，`ScopeDebugSchema` 只有 `title/defaultExpand`，没有 `paths`、`enabled` 或 runtime debug-only gate；`defaultExpand` 也未用于控制订阅或 serialization。
- **风险**: 一旦开发/生产 schema 中保留 `scope-debug`，它会把局部字段更新放大全 scope serialization；这类调试组件常被临时加入页面，容易在性能问题排查后遗留在主路径。
- **建议**: 将 `scope-debug` 明确变成 debug-gated renderer：支持 `paths` 并传给 `useScopeSelector(..., { paths })`，支持 collapsed/disabled 时不订阅或返回 fallback；必要时仅在 `runtime.env.debug`/strict debug mode 下启用全量 scope。
- **为什么值得现在做**: 自动化已将其标为 `broad-scope-selector`，live code 复核确认 selector 内执行昂贵全量序列化；修复范围小且能避免调试组件污染运行时热路径。
- **误报排除**: 虽然这是 debug renderer，但它在 basic renderer definitions 中正常注册，并无 owner-controlled debug gate；当前 v1 基线不接受“只是调试用所以主路径无所谓”的过渡式豁免。
- **历史模式对应**: 对应 `performance-design-requirements.md` P9“debug-only and perf-only paths must be owner-controlled”和 P6/P1 对 hot path stringify 的约束。
- **参考文档**: `docs/architecture/performance-design-requirements.md:44-47,83-87,132-136`; `docs/architecture/renderer-runtime.md:44-56`; `docs/references/audit-tooling.md` 中 `broad-scope-selector` suspect 说明。
- **复核状态**: 未复核

## 深挖第 2 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度05-01]: 保留 (P2)。`DesignerPageBody` 仍直接订阅完整 `DesignerSnapshot`，并把任意局部状态变更扩散到 `WorkbenchShell`、slot render 与 host scope 投影；live code 已有 `useDesignerSnapshotSelector`，证据足以认定为真实的过宽订阅热路径。
- [维度05-02]: 保留 (P2)。`DesignerCanvasContent` 对完整 snapshot 订阅仍成立，而画布桥实际主依赖是 `doc/selection/viewport/grid` 等子集；`canUndo/isDirty/paletteCollapsed/inspectorCollapsed` 一类无关变更会重建重型 canvas props。
- [维度05-03]: 降级为 P3。默认 toolbar 项确有可收窄空间，但 `itemsOverride` 允许按任意 scope 表达式求值，当前整 own-scope 订阅有一部分属于动态契约成本；证据不足以继续按 P2 作为明确缺陷推动。
- [维度05-04]: 驳回。`scope-debug` 是显式 opt-in 的调试 renderer，整 scope 订阅与 stringify 正是其功能本身；仅凭其被注册到基础 renderer 集合、且未再加额外 debug gate，不足以在本维度下认定为当前主路径缺陷。

## 子项复核结论

- [维度05-01]: 成立 (P2)。Designer host shell 完整 snapshot 订阅保留。
- [维度05-02]: 成立 (P2)。canvas 内容完整 snapshot 订阅保留。
- [维度05-03]: 降级保留 (P3)。toolbar 默认项订阅过宽，但存在动态 contract 成本。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                      | 一句话摘要                                                    |
| ----- | -------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 05-01 | P2       | `packages/flow-designer-renderers/src/designer-page-body.tsx`                             | DesignerPageBody 仍对完整 snapshot 过宽订阅                   |
| 05-02 | P2       | `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-canvas-content.tsx` | DesignerCanvasContent 仍对完整 snapshot 过宽订阅              |
| 05-03 | P3       | `packages/flow-designer-renderers/src/designer-toolbar.tsx`                               | toolbar own-scope 订阅可收窄，但因动态 itemsOverride 降级保留 |
