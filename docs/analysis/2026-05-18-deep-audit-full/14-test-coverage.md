# 维度 14：测试覆盖与质量

## 第 1 轮（初审）

包级覆盖摘要：

- `@nop-chaos/flux-renderers-form-advanced`: 复核 1 个 suspect，确认 1 个隔离性问题。
- `@nop-chaos/word-editor-renderers`: 复核 1 个 suspect 与 1 个 oversized 基线文件，确认 1 个 setup 膨胀问题。
- `@nop-chaos/flux-react`: 复核 1 个 global patch suspect 与 1 个 oversized hard-gate 文件，确认 1 个可读性或分层问题。
- `@nop-chaos/report-designer-renderers`: 复核 `field-panel-renderer.test.tsx`、`page-renderer.test.tsx`，本轮未追加确认问题。
- `@nop-chaos/flux-code-editor`: 复核 `use-code-mirror.test.tsx` suspect，因有集中 reset 未保留。
- `apps/playground`: 复核 `measurement.test.ts` global patch，因 `try/finally` 恢复完整未保留。

### [维度14-1] detail-view 生命周期计数依赖模块级可变状态，且只在单个用例里手工复位

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\detail-view\detail-view-owner-updates.test.tsx:8-15,270-273`
- **证据片段**:

  ```ts
  let viewerMountCount = 0;

  function DetailViewerLifecycleProbe() {
    const title = useScopeSelector((data: any) => data.summary?.title);

    React.useEffect(() => {
      viewerMountCount += 1;
    }, []);
  }
  ```

- **严重程度**: P2
- **类别**: 隔离性
- **现状**: `viewerMountCount` 在模块顶层共享，且不是统一在 `beforeEach` 或 `afterEach` 中复位，而是只在某一个用例里手工设回 `0`。同文件其他测试也靠每个 `it` 开头手工 `cleanup()`，说明隔离职责是分散的，不是集中式测试夹具。
- **建议**: 把 mount 次数收敛到单测内局部状态，例如测试内闭包、`vi.fn()` 回调、或 render helper 返回的 probe 计数器，并用统一的 `afterEach` 处理 DOM 与状态清理。
- **为什么值得现在做**: 这是 `pnpm check:audit-test-global-leaks` 已命中的真实共享态；一旦后续再新增第二个生命周期 probe 用例，或有人复制现有写法，顺序依赖会立即变成隐性失败源。
- **误报排除**: 这不是单纯模块顶层 let 看起来可疑。同批 suspect 中其他文件已有集中 reset；本文件没有针对该计数器的统一 reset，只靠单个 case 手工归零。
- **历史模式对应**: `pnpm check:audit-test-global-leaks` 的 `test-module-top-let`；不属于大文件即问题的误报模式。
- **参考文档**: `docs/references/audit-tooling.md`; `docs/references/deep-audit-calibration-patterns.md`; `AGENTS.md`
- **复核状态**: 未复核

### [维度14-2] word-editor-page-actions 把保存、返回、数据集、卸载时序混在一个状态化巨型夹具里

- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\__tests__\word-editor-page-actions.test.tsx:37-153,232-265,267-638`
- **证据片段**:
  ```ts
  function resetMockStores() {
    mockState.datasetState = {
      datasets: [],
      selectedDatasetId: null,
    };
    editorStore.setDirty.mockClear();
    mockedCore.captureDocumentSnapshotMock.mockClear();
    mockedCore.persistSavedDocumentMock.mockClear();
  }
  ```
- **严重程度**: P2
- **类别**: setup膨胀
- **现状**: 单文件同时覆盖保存动作、快捷键保存、数据集对话框持久化、`onBack` 转发、直接组件级 hook spy、卸载后异步安全、全局 `window.confirm` 修补、fake timers。共享 `mockState`、store、listeners、i18n、global patch；而真正的状态复位主要依赖每个测试自己记得先调 `resetMockStores()`，`afterEach` 只兜底 DOM、`confirm`、timer。
- **建议**: 至少按 4 组拆开：`save-actions`、`dataset-persistence`、`back-navigation`、`unmount-and-timers`；把 `renderWordEditor` 和 store reset 提升为局部 helper，并在 `beforeEach` 自动执行。
- **为什么值得现在做**: 该文件已被 oversized 基线警告，且不同抽象层如 schema 集成、直接组件、全局 patch 共用同一套可变夹具，失败定位成本高，也更容易在后续加 case 时引入顺序耦合。
- **误报排除**: 不是仅因文件大就上报。保留此项是因为这里已出现真实跨域夹具耦合：不相关的 `onBack`、dataset、save、unmount 场景共享同一批模块级测试状态与恢复逻辑。
- **历史模式对应**: oversized baseline 加 `pnpm check:audit-test-global-leaks` 的 `test-global-patch` 线索已人工复核；最终保留的是更上层的夹具膨胀问题，不是机械重复报告 `window.confirm` patch。
- **参考文档**: `docs/references/audit-tooling.md`; `docs/references/deep-audit-calibration-patterns.md`; `AGENTS.md`
- **复核状态**: 未复核

