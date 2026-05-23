# 维度 02：模块职责与文件边界

## 第 1 轮（初审）

### 超大文件基线（live 复核）

| 文件                                                                                | live 行数 |
| ----------------------------------------------------------------------------------- | --------: |
| `packages/word-editor-renderers/src/__tests__/word-editor-page-host-scope.test.tsx` |       809 |
| `packages/flux-react/src/__tests__/hook-surface-lifecycle-contracts.test.tsx`       |       765 |
| `packages/flux-runtime/src/__tests__/request-runtime.test.ts`                       |       752 |
| `packages/flow-designer-renderers/src/designer-page.tree.test.tsx`                  |       751 |
| `packages/nop-debugger/src/controller-inspect-advanced.test.ts`                     |       710 |
| `packages/report-designer-core/src/__tests__/designer-core.test.ts`                 |       707 |

### [维度02-01] `word-editor-page-host-scope.test.tsx` 继续把 host scope、恢复链路、shell 面板与 renderer metadata 混装在单文件

- **文件**: `packages/word-editor-renderers/src/__tests__/word-editor-page-host-scope.test.tsx:21-123,541-809`
- **证据片段**:
  ```ts
  it('publishes recovered document into host scope instead of stale schema seed', async () => {
  it('registers a window probe with recovered document state and removes it on unmount', async () => {
  it('keeps persisted datasets instead of overwriting them with schema datasets on mount', async () => {
  it('exposes domain host metadata on the registered renderer definition', () => {
  ```
- **严重程度**: P2
- **现状**: 同一入口同时承载 host projection、recovery/bootstrap、window probe、workbench shell 与 renderer definition 断言，并依赖共享 mutable mock 状态。
- **风险**: 回归定位粒度过粗；任一子域改动都会放大 unrelated 失败面，且共享 mock 更容易制造顺序耦合。
- **建议**: 至少拆成 host scope/recovery、shell layout、window probe、renderer metadata 四组测试文件，并把共享 mock 收敛到更窄的 test helpers。
- **为什么值得现在做**: 该文件已超过 700 行硬门禁，且与 14 维度中的跨域混测问题直接重叠，拆分 ROI 高。
- **误报排除**: 不是单纯按 809 行处罚；问题在于多个 owner 层与共享可变测试基座被压进一个文件。
- **历史模式对应**: 测试 omnibus 文件回退到单入口混装。
- **复核状态**: 未复核

### [维度02-02] `hook-surface-lifecycle-contracts.test.tsx` 已演变为跨层 omnibus contract 文件

- **文件**: `packages/flux-react/src/__tests__/hook-surface-lifecycle-contracts.test.tsx:121-765`
- **证据片段**:
  ```ts
  describe('Hook contract: useScopeSelector', () => {
  describe('Surface lifecycle contracts', () => {
  describe('SchemaRenderer re-render contracts', () => {
  describe('Error boundary integration contracts', () => {
  describe('Form owner boundary cleanup', () => {
  ```
- **严重程度**: P2
- **现状**: hooks、surface lifecycle、SchemaRenderer、ErrorBoundary、form owner cleanup 等不同层级合同仍共处单文件。
- **风险**: 文件名与真实覆盖范围失真；维护者难以判断失败属于 hook contract、surface owner 还是 renderer integration。
- **建议**: 按 hooks、surface lifecycle、schema-renderer、error-boundary、form cleanup 拆分。
- **为什么值得现在做**: 该文件已越过 700 行硬门禁，且是 `flux-react` 基础合同测试，后续改动频率高。
- **误报排除**: 不是反对合同测试；问题是多个独立 owner/生命周期层共用一个测试入口。
- **历史模式对应**: 基础包合同测试回流为 omnibus entry。
- **复核状态**: 未复核

### [维度02-03] `request-runtime.test.ts` 同时覆盖纯 helper、请求准备、错误路径、去重策略与 dispose 生命周期

- **文件**: `packages/flux-runtime/src/__tests__/request-runtime.test.ts:33-752`
- **证据片段**:
  ```ts
  describe('extractScopeData', () => {
  describe('prepareApiRequestForExecution', () => {
  describe('executeApiSchema error path', () => {
  describe('createApiRequestExecutor', () => {
  ```
- **严重程度**: P2
- **现状**: 纯函数 helper、API canonicalization、fetch error contract、dedup/cancel/dispose 执行器行为全部塞在一个 752 行文件里。
- **风险**: 测试变更边界不清；helper 微调会被执行器并发/生命周期回归噪音淹没。
- **建议**: 拆成 scope-data helpers、request preparation/finalization、executeApiSchema error contract、executor concurrency/disposal 四个文件。
- **为什么值得现在做**: runtime 请求面是主路径基础设施，现状已经降低错误定位速度。
- **误报排除**: 不只是“大文件”；这里混合了完全不同测试粒度与 owner 层次。
- **历史模式对应**: runtime 基础设施测试跨域混装。
- **复核状态**: 未复核

### [维度02-04] `designer-page.tree.test.tsx` 继续把 tree/graph/runtime-props/warning/history continuity 混成单入口

- **文件**: `packages/flow-designer-renderers/src/designer-page.tree.test.tsx:118-751`
- **证据片段**:
  ```ts
  it('renders tree mode by projecting treeDocument to graph nodes and edges', () => {
  it('graph mode still works correctly (regression test)', () => {
  it('does not warn about render-phase updates when treeDocument runtime props change', async () => {
  it('preserves selection and undo history continuity across treeDocument updates', async () => {
  ```
- **严重程度**: P2
- **现状**: tree 投影、graph regression、runtime props、React warning、防重建与 history continuity 共处一处。
- **风险**: tree mode 回归与 graph mode 回归互相污染；文件名也无法反映真实测试面。
- **建议**: 按 tree rendering、runtime props/warnings、core continuity/history、graph regression 拆分。
- **为什么值得现在做**: 文件已超 700 行，且正处于 flow designer 高频回归区。
- **误报排除**: 不是 tree mode 天然复杂；而是多个独立回归域被捆在同一文件。
- **历史模式对应**: 设计器树模式测试继续吸入非树职责。
- **复核状态**: 未复核

### [维度02-05] `controller-inspect-advanced.test.ts` 将 inspect/tree/explain/form-state/failure-trace 高级用例继续捆绑

- **文件**: `packages/nop-debugger/src/controller-inspect-advanced.test.ts:10-709`
- **证据片段**:
  ```ts
  it('inspectByCid exposes resolved authoring contract from runtime registry when renderer metadata is available', () => {
  it('getComponentTree enumerates mounted registry snapshot entries even without matching DOM elements', () => {
  it('explains value source, meta causality, failure, and async owners with bounded machine-oriented results', () => {
  it('explains button-triggered request aborts from the node interaction trace', () => {
  ```
- **严重程度**: P2
- **现状**: 同一文件同时覆盖 inspectByCid、component tree、explainNode\* 系列、form capabilities、interaction trace fallback。
- **风险**: debugger inspection contract 与 explanation contract 无法独立演化；失败阅读成本过高。
- **建议**: 至少拆成 inspectByCid、getComponentTree、explainers、form-state/failure-trace 四组。
- **为什么值得现在做**: debugger surface 正在扩展，继续堆在一个入口会放大后续维护成本。
- **误报排除**: 不是因为 710 行；而是 API 家族已跨越多个调试能力面。
- **历史模式对应**: 高级诊断测试将多个 capability family 合并到单文件。
- **复核状态**: 未复核

### [维度02-06] `designer-core.test.ts` 把 metadata、undo、preview、codec、field-source async 全部压在核心单测入口

- **文件**: `packages/report-designer-core/src/__tests__/designer-core.test.ts:35-707`
- **证据片段**:
  ```ts
  it('should update cell metadata', async () => {
  it('keeps the latest preview result when an older preview resolves later', async () => {
  it('importTemplate participates in undo history', async () => {
  it('reuses the same in-flight field-source refresh during startup and explicit refresh', async () => {
  ```
- **严重程度**: P2
- **现状**: metadata 编辑、undo/export、preview 并发、codec import/export、field-source 刷新/abort 全放在一个文件。
- **风险**: report designer core 的不同子系统无法按责任边界定位失败；未来扩展更容易继续堆叠。
- **建议**: 拆成 metadata/history、preview、codec、field-source async、selection/inspector 基础合同几组。
- **为什么值得现在做**: 该文件处在 700 行硬门槛边缘，且 core 行为面最需要清晰回归边界。
- **误报排除**: 不是否定“core 测试集中”；问题是一个文件同时承担多个子系统回归入口。
- **历史模式对应**: 核心能力测试逐步回吸到单入口。
- **复核状态**: 未复核

### [维度02-07] `runtime-factory.ts` 同时承担 module cache、import wiring、runtime boot、data-source/reaction 注册与 dispose 编排