### [维度14-3] schema-renderer 主测试文件已越过 hard gate，并把多个子系统合同塞进同一套件

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\__tests__\schema-renderer.test.tsx:41-740`
- **证据片段**:

  ```ts
    await waitFor(() => expect(screen.getByText('Data test Bob')).toBeTruthy());
  });

  describe('SchemaRenderer import preparation', () => {
    it('shows a root fallback when import preparation fails', async () => {
  ```

- **严重程度**: P1
- **类别**: 可读性
- **现状**: 该文件被 `pnpm check:oversized-code-files` 直接判为 hard error。内容同时覆盖 callbacks、root action-scope 生命周期、data update、schema import latest-wins/abort、page `modalContainer`、surface runtime seam、debug registry gating、StrictMode inspectability，已经不是单一焦点套件。
- **建议**: 按合同面拆成独立测试文件：`schema-renderer.callbacks.test.tsx`、`schema-renderer.imports.test.tsx`、`schema-renderer.surface-runtime.test.tsx`、`schema-renderer.debug-registry.test.tsx`。公共 renderer/helper 只保留最小共享层。
- **为什么值得现在做**: 这里不是以后可以再整理的纯风格问题；它已经命中仓库 hard gate。继续把新用例堆进这个文件，会让任何单点回归都需要跨多个子系统阅读和维护。
- **误报排除**: 不是只凭行数上报。按校准规则，只有当大文件同时出现职责混杂或边界漂移才保留；本文件正好跨了导入准备、runtime 生命周期、surface、debug registry 等多类合同。
- **历史模式对应**: `pnpm check:oversized-code-files` hard error；明确逃逸仅大文件压力的降级条件。
- **参考文档**: `docs/references/audit-tooling.md`; `docs/references/deep-audit-calibration-patterns.md`; `AGENTS.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度14-4] `field-panel-renderer.test.tsx` 通过模块顶层可变状态驱动整文件 mock，总线式夹具削弱隔离性

- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\field-panel-renderer.test.tsx:14-27,64-76,209-216,301-307,364-370`
- **证据片段**:

  ```ts
  let mockScopeData: Record<string, unknown> = {};
  let mockActionScope: { resolve: (action: string) => unknown } | undefined;
  let mockRuntime: Record<string, unknown> = {};

  vi.mock('@nop-chaos/flux-react', () => ({
    useScopeSelector: (selector: any) => selector(mockScopeData),
  ```

- **严重程度**: P2
- **类别**: 隔离性
- **现状**: `pnpm check:audit-test-global-leaks` 命中的 `test-module-top-let` 候选在这里成立：模块顶层可变 `mockScopeData`、`mockActionScope`、`mockRuntime` 驱动整文件的 `vi.mock('@nop-chaos/flux-react')` 钩子替身，后续用例再在不同测试里反复覆写这些共享变量，本质上仍是隐藏的共享测试总线，不是每例自带的局部夹具。
- **建议**: 把 mocked scope 或 runtime state 收敛到每个用例自己的 render helper 或 factory 内部，避免通过模块级可变状态驱动全文件 mock；必要时在 `beforeEach` 统一重建 mock 实例。
- **为什么值得现在做**: 这种共享总线会让后续新增用例很容易继承前例残留状态，尤其在 selector-based hook mock 下，失败表现通常很隐蔽。
- **误报排除**: 不是所有模块顶层 `let` 都算问题；这里保留是因为这些可变对象直接驱动全文件 mock 行为，而不是仅做只读夹具描述。
- **历史模式对应**: `pnpm check:audit-test-global-leaks` 的 `test-module-top-let` 命中后，经人工复核成立。
- **参考文档**: `docs/references/audit-tooling.md`; `docs/references/deep-audit-calibration-patterns.md`; `AGENTS.md`
- **复核状态**: 未复核

### [维度14-5] `designer-page-shell.test.tsx` 把多个 designer 子系统合同揉进单一 oversized 套件

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page-shell.test.tsx:23-634`
- **证据片段**:
  ```ts
  describe('designer host status publication', () => {
  // ...
  describe('lifecycle hook error monitoring', () => {
  // ...
  describe('toolbar/inspector/dialog host scope propagation', () => {
  ```
- **严重程度**: P2
- **类别**: 可读性
- **现状**: 该文件已膨胀到 635 行，并把 designer host status 发布、lifecycle hook 错误监控、toolbar/inspector/dialog host scope 传播、`designer-field` disabled 与 label meta 契约、xyflow 渲染与 fallback 与 workbench markers 等多个本应分开的合同揉在一个文件里，已越过单一 orchestrator 测试文件范畴。
- **建议**: 按合同面拆分为独立套件，例如 `designer-page-status.test.tsx`、`designer-page-host-scope.test.tsx`、`designer-page-field-contract.test.tsx`、`designer-page-workbench-markers.test.tsx`。
- **为什么值得现在做**: 多个 designer 子系统共用同一 stateful 页面级夹具，定位失败原因和后续扩展成本都偏高；这不是单纯大文件，而是跨域合同堆叠。
- **误报排除**: 本条不是机械复述 oversized warning；保留是因为文件内部确实混了多个不共演化的合同面。
- **历史模式对应**: oversized baseline 与跨域夹具耦合的组合问题。
- **参考文档**: `docs/references/audit-tooling.md`; `docs/references/deep-audit-calibration-patterns.md`; `AGENTS.md`
- **复核状态**: 未复核

### [维度14-6] `page-renderer.test.tsx` 同时覆盖 inspector、异常监控、workbench、dirty state 与 selection 投影，套件边界过宽

- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\page-renderer.test.tsx:149-593`
- **证据片段**:
  ```ts
  describe('inspector parsing and side panel visibility', () => {
  // ...
  describe('field-source exception monitoring and mount init', () => {
  // ...
  describe('workbench collapse/status publish/unmount', () => {
  ```
- **严重程度**: P2
- **类别**: 可读性
- **现状**: 同一文件同时覆盖 inspector 解析与左右侧栏显隐、field-source 异常监控与 mount-effect 初始化、无效输入兼容回退、workbench collapse/status publish/unmount、runtime dirty 与 selectionTarget 投影。这不是单纯大文件噪音，而是多个子系统契约被硬绑在一个 stateful 页面级夹具里。
- **建议**: 按行为域拆成至少三组：inspector or side panels、field-source initialization or monitoring、workbench or runtime publication contracts，并收敛共享 render helper。
- **为什么值得现在做**: 这类页面级集成测试最容易继续吸纳新合同；现在不拆，后续每加一条用例都在放大定位和维护成本。
- **误报排除**: 不是机械把 594 行视为问题；本条保留的原因是多个不共演化的 contract surface 已经实质耦合在一个夹具里。
- **历史模式对应**: 与 `[维度14-2]`、`[维度14-3]` 同类的 stateful 页面级测试再膨胀。
- **参考文档**: `docs/references/audit-tooling.md`; `docs/references/deep-audit-calibration-patterns.md`; `AGENTS.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度14-7] `word-editor-page-host-scope-projections` 把 host projection、recovery、window probe 与 page shell 合同揉进同一共享可变夹具

- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\__tests__\word-editor-page-host-scope-projections.test.tsx:16-24,252-402`; `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\__tests__\word-editor-page-host-scope.test-support.tsx:26-40,78-120,195-217`
- **证据片段**:
  ```ts
  it('publishes host status and mounts override regions with word-editor scope', async () => {
  // ...
  it('keeps the semantic root marker on the page shell', () => {
  // ...
  it('publishes recovered document into host scope instead of stale schema seed', async () => {
  // ...
  it('registers a window probe with recovered document state and removes it on unmount', async () => {
  ```
- **严重程度**: P2
- **类别**: setup膨胀
- **现状**: 这个 511 行套件同时覆盖了 host scope 或 status 发布与 region override、`.nop-word-editor-page` shell marker、mount-time recovered persisted document bootstrap、`window.__NOP_WORD_EDITOR_PROBE__` 注册与卸载清理等不共演化合同；底层却统一复用 `word-editor-page-host-scope.test-support.tsx` 里的共享 `mockState`、`datasetStore`、`mockedCore.loadRecoveredStateMock` 与 `renderWordEditor()`。`afterEach` 只做 DOM `cleanup()`，真实状态复位仍靠每个 `it` 手工先调 `resetMockStores()`。
- **建议**: 至少按合同面拆成 4 组：host projection basics、persistence and recovery、page shell markers、window probe or debug surface。共享 support 只保留无状态 render helper；把 store 或 mock reset 收敛到 `beforeEach`，避免继续通过模块级共享夹具承载 recovery、probe、shell marker 与 host projection 全部语义。
- **为什么值得现在做**: 这组测试守的是 `word-editor-page` 最关键的 persisted-first host contract 与 workbench shell 边界；现在任何一个 case 失败，都要先穿过 recovery mock、dataset listeners、window probe、副作用清理这几层共享装配，定位成本高，也很容易继续演化成另一个 `[维度14-2]` 式 page-level 巨型套件。
- **误报排除**: 不是因为文件 511 行就机械上报。保留此项是因为文档已把 host projection timing、workbench shell marker、mount-time recovery 视为不同合同面，而当前测试文件确实把这些面混在同一共享可变 support 上。也不是在重复报告 window global 泄漏；live case 已验证 probe 会卸载清理，这里指出的是合同面混搭与夹具耦合。
- **历史模式对应**: 与 `[维度14-2]` 同类的 stateful 页面级测试继续吸纳新合同面；这次膨胀集中在 `word-editor-page` 的 host projection、recovery、probe、shell 四类边界。
- **参考文档**: `docs/components/word-editor-page/design.md`; `docs/architecture/word-editor/design.md`; `docs/architecture/renderer-runtime.md`; `docs/references/audit-tooling.md`; `docs/references/deep-audit-calibration-patterns.md`; `AGENTS.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度14-1]: 降级。模块级 `viewerMountCount` 确实存在，但当前只有最后一个用例使用，且用例内先显式归零，未看到已成立的跨用例污染；更像局部测试味道。
- [维度14-2]: 降级。文件和夹具体量偏大，但 live cases 仍大体围绕 `word-editor-page` 的 actions/save/back/unmount 行为；`resetMockStores()` 目前也在各用例中持续调用，问题更偏可维护性压力。
- [维度14-3]: 保留 (P1)。`packages/flux-react/src/__tests__/schema-renderer.test.tsx` 已越过 hard gate，而且把 callbacks、data update、import preparation、surface seam、debug registry、StrictMode inspectability 等多类契约揉在同一套件，不只是单纯大文件。
- [维度14-4]: 驳回。`packages/report-designer-renderers/src/field-panel-renderer.test.tsx` 的模块级 mock 状态虽存在，但有集中 `afterEach` 复位，当前更像受控测试夹具模式。
- [维度14-5]: 降级。`packages/flow-designer-renderers/src/designer-page-shell.test.tsx` 确有 500+ 行与多主题堆叠，但仍基本围绕 `designer-page` shell 契约；可作为后续拆分建议，不宜保留为强缺陷。
- [维度14-6]: 降级。`packages/report-designer-renderers/src/page-renderer.test.tsx` 覆盖面偏宽，但多数仍属于 `ReportDesignerPageRenderer` 页面级契约集成测试；更像可读性与维护性压力。
- [维度14-7]: 降级。`packages/word-editor-renderers/src/__tests__/word-editor-page-host-scope-projections.test.tsx` 与 support fixture 共享状态属实，但主体仍围绕 host projection/persistence contract，且每例都在手工 reset；更适合作为温和拆分建议。

## 子项复核结论

- 若后续继续治理测试套件拆分，建议单独复核 `[维度14-2]` 的直接 `<WordEditorPage>` `onBack` 转发用例是否应独立出页面 actions 套件。
- 建议单独复核 `[维度14-5]` 的 `designer-field` 相关断言是否应从 `designer-page-shell.test.tsx` 拆到独立组件测试。
- 建议单独复核 `[维度14-7]` 的 root marker 与 window probe 两类用例是否应移出 host projection 主套件。

## 最终保留项

| 编号 | 严重程度 | 文件                                                                | 一句话摘要                                                       |
| ---- | -------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 14-3 | P1       | `packages/flux-react/src/__tests__/schema-renderer.test.tsx:41-740` | `schema-renderer.test.tsx` 已越过 hard gate 且混入多个子系统契约 |