- **文件**: `packages/flux-runtime/src/runtime-factory.ts:54-82,84-228,375-527,529-605`
- **证据片段**:
  ```ts
  const apiCache = createApiCacheStore();
  const asyncGovernance = createAsyncGovernanceStore();
  const sourceRegistryRef: { current?: ReturnType<typeof createRuntimeSourceRegistry> } = {};
  const reactionRegistryRef: { current?: ReturnType<typeof createRuntimeReactionRegistry> } = {};
  const importManager = createImportManager({
  ```
- **严重程度**: P3
- **现状**: 文件既实现 `createModuleCache()`，又承担 runtime bootstrap、imports、scope factory、action adapter、source/reaction registry 与总 dispose 路径。
- **风险**: runtime 入口继续膨胀；任一子系统改动都需在同一超长工厂文件内穿梭验证。
- **建议**: 把 module cache、import bootstrap、registry bootstrap、runtime public surface assembly、dispose orchestration 再向子模块下沉。
- **为什么值得现在做**: 这是 runtime 组合根，若继续吸入实现细节，后续拆分难度只会更高。
- **误报排除**: 不是泛化地反对 factory；这里已越过“组合根”而变成多子系统实现承载点。
- **历史模式对应**: orchestrator 二次膨胀。
- **复核状态**: 未复核

### [维度02-08] `flow-designer-core/src/core.ts` 仍把文档状态、history、selection、shell controls、transactions 汇总在根 core 文件

- **文件**: `packages/flow-designer-core/src/core.ts:52-229,318-559`
- **证据片段**:
  ```ts
  const selectionController = createSelectionController({
  const shellControls = createShellControls({
  function undo(): void {
  function togglePalette(): void {
  function beginTransaction(label?: string, transactionId?: string): string {
  ```
- **严重程度**: P3
- **现状**: 虽然命令逻辑已部分抽到子模块，但根文件仍集中维护多个状态机与公开 API 编排。
- **风险**: core facade 容易持续吸纳新职责，进一步弱化子模块边界。
- **建议**: 若继续扩展，优先把 history/transaction/shell API 组装再抽一层 facade builder；避免 `core.ts` 继续增长。
- **为什么值得现在做**: 该文件尚可工作，但更像需要持续观察的膨胀信号，不宜立刻投入重构。
- **误报排除**: 不是忽视其 facade 角色；问题在于 facade 仍保留了较多实质状态编排。
- **历史模式对应**: facade 文件边界继续吸入编排逻辑。
- **复核状态**: 未复核

### [维度02-09] `spreadsheet-grid.tsx` 继续同时承载虚拟化、选择/编辑、键盘、拖拽与上下文菜单壳层

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:111-235,253-349,355-385,387-600`
- **证据片段**:
  ```tsx
  const contextActions = useContextMenuActions({
  const [scrollTop, setScrollTop] = useState(0);
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('mouseup', handleMouseUp, true);
  }, [onCellMouseEnter]);
  ```
- **严重程度**: P2
- **现状**: 可见区域计算、cell render、编辑输入、drag selection、全局 mouse listener、grid shell/context menu 全在一个组件文件里。
- **风险**: spreadsheet 共享 grid 的交互回归面过大；只改一个交互也可能触碰虚拟化和可访问性代码。
- **建议**: 把 viewport virtualization、cell renderer、selection/editing、drag tracking、context-menu shell 拆成更窄模块。
- **为什么值得现在做**: 该文件是 spreadsheet 交互主路径，复杂度继续上升会放大每次改动成本。
- **误报排除**: 不是因为 widget renderer 不许大文件；问题是多个高复杂交互子系统已共居一处。
- **历史模式对应**: 高交互 widget renderer 组合根膨胀。
- **复核状态**: 未复核

### [维度02-10] `report-designer-renderers/src/page-renderer.tsx` 同时承担 host boot、双 runtime 同步、namespace 注册、async refresh 与 workbench 布局

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:278-419,421-589`
- **证据片段**:
  ```ts
  const spreadsheetCore = useMemo(
    () => createSpreadsheetCore({ document: resolvedDocument.spreadsheet }),
    [resolvedDocument],
  );
  const core = useMemo(
    () => createReportDesignerCore({ document: resolvedDocument, config: resolvedDesigner, ... }),
  );
  ```
- **严重程度**: P2
- **现状**: 文件同时负责 schema 输入归一化、runtime/core 创建、spreadsheet/report 双向同步、status publication、panel fallback 与 WorkbenchShell 组装。
- **风险**: page renderer 既是 host owner 入口又是 layout 组件，职责面过宽，后续修复更容易互相牵连。
- **建议**: 抽出 host bootstrap/use-report-designer-host、spreadsheet sync bridge、panel composition、shell layout builder。
- **为什么值得现在做**: 该文件已经成为多个问题维度的交叉热点，进一步演化前应先收窄边界。
- **误报排除**: 不是单纯说 page renderer 不应有逻辑；这里已同时承载 boot/runtime orchestration 与 UI 结构编排。
- **历史模式对应**: page host renderer 二次吸入 runtime owner 逻辑。
- **复核状态**: 未复核

### [维度02-11] `report-designer-core/src/core.ts` 继续把 store bootstrap、derived refresh、preview 协调与 registry mutation 汇总在单文件

- **文件**: `packages/report-designer-core/src/core.ts:75-130,202-257,321-372,374-462`
- **证据片段**:
  ```ts
  async function refreshDerivedState() {
  async function refreshFieldSources(): Promise<FieldSourceSnapshot[]> {
  void refreshDerivedState().catch((error) => {
  return {
    registerFieldSource(provider) {
  ```
- **严重程度**: P3
- **现状**: 核心文件同时拥有 state store 初始化、derived refresh orchestration、preview cancel token、adapter registry 注册与 dispose。
- **风险**: 后续若再增加 preview/adapter/refresh 能力，`core.ts` 会继续吸纳实现细节而不是只保留薄 facade。
- **建议**: 把 preview coordinator、field-source refresh coordinator、registry mutation helpers 再拆出。
- **为什么值得现在做**: 目前已是需要控制的膨胀信号，但优先级低于更直接的 page/grid/variant-file 边界问题。
- **误报排除**: 不是泛化指责 core 文件；问题在于它仍承载较多异步协调实现，而非仅暴露 API。
- **历史模式对应**: core facade 组合根缓慢膨胀。
- **复核状态**: 未复核

### [维度02-12] `reaction-runtime.ts` 把执行引擎、全局级测试钩子、registry 与 debug 快照都压在同一模块

- **文件**: `packages/flux-runtime/src/async-data/reaction-runtime.ts:16-58,74-454,456-593`
- **证据片段**:
  ```ts
  const reactionCascadeTestState: ReactionCascadeState = { depth: 0 };
  export function __getGlobalCascadeDepthForTests(): number {
  export function registerReaction(input: {
  export function createRuntimeReactionRegistry(): RuntimeReactionRegistry {
  ```
- **严重程度**: P3
- **现状**: 一个文件里同时放着反应执行器、全局 cascade guard、test-only state accessors、registry ownership 与 debug snapshot 汇总。
- **风险**: runtime reaction 路径的实现/调试/测试辅助边界继续模糊，阅读与演化成本偏高。
- **建议**: 将 registry/debug、global cascade state、test hooks 与 executor 主逻辑进一步拆分。
- **为什么值得现在做**: 暂未到硬门禁，但已经形成明显的职责混装。
- **误报排除**: 不是说 reaction 算法不能集中；是 test/debug/registry/support concerns 已与主执行路径缠在一起。
- **历史模式对应**: runtime 主模块吸入测试辅助与 debug concern。
- **复核状态**: 未复核

### [维度02-13] `variant-field.tsx` 同时承载 selector UI、value migration、scope/form/validation 投影与 child contract 注册

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:131-250,273-472,474-616`
- **证据片段**:
  ```ts
  const runDetectVariantAction = React.useCallback(async () => {
    const result = await props.helpers.dispatch(
  ```
  ```ts
  owner.registerChildContract({
    childOwnerId,
    mode: 'recurse-submit',
    async triggerValidation() {
      const result = await childOwner.validateAll('submit');
  ```
- **严重程度**: P2
- **现状**: 文件既做 selector UI，又做 detect/switch async action、form projection、validation projection、hidden child registration 与 readOnly rendering。
- **风险**: variant-field 的表现层与 owner-boundary 逻辑紧耦合，任何一端变更都会拖动整个文件。
- **建议**: 拆出 selector rendering、variant runtime orchestration、validation/child-contract bridge、readonly/viewer rendering。
- **为什么值得现在做**: 该文件同时命中 02/06/12 维度，是高耦合热点。
- **误报排除**: 不是因为控件复杂；而是跨越 UI、runtime 协调、validation owner 三种职责。
- **历史模式对应**: 复杂字段 renderer 把 owner 逻辑重新吸回单文件。
- **复核状态**: 未复核

### [维度02-14] `tree-layout.ts` 继续把 structured/simple/ELK 三套布局策略塞在一个模块

- **文件**: `packages/flow-designer-core/src/tree-layout.ts:37-258,260-476,478-505`
- **证据片段**:
  ```ts
  export function layoutStructuredTree(
  export function simpleTreeLayout(
  export async function layoutTreeWithElk(
  ```
- **严重程度**: P3
- **现状**: 结构化树布局、简化图层布局、ELK 适配包装共享同一文件。
- **风险**: 新布局策略或参数调整继续堆到同一模块，算法边界与回归定位都不够清晰。
- **建议**: 拆分为 `structured-tree-layout`、`simple-tree-layout`、`elk-tree-layout` 三个模块，由薄 index 聚合导出。
- **为什么值得现在做**: 当前已出现三条相对独立策略，再晚拆分会增加交叉耦合。
- **误报排除**: 不是算法文件天然可接受大；这里已存在三条相对独立的布局实现路径。
- **历史模式对应**: 多策略算法文件继续合并在单模块。
- **复核状态**: 未复核

## 维度复核结论

- [维度02-01]: 保留为 P2。
- [维度02-02]: 保留为 P2。
- [维度02-03]: 保留为 P2。
- [维度02-04]: 保留为 P2。
- [维度02-05]: 保留为 P2。
- [维度02-06]: 保留为 P2。
- [维度02-07]: 保留为 P3。
- [维度02-08]: 驳回。当前 `flow-designer-core/src/core.ts` 仍有膨胀信号，但 live 结构已明显作为 facade/assembler 收口，暂不按文件边界缺陷保留。
- [维度02-09]: 保留为 P2。
- [维度02-10]: 保留为 P2。
- [维度02-11]: 保留为 P3。
- [维度02-12]: 保留为 P3。
- [维度02-13]: 保留为 P2。
- [维度02-14]: 保留为 P3。

## 子项复核结论

- 无需额外子项复核。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                | 一句话摘要                                                                             |
| ----- | -------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 02-01 | P2       | `packages/word-editor-renderers/src/__tests__/word-editor-page-host-scope.test.tsx` | word-editor host-scope 测试继续混装 recovery/shell/window probe/metadata               |
| 02-02 | P2       | `packages/flux-react/src/__tests__/hook-surface-lifecycle-contracts.test.tsx`       | hook-surface-lifecycle 已成跨层 omnibus contract 文件                                  |
| 02-03 | P2       | `packages/flux-runtime/src/__tests__/request-runtime.test.ts`                       | request-runtime 测试混装 helper、prepare、error、dedup 与 dispose 生命周期             |
| 02-04 | P2       | `packages/flow-designer-renderers/src/designer-page.tree.test.tsx`                  | designer-page.tree 继续把 tree/graph/runtime-props/history/warning 混在同一入口        |
| 02-05 | P2       | `packages/nop-debugger/src/controller-inspect-advanced.test.ts`                     | debugger advanced inspect 测试混装 inspect/tree/explain/form-state/failure-trace       |
| 02-06 | P2       | `packages/report-designer-core/src/__tests__/designer-core.test.ts`                 | designer-core 测试把 metadata/preview/codec/field-source async 混成单入口              |
| 02-07 | P3       | `packages/flux-runtime/src/runtime-factory.ts`                                      | runtime-factory 同时承载 module cache、runtime boot、imports、registries 与 dispose    |
| 02-09 | P2       | `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`                           | spreadsheet-grid 混装虚拟化、编辑、键盘、拖拽与上下文菜单壳层                          |
| 02-10 | P2       | `packages/report-designer-renderers/src/page-renderer.tsx`                          | report-designer page renderer 同时承担 host boot、双 runtime 同步与 shell 布局         |
| 02-11 | P3       | `packages/report-designer-core/src/core.ts`                                         | report-designer core 继续汇总 bootstrap、derived refresh、preview 与 registry mutation |
| 02-12 | P3       | `packages/flux-runtime/src/async-data/reaction-runtime.ts`                          | reaction-runtime 混装执行引擎、全局测试钩子、registry 与 debug 快照                    |
| 02-13 | P2       | `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx`         | variant-field 同时承担 UI、value migration、validation 与 child contract bridge        |
| 02-14 | P3       | `packages/flow-designer-core/src/tree-layout.ts`                                    | tree-layout 继续把 structured/simple/ELK 三套布局策略放在同一模块                      |
