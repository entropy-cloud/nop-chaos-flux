# 02 Module Responsibility

- 深挖轮次: 1
- 深挖发现数: 4

## 第 1 轮初审

### [维度02-01] 四个 >700 测试文件违反硬性文件边界，且不是单一夹具文件

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\__tests__\use-table-controls.test.tsx:109-754`
  - `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\__tests__\form-submit-actions.test.tsx:19-684`
  - `C:\can\nop\nop-chaos-flux\packages\flux-compiler\src\schema-compiler-diagnostics.test.ts:44-696`
  - `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\__tests__\runtime-dialogs-scope.test.ts:7-676`
- **行号范围**: 主 agent 基线显示分别为 779、751、726、718 行；证据范围为各文件内多个 `describe/it` 责任段。
- **证据片段**:
  ```ts
  describe('useTablePagination', () => {
    it('uses local pagination state and emits page scopes', () => {
  ...
  describe('useTableSelection', () => {
    it('manages local selection, select-all, and external selection updates', () => {
  ...
  describe('useTableSort', () => {
    it('toggles local sort state and ignores unsortable columns', () => {
  ```
- **严重程度**: P1
- **现状**: `pnpm check:oversized-code-files` 已明确失败，4 个源码测试文件超过 700 行硬阈值。它们不是单一长快照或单个生成式 fixture，而是把多个可独立命名的行为簇放在同一文件中，例如 table controls 的 pagination/selection/sort/filter/expand，compiler diagnostics 的 namespace/strict/host-action/xui:actions，runtime dialogs 的 dialog/drawer/scope/surface teardown。
- **风险**: 该问题已是自动化红线，阻断 oversized check；继续保留会使后续补测试时更容易在同一个“综合测试桶”中追加 case，造成二次膨胀和审查困难。
- **建议**: 按现有 `describe` 或行为簇拆分测试文件，而不是逐个 `it` 机械拆分。建议拆分为 `use-table-pagination.test.tsx`、`use-table-selection.test.tsx`、`use-table-sort-filter-expand.test.tsx`、`form-submit-actions.test.tsx`、`form-init-and-values-path.test.tsx`、`form-submit-scope-boundary.test.tsx`、`schema-compiler-namespace-diagnostics.test.ts`、`schema-compiler-strict-mode.test.ts`、`host-action-validation.test.ts`、`runtime-dialog-actions.test.ts`、`runtime-drawer-actions.test.ts`、`runtime-surface-scope.test.ts`。
- **为什么值得现在做**: 这是当前命令基线中唯一的 P1/P0 级文件边界硬失败之一，拆分 ROI 高，并能避免后续功能测试继续堆到已失败文件。
- **误报排除**: 不是“Large File Pressure Without Boundary Drift”的普通 500-700 行噪音；这些文件超过 700 行，命中共享前缀和维度 02 的“必须拆分”硬规则，且有多个职责簇证据。
- **历史模式对应**: 对应本仓库曾从 `table-renderer.tsx`、`use-spreadsheet-interactions.ts` 等超大文件中按稳定职责边界提取的模式；此处应按测试行为 owner 分组提取。
- **参考文档**: `docs/skills/deep-audit-prompts.md:678-683`, `docs/skills/deep-audit-prompts.md:689-697`, `AGENTS.md:157-158`, `docs/references/deep-audit-calibration-patterns.md:38-43`
- **复核状态**: 未复核

### [维度02-02] `input.tsx` 将 8 类表单控件、source 错误显示和 number 专属交互塞进单文件，已接近二次膨胀

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\input.tsx:41-636`
- **行号范围**: 41-636；文件总行数 637，处于 500-700 需评估拆分区间。
- **证据片段**:
  ```tsx
  export function createInputRenderer(inputType: string) {
    return function InputRenderer(props: RendererComponentProps<InputSchema>) {
  ...
  function SelectRenderer(props: RendererComponentProps<SelectSchema>) {
  ...
  function CheckboxGroupRenderer(props: RendererComponentProps<CheckboxGroupSchema>) {
  ...
  function InputNumberRenderer(props: RendererComponentProps<InputNumberSchema>) {
  ```
- **严重程度**: P2
- **现状**: 该文件同时承担文本输入 renderer 工厂、select/radio/checkbox-group 的 optionsSource loading/error UI、textarea/checkbox/switch 渲染、input-number 的 clamp/precision/stepper 交互，以及最终 `inputRendererDefinitions` 注册表。虽然都属于 form primitive controls，但单文件已经达到 637 行，并且内部职责可以自然按控件族拆分。
- **风险**: 任何一个控件的行为、样式或 accessibility 修改都需要进入同一个大文件，容易引发跨控件无关 diff；后续新增 date/time/tree-select 等输入类控件时也会自然追加到这里，重新走向已被拆分过的 renderer mega-file 模式。
- **建议**: 不要为了行数过度切碎；建议先按稳定控件族拆 3-4 个文件：`text-input-renderers.tsx`、`choice-renderers.tsx`、`input-number-renderer.tsx`、`input-renderer-definitions.ts`。
- **为什么值得现在做**: 该文件已经是非测试源码中靠前的 >500 WARN，且是活跃 form renderer 入口。一次按控件族拆分可以降低后续 UI、validation、source-option 修改冲突。
- **误报排除**: 不是仅因 500-700 行报告；证据显示至少三类不同控件族和注册组装混在一起。它也不是 orchestrator，因为大量 JSX、事件处理和 value adapter 逻辑直接在文件内实现。
- **历史模式对应**: 对应 `table-renderer.tsx` 从大 renderer 文件提取 table submodules 的历史模式；这里适合“第一轮提取后停下来”，只按控件族拆，不做过细拆分。
- **参考文档**: `AGENTS.md:157-158`, `docs/skills/deep-audit-prompts.md:676-681`, `docs/references/deep-audit-calibration-patterns.md:38-43`
- **复核状态**: 未复核

### [维度02-03] `variant-field.tsx` 同时拥有变体识别、值迁移、子 owner 注册、隐藏字段策略和渲染 shell

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\variant-field\variant-field.tsx:118-589`
- **行号范围**: 118-589；文件总行数 590，处于 500-700 需评估拆分区间。
- **证据片段**:
  ```tsx
  export function VariantFieldRenderer(props: RendererComponentProps<VariantFieldSchema>) {
    const parentForm = useCurrentForm();
  ...
    const [userSelectedKey, setUserSelectedKey] = React.useState<string | undefined>(undefined);
    const [detectedKey, setDetectedKey] = React.useState<string | undefined>(undefined);
  ...
    const runDetectVariantAction = React.useCallback(async () => {
  ```
- **严重程度**: P2
- **现状**: 文件已经抽出了 matching/runtime 子模块，但主 renderer 又吸纳了多个非纯渲染职责：detectVariantAction 异步识别、transformInAction 值迁移、hidden variant child paths、child contract 注册、selector/read-only 渲染和 FieldFrame shell 组装。
- **风险**: variant-field 属于复杂 composite value owner，后续状态所有权、validation、slot/scope 修复都会落在同一个 590 行文件中，容易把运行时 owner 行为和 JSX shell 改动耦合，增加回归面。
- **建议**: 保持现有 `variant-field-matching.ts` / `variant-field-runtime.ts`，再提取一个 renderer-local controller hook，例如 `use-variant-field-controller.ts`，集中管理 activeKey、detect action、switch transform、hidden paths 和 child contract；`variant-field.tsx` 保留 selector/body/FieldFrame 组装。
- **为什么值得现在做**: 该文件是 >500 WARN 且已有“已拆分后重新吸入实现细节”的迹象。趁功能边界已清晰时提取 controller，可降低后续 value-adaptation 与 renderer shell 变更互相干扰。
- **误报排除**: 不是要求所有 composite field 强制共用同一 shell；问题在于同一个文件同时承载异步动作执行、form owner 子契约和渲染 shell，而不是单纯存在 local draft state 或 FieldFrame 使用。
- **历史模式对应**: 对应“复杂 renderer 拆成 runtime/matching/controller/shell”的本仓库重构模式，也符合维度 02 对“二次膨胀”的检查口径。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md:390-414`, `docs/skills/deep-audit-prompts.md:691-697`, `docs/references/deep-audit-calibration-patterns.md:91-103`
- **复核状态**: 未复核

### [维度02-04] `flow-designer-renderers` 稳定入口仍内联 90 行 renderer manifest，违反 package entry 边界说明

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\index.tsx:24-120`
- **行号范围**: 24-120
- **证据片段**:
  ```tsx
  export const flowDesignerRendererDefinitions: RendererDefinition[] = [
    {
      type: 'designer-page',
      component: DesignerPageRenderer,
      displayName: 'Designer Page',
      sourcePackage: '@nop-chaos/flow-designer-renderers',
      rendererClass: 'domain-host-renderer',
      rendererTraits: ['workbench-shell', 'builder-facing'],
  ```
- **严重程度**: P1
- **现状**: `docs/architecture/flux-runtime-module-boundaries.md` 明确说 `@nop-chaos/flow-designer-renderers` root entry keeps stable schema/manifest registration surface，而 Xyflow bridge primitives、palette/canvas internals、designer context helpers move behind unstable。当前 root entry 虽然只有 121 行，但直接内联 `designer-page` 的 propContracts、scopeExportContracts、fields、actionScopePolicy、hostContract 等稳定 manifest 细节。
- **风险**: 入口文件一旦继续承载 domain-host renderer definition，会成为后续 designer-page contract 扩展的默认落点；这会把“包入口纯 re-export/注册面”和“组件 manifest 定义 owner”混在一起，且与文档的 package entry 边界描述偏离，误导后续开发在 index 中追加实现/契约细节。
- **建议**: 提取 `flow-designer-renderer-definitions.ts` 或 `designer-renderer-definitions.ts`，由该文件拥有 `flowDesignerRendererDefinitions`；`index.tsx` 只 re-export schemas/action provider/manifest/definitions，并保留 `registerFlowDesignerRenderers`、`createFlowDesignerRegistry` 的薄注册函数。
- **为什么值得现在做**: 这是文档-代码直接偏离的入口文件问题，修复很小但能防止 root entry 继续膨胀；也能使 package entry 与 `flux-runtime/src/index.ts` 的薄入口基线保持一致。
- **误报排除**: 不是所有入口文件中存在注册 helper 都算问题；`registerFlowDesignerRenderers` 本身可以保留。问题是大段 renderer manifest/propContracts 内联在 root entry 中，而 owner 文档已经对该包 root entry 的稳定 surface 作了明确约束。
- **历史模式对应**: 对应本仓库 `flux-runtime/src/index.ts` 从实现入口收敛为薄 re-export 的模式，以及 package entry boundaries 的近期裁定。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md:435-448`, `docs/architecture/flux-runtime-module-boundaries.md:26-36`, `docs/skills/deep-audit-prompts.md:698-701`
- **复核状态**: 未复核

## 超大文件清单摘要

- **>700 MUST split（命令基线当前失败）**: `use-table-controls.test.tsx` 779 行、`form-submit-actions.test.tsx` 751 行、`schema-compiler-diagnostics.test.ts` 726 行、`runtime-dialogs-scope.test.ts` 718 行。
- **500-700 WARN 中本轮认为值得报告**: `input.tsx` 637 行、`variant-field.tsx` 590 行。
- **500-700 WARN 中本轮暂不作为发现**: `runtime-factory.ts`、`reaction-runtime.ts`、`form-runtime-owner.ts`、`flow-designer-core/src/core.ts`、`spreadsheet-grid.tsx` 等缺少足够边界漂移证据，按大文件压力观察。

## 入口文件问题清单

- `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\index.tsx`: 已作为 [维度02-04] 报告，root entry 内联 renderer manifest。
- `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\index.ts`: 10 行薄 re-export，符合 owner 文档。
- `spreadsheet-core`、`word-editor-core`、`report-designer-core` 入口导出项较多但主要是 type/value re-export，更适合维度 03 API 表面积复核。

## 目录结构建议

- `packages/flux-runtime/src` 顶层文件数偏高，后续可考虑 `form-runtime/` 子目录迁移，但本轮不作为缺陷。
- `packages/flux-react/src` 顶层文件数偏高，后续可评估将 `node-renderer-*`、`dialog-host-*` 归组。
- `packages/flow-designer-renderers/src` 顶层文件数偏高，建议优先从 root entry definition 提取开始。
- `packages/flux-renderers-basic/src` 多数是一 renderer 一文件，暂可接受。

## 文档-代码偏离清单

- `docs/architecture/flux-runtime-module-boundaries.md:435-448` 与 `packages/flow-designer-renderers/src/index.tsx` root entry 内联完整 renderer definitions 存在偏离，已作为 [维度02-04]。
- `flux-runtime` thin entry、`runtime-factory.ts` assembly owner、`form-runtime-owner.ts`、`reaction-runtime.ts` 当前未发现足够强的边界漂移证据。

## 深挖第 2 轮追加

### [维度02-05] `designer-core.test.ts` 将 report core 基础行为、预览并发、codec、inspector 与 field-source 生命周期塞进单个近 700 行测试桶

- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-core\src\__tests__\designer-core.test.ts:23-693`
- **行号范围**: 文件总行数 694；证据覆盖同一 `describe('createReportDesignerCore')` 下多个独立行为簇。
- **证据片段**:
  ```ts
  describe('createReportDesignerCore', () => {
    ...
    it('keeps the latest preview result when an older preview resolves later', async () => {
    ...
    it('importTemplate participates in undo history', async () => {
    ...
    it('aborts stale selection refreshes and dispose aborts in-flight work', async () => {
  ```
- **严重程度**: P2
- **现状**: 该测试文件已达 694 行，距离 700 行硬阈值仅 6 行。它不是单一夹具或快照文件，而是在一个顶层 describe 中覆盖 metadata/dirty/undo、inspector、preview 并发与 abort、import/export codec、field-source refresh/dispose/onError 等多个 owner 行为。
- **风险**: 后续给 report-designer-core 增加任一回归测试都很容易把该文件推过 `>700 MUST split` 红线；同时不同子系统的测试夹具和异步控制流混在一起，会降低定位失败和审查 diff 的效率。
- **建议**: 按行为 owner 拆分，而不是逐个 `it` 机械拆分。建议拆为 `designer-core-metadata-history.test.ts`、`designer-core-preview.test.ts`、`designer-core-codec.test.ts`、`designer-core-field-sources.test.ts`，保留共享 test-utils。
- **为什么值得现在做**: 这是当前 500-700 WARN 中最接近硬失败的文件之一，且已有明确多职责簇证据；拆分成本低于等它进入 >700 后再被 CI 阻断。
- **误报排除**: 不是单纯 Large File Pressure；该文件同时测试核心状态、异步预览、codec 和 field-source 生命周期，已超过单一模块行为边界。
- **历史模式对应**: 对应已报告的 `schema-compiler-diagnostics.test.ts` / `runtime-dialogs-scope.test.ts` 综合测试桶模式，应按 owner 行为簇拆分。
- **参考文档**: `docs/skills/deep-audit-prompts.md:678-697`, `docs/references/deep-audit-calibration-patterns.md:38-43`
- **复核状态**: 未复核

### [维度02-06] `designer-command-adapter.test.ts` 同时测试通用 graph adapter 与 tree-owner 命令，形成二次膨胀盲区

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-command-adapter.test.ts:63-691`
- **行号范围**: 文件总行数 692；通用 adapter 行为约 63-242，tree-mode fixture 与命令约 244-691。
- **证据片段**:

  ```ts
  describe('createDesignerCommandAdapter', () => {
    it('normalizes shared command results for reconnect success and rejection', () => {
    ...
    it('toggle commands return fresh snapshot', () => {
  });

  // ─── Tree mode insertChainNode tests ─────────────────────────────────────
  function createDingFlowConfig(): DesignerConfig {
  ```

- **严重程度**: P2
- **现状**: 文件已达 692 行，距离 700 行硬阈值仅 8 行。前半段测试 graph command adapter 的共享结果面、viewport、palette/inspector toggle；后半段内联 DingFlow tree config、TreeDocument fixture、projectTreeToDoc，并测试 insertChainNode、updateNodeData、deleteNode、add/move/delete branch、undo/redo 等 tree-owner 行为。
- **风险**: tree mode 的命令扩展会自然继续追加到该文件，使其很快进入硬失败；同时 graph adapter 与 tree-owner projection/ownership 测试耦合，会让失败定位混淆在 renderer adapter、flow-core projection 和 tree command 三个边界之间。
- **建议**: 拆为 `designer-command-adapter.graph.test.ts` 与 `designer-command-adapter.tree-owner.test.ts`；将 `createDingFlowConfig`、`createSimpleTreeDocument`、`createBranchingTreeDocument`、`projectTreeToDoc` 下沉到专用 tree test fixture 或留在 tree-owner 测试文件内。
- **为什么值得现在做**: 它是 flow index 发现旁边的同包入口/目录职责盲区，且接近硬阈值；拆分能同时降低 flow-designer-renderers 顶层测试文件膨胀。
- **误报排除**: 不是合理单一 adapter 测试；后半段已不只是 adapter result normalization，而是完整 tree-owner mutation 与 projection coherence。
- **历史模式对应**: 对应本轮已有 `flow-designer-renderers/src/index.tsx` 入口 manifest 膨胀旁边的同包职责继续外溢，应按 graph adapter 与 tree-owner 行为拆分。
- **参考文档**: `docs/skills/deep-audit-prompts.md:691-703`, `docs/references/deep-audit-calibration-patterns.md:38-43`
- **复核状态**: 未复核

### [维度02-07] `context-menu-operations.test.tsx` 把 spreadsheet context menu 的清空、填充、结构变更、冻结、排序过滤与禁用态全塞进单文件

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\__tests__\context-menu-operations.test.tsx:60-677`
- **行号范围**: 文件总行数 678。
- **证据片段**:
  ```tsx
  describe('spreadsheet context menu operations', () => {
    it('opens the shared context menu and clears the selected cell', async () => {
    ...
    it('merges the selected range from the shared context menu', async () => {
    ...
    it('sorts the selected range ascending from the shared context menu', async () => {
    ...
    it('filters rows by the selected cell value from the shared context menu and clears the filter', async () => {
  ```
- **严重程度**: P2
- **现状**: 该测试文件 678 行，已经逼近 700 行硬阈值。虽然都经由 context menu 入口触发，但实际覆盖的是多个独立 spreadsheet domain operation：cell clear、fill handle、row/column insert/delete、merge、freeze/unfreeze、sort、filter、disabled menu state。
- **风险**: context menu 是活跃交互入口，新增菜单项或回归测试会继续堆到同一文件中；一旦超过 700 行会被 oversized check 拦截，同时不同 spreadsheet operation 的失败会共享冗长 UI harness，增加调试成本。
- **建议**: 按操作族拆分为 `context-menu-cell-fill.test.tsx`、`context-menu-structure.test.tsx`、`context-menu-merge-freeze.test.tsx`、`context-menu-sort-filter.test.tsx`，共享 `SpreadsheetGridHarness` 可提取到测试 helper。
- **为什么值得现在做**: 当前文件未超过硬阈值但已处于高风险边缘；拆分点非常清晰，且能防止 spreadsheet-renderers 后续菜单功能继续形成综合测试桶。
- **误报排除**: 不是因为 678 行本身报告；证据显示同一文件内覆盖多个 domain operation，而不是单一 context menu rendering 行为。
- **历史模式对应**: 对应 `use-table-controls.test.tsx` 已报告的 pagination/selection/sort/filter/expand 混合测试桶模式。
- **参考文档**: `docs/skills/deep-audit-prompts.md:678-697`, `docs/references/deep-audit-calibration-patterns.md:38-43`
- **复核状态**: 未复核

### [维度02-08] `designer-page.tree.test.tsx` 将 tree 渲染、graph 回归、runtime props、render-phase 防护和 core continuity 混成单个 tree-mode 测试文件

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page.tree.test.tsx:117-663`
- **行号范围**: 文件总行数 664。
- **证据片段**:
  ```tsx
  describe('DesignerPageRenderer tree mode', () => {
    it('renders tree mode by projecting treeDocument to graph nodes and edges', () => {
    ...
    it('graph mode still works correctly (regression test)', () => {
    ...
    it('does not warn about render-phase updates when treeDocument runtime props change', async () => {
    ...
    it('preserves selection and undo history continuity across treeDocument updates', async () => {
  ```
- **严重程度**: P2
- **现状**: 该文件 664 行，已超过 500 行需评估区间。它名义上是 tree mode 测试，但实际覆盖 tree projection rendering、ELK auto-layout mock、missing tree fallback、graph mode regression、runtime props resolution、render-phase update warning、core reuse、selection/undo continuity 等多个行为层。
- **风险**: tree mode 正在继续扩展，后续每个 renderer/runtime props 或 continuity 修复都可能继续追加到该文件，形成 flow-designer-renderers 的第二个近 700 行综合测试桶。
- **建议**: 按职责拆分为 `designer-page.tree-rendering.test.tsx`、`designer-page.tree-runtime-props.test.tsx`、`designer-page.tree-continuity.test.tsx`；graph mode regression 移回 graph/page 专属测试或保留单独小文件。
- **为什么值得现在做**: 它与 `[维度02-04]` 的 flow renderer entry manifest 问题同属 flow-designer-renderers 边界膨胀；拆分能降低 tree mode 后续迭代的测试冲突面。
- **误报排除**: 不是要求所有 tree-mode case 都拆散；问题是同一文件已经跨越 rendering、runtime prop、React render-phase safety 和 core lifecycle continuity 多个 owner。
- **历史模式对应**: 对应本仓库从大 renderer/interaction 文件中按稳定职责边界提取的模式；这里适合按 tree rendering / runtime props / continuity 三段提取。
- **参考文档**: `docs/skills/deep-audit-prompts.md:691-697`, `docs/references/deep-audit-calibration-patterns.md:38-43`
- **复核状态**: 未复核

### [维度02-09] `array-field.tsx` 在已拆 runtime helper 后重新吸入 item identity、子 scope/form/validation、标量校验发布和渲染 shell

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\composite-field\array-field.tsx:41-573`
- **行号范围**: 文件总行数 574。
- **证据片段**:
  ```tsx
  function buildObjectArrayItemKeys(
    items: unknown[],
    itemKeyField?: string,
  ): {
  ...
  function ArrayItem(props: {
    itemIdentity: string;
    index: number;
    arrayPath: string;
  ...
  function publishScalarArrayItemErrors(input: {
  ...
  export function ArrayFieldRenderer(props: RendererComponentProps<ArrayFieldSchema>) {
  ```
- **严重程度**: P2
- **现状**: 文件已经有 `array-field-runtime.ts` 承担 item form/scope proxy，但主 `array-field.tsx` 又集中实现 object item identity、scalar child error collection/publication、child contract registration、projected validation runtime 创建、ArrayItem provider shell、add/remove 操作和最终 JSX。
- **风险**: array-field 是复杂 composite value owner，后续 item identity、validation、child owner contract、渲染 shell 任一方向的修改都会进入同一个 574 行文件；这与 `variant-field.tsx` 的二次膨胀模式相同，容易把运行时 owner 行为与 UI shell 变更耦合。
- **建议**: 保留 `array-field-runtime.ts`，再提取 `array-field-item-identity.ts`、`array-field-scalar-validation.ts` 或一个 renderer-local `use-array-field-controller.ts`；`array-field.tsx` 只保留 Field/ArrayItem shell 和 renderer definition。
- **为什么值得现在做**: 它是 `variant-field.tsx` 同目录同类 composite field 的追加盲区，且已超过 500 行；当前边界已清晰，提取 controller/validation helper 的 ROI 高。
- **误报排除**: 不是要求所有 composite field 共用 shell，也不是单纯大文件压力；该文件已在 runtime helper 存在后继续吸入子 owner contract、validation error publication 和 identity 策略。
- **历史模式对应**: 对应 `[维度02-03] variant-field.tsx` 的“已拆分后重新吸入实现细节”模式，以及复杂 renderer 拆成 runtime/controller/shell 的本仓库重构方式。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md:390-414`, `docs/skills/deep-audit-prompts.md:691-697`, `docs/references/deep-audit-calibration-patterns.md:91-103`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度02-10] `core-basics.test.ts` 将 spreadsheet core 初始化、单元格、结构、筛选和排序命令塞进单个基础测试桶

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-core\src\__tests__\core-basics.test.ts`
- **行号范围**: 9-653；文件总行数 654。
- **证据片段**:
  ```ts
  describe('createSpreadsheetCore', () => {
  ...
  describe('setCellValue', () => {
  ...
  describe('merge/unmerge', () => {
  ...
  describe('filterRowsByCellValue/clearRowFilters', () => {
  ...
  describe('sortRange', () => {
  ```
- **严重程度**: P2
- **现状**: 该文件已达 654 行，处于 500-700 需评估拆分区间，并且不是单一核心初始化测试；它同时覆盖 core snapshot、selection、cell value/formula/style、merge、row/column resize/hide、sheet add/remove、filter、multi-column filter、sort 等多个 spreadsheet command 家族。
- **风险**: `spreadsheet-core` 后续任一命令扩展或回归测试都会自然追加到这个“core basics”桶中，距离 700 行硬阈值只剩 46 行；不同命令族共享同一长文件会降低失败定位和 review 可读性。
- **建议**: 按命令 owner 拆分为 `core-cell-values.test.ts`、`core-cell-style-merge.test.ts`、`core-sheet-structure.test.ts`、`core-filter-sort.test.ts`，保留少量 create/snapshot smoke test 在原文件。
- **为什么值得现在做**: 文件已经接近硬阈值，且拆分边界完全沿现有 `describe` 分组，不需要重构测试逻辑，ROI 高。
- **误报排除**: 不是单纯 500-700 行大文件压力；证据显示该文件覆盖多个可独立演进的 spreadsheet command family，不是单一 orchestrator 或单一 fixture。
- **历史模式对应**: 对应已报告的 table controls / context menu 综合测试桶模式，应按行为 owner 而非逐个 `it` 拆分。
- **参考文档**: `docs/skills/deep-audit-prompts.md:678-697`, `docs/references/deep-audit-calibration-patterns.md:38-43`
- **复核状态**: 未复核

### [维度02-11] `word-editor-page-host-scope.test.tsx` 将 host scope、恢复态、shell marker 与 renderer manifest 元数据混成单个近 650 行测试

- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\__tests__\word-editor-page-host-scope.test.tsx`
- **行号范围**: 221-643；文件总行数 644。
- **证据片段**:
  ```tsx
  describe('WordEditorPage host scope', () => {
    it('updates host scope dataset projection when dataset store changes', async () => {
  ...
    it('publishes recovered document into host scope instead of stale schema seed', async () => {
  ...
    it('keeps the semantic root marker on the page shell', () => {
  ...
    it('exposes domain host metadata on the registered renderer definition', () => {
  ```
- **严重程度**: P2
- **现状**: 文件名定位为 host scope，但实际还测试 autosave/recovered document precedence、window probe cleanup、semantic root marker、registered renderer manifest metadata 等不同责任层。文件已达 644 行，距离硬阈值 56 行。
- **风险**: Word editor host scope、persistence/recovery、renderer shell 和 manifest contract 后续都会继续往同一文件追加 case，容易把 runtime projection 失败、UI shell marker 失败和 manifest metadata 失败混在一起。
- **建议**: 拆为 `word-editor-page-host-scope.test.tsx`、`word-editor-page-recovery.test.tsx`、`word-editor-page-shell.test.tsx`、`word-editor-renderer-manifest.test.ts`；共享 mock store 和 `renderWordEditor` helper。
- **为什么值得现在做**: 该文件已处于接近硬阈值的活跃 domain-host renderer 测试区，拆分可防止继续变成 word-editor 的综合 contract 桶。
- **误报排除**: 不是仅因 644 行报告；semantic marker 和 renderer manifest metadata 并不属于 host scope projection 的同一职责，已出现明确边界漂移。
- **历史模式对应**: 对应 domain host renderer 测试从“页面级一桶”拆为 host scope / persistence / manifest contract 的模式。
- **参考文档**: `docs/skills/deep-audit-prompts.md:678-697`, `docs/references/deep-audit-calibration-patterns.md:38-43`
- **复核状态**: 未复核

### [维度02-12] `data-table.test.tsx` 把 table 行作用域、region/style contract、instancePath 和表单控件绑定回归混在单个 renderer 测试文件

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\__tests__\data-table.test.tsx`
- **行号范围**: 16-614；文件总行数 615。
- **证据片段**:
  ```tsx
  describe('dataRendererDefinitions table behavior', () => {
    it('renders row-scope actions that open dialogs with row data', async () => {
  ...
    it('keeps table root marker non-visual and merges schema className onto the root', () => {
  ...
    it('propagates repeated table row instancePath into row child nodes', async () => {
  ...
    it('binds form controls in cells via $slot.record.fieldName path', async () => {
  ```
- **严重程度**: P2
- **现状**: 该文件 615 行，单个 `describe` 覆盖 table renderer 的多个独立 contract：row-scope actions、header/footer/empty regions、styling marker、data-slot marker、row instancePath、row scope reuse、cell form control binding、bare field isolation。
- **风险**: table renderer 是活跃复杂 renderer，后续 row scope、region rendering、styling contract 或 cell form integration 回归都会继续堆到同一文件，向已超过 700 行的 `use-table-controls.test.tsx` 同类测试桶靠拢。
- **建议**: 拆为 `data-table-regions-style.test.tsx`、`data-table-row-scope.test.tsx`、`data-table-instance-path.test.tsx`、`data-table-cell-form-controls.test.tsx`，保留共享 probes 到 test-support。
- **为什么值得现在做**: 该文件与已报告的 table controls 超大测试同属 table 测试增长热点；提前拆分可避免第二个 table 测试文件进入硬阈值。
- **误报排除**: 不是单纯大文件压力；证据显示该文件跨越 renderer region/style contract、runtime instancePath、row scope ownership 和 form binding 多个 owner。
- **历史模式对应**: 对应 `[维度02-01] use-table-controls.test.tsx` 的 table 行为簇拆分模式，但这是不同文件和不同 contract 面。
- **参考文档**: `docs/skills/deep-audit-prompts.md:678-697`, `docs/references/deep-audit-calibration-patterns.md:38-43`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度02-13] `action-adapter.unit.test.ts` 将 built-in、component、namespace 与 formId targeting 全塞进单个 action adapter 测试桶

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\__tests__\action-adapter.unit.test.ts:43-610`
- **行号范围**: 文件总行数 611；证据覆盖 direct built-in branches、component action、namespaced action、formId targeting 多个行为簇。
- **证据片段**:
  ```ts
  describe('createActionRuntimeAdapter direct branches', () => {
    it('covers dialog, drawer, toast, submit, refresh, and unsupported built-in action branches', async () => {
  ...
    it('fails component actions when registry is missing, resolve throws, or no handle exists', async () => {
  ...
    it('fails namespaced actions without action scope or missing handlers and forwards resolved handlers', async () => {
  ...
  describe('formId targeting in built-in actions', () => {
  ```
- **严重程度**: P2
- **现状**: 该文件已达 611 行，处于 500-700 需评估拆分区间。它不是单一 action adapter 分支测试，而是同时覆盖 built-in surface/toast/refresh/ajax、component registry resolution、namespaced action scope、formId setValue/setValues/submitForm targeting。
- **风险**: action runtime adapter 是活跃核心边界，后续新增 built-in action、component targeting 或 namespace 行为时会继续追加到同一文件，形成第二个 runtime action 综合桶，并降低失败定位效率。
- **建议**: 按行为 owner 拆分为 `action-adapter-builtins.test.ts`、`action-adapter-component-actions.test.ts`、`action-adapter-namespaced-actions.test.ts`、`action-adapter-form-targeting.test.ts`。
- **为什么值得现在做**: 拆分点沿现有 describe/it 责任线即可完成，不需要改生产代码；可阻止该文件继续向 700 行硬阈值膨胀。
- **误报排除**: 不是单纯 Large File Pressure；证据显示同一文件跨越四类 action dispatch contract，而不是单一 orchestrator 或单一 fixtures。
- **历史模式对应**: 对应已覆盖的 runtime 综合测试桶拆分模式，但这是尚未报告的 action adapter 单元测试盲区。
- **参考文档**: `docs/skills/deep-audit-prompts.md:678-697`, `docs/references/deep-audit-calibration-patterns.md:38-43`
- **复核状态**: 未复核

### [维度02-14] `field-utils.unit.test.tsx` 同时测试纯 helper、字段 handler、隐藏字段策略、controller adapter 与订阅精度

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\__tests__\field-utils.unit.test.tsx:46-608`
- **行号范围**: 文件总行数 609。
- **证据片段**:
  ```tsx
  describe('field-utils unit helpers', () => {
  ...
  describe('createFieldHandlers', () => {
  ...
  describe('useHiddenFieldPolicy', () => {
  ...
  describe('useFormFieldController adapter behavior', () => {
  ...
  describe('useFieldPresentation subscription precision', () => {
  ```
- **严重程度**: P2
- **现状**: 该文件 609 行，混合了纯函数 validation/presentation helper、事件 handler 行为、hidden owner 通知、`useFormFieldController` adapter.in/out 异步竞态，以及 subscription precision 回归。
- **风险**: `field-utils` 是表单 renderer 的共享底层工具，后续 validation、hidden policy、adapter、订阅精度任一方向的回归测试都会进入同一文件，容易把不同 owner 的变更审查耦合在一起。
- **建议**: 拆分为 `field-utils-validation.test.tsx`、`field-handlers.test.tsx`、`hidden-field-policy-hook.test.tsx`、`form-field-controller-adapter.test.tsx`、`field-presentation-subscription.test.tsx`。
- **为什么值得现在做**: 文件已经超过 500 行且边界非常清晰；拆分可以降低 form renderer 共享工具的回归测试冲突面。
- **误报排除**: 不是因为 609 行本身报告；该文件同时包含纯 helper 单测和 React hook/订阅精度测试，测试层级与职责边界已经混杂。
- **历史模式对应**: 对应综合测试桶按 owner 行为簇拆分的模式，尤其接近已报告的 form submit / validation 类测试桶膨胀。
- **参考文档**: `docs/skills/deep-audit-prompts.md:678-697`, `docs/references/deep-audit-calibration-patterns.md:38-43`
- **复核状态**: 未复核

### [维度02-15] `controller-inspect-advanced.test.ts` 将 debugger inspector 的 authoring contract、DOM scope、component tree、解释器与 formState 混成单文件

- **文件**: `C:\can\nop\nop-chaos-flux\packages\nop-debugger\src\controller-inspect-advanced.test.ts:5-627`
- **行号范围**: 文件总行数 628。
- **证据片段**:
  ```ts
  describe('controller inspector — advanced data', () => {
    it('inspectByCid exposes resolved authoring contract from runtime registry when renderer metadata is available', () => {
  ...
    it('getComponentTree scopes DOM metadata lookup to the active runtime root', () => {
  ...
    it('explains value source, meta causality, failure, and async owners with bounded machine-oriented results', () => {
  ...
    it('fills formState from handle capabilities.store', () => {
  ```
- **严重程度**: P2
- **现状**: 该文件 628 行，名义上是 advanced inspector data，但实际覆盖 authoring contract resolution、runtime-root scoped DOM lookup、component tree projection、node state/debug data fallback、value/meta/failure/async explanation、formState extraction。
- **风险**: debugger controller 的 inspect、tree、explain、form state 能力会继续演进；继续放在同一 advanced 测试桶中，会让不同 debugger 子系统的 fixture 和断言互相堆叠，接近 700 行硬阈值。
- **建议**: 拆分为 `controller-inspect-authoring-contract.test.ts`、`controller-inspect-dom-scope.test.ts`、`controller-component-tree.test.ts`、`controller-explain-node.test.ts`、`controller-inspect-form-state.test.ts`。
- **为什么值得现在做**: 当前已超过 500 行且责任边界与测试名称明显不匹配；按能力拆分能防止 debugger 新能力继续追加到 “advanced data” 桶。
- **误报排除**: 不是仅因大文件报告；该文件已经横跨 inspectByCid、getComponentTree、explainNode\*、formState 多个公开调试能力。
- **历史模式对应**: 对应测试综合桶拆分模式；这是 nop-debugger 包中尚未覆盖的同类二次膨胀风险。
- **参考文档**: `docs/skills/deep-audit-prompts.md:678-697`, `docs/references/deep-audit-calibration-patterns.md:38-43`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度02-16] `request-runtime.test.ts` 同时覆盖纯请求 shaping helper 与异步 executor 去重/重试语义

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\__tests__\request-runtime.test.ts:33-585`
- **行号范围**: 文件总行数 586；证据覆盖 pure helper 与 executor async behavior 两类职责。
- **证据片段**:
  ```ts
  describe('extractScopeData', () => {
    it('returns empty object when includeScope is undefined', () => {
  ...
  describe('prepareApiRequestForExecution', () => {
  ...
  describe('createApiRequestExecutor', () => {
    it('treats different params as distinct requests', async () => {
  ```
- **严重程度**: P2
- **现状**: 文件超过 500 行评估阈值，且把 scope 提取、URL 参数序列化、request adaptor/finalize shaping、executor dedup/retry 行为放在同一个测试文件。
- **风险**: request runtime 是 ajax、submit、data-source 等多路径共享底座；继续追加 case 会让纯 helper 断言和异步并发语义共享同一大文件，增加定位失败与 review 成本。
- **建议**: 拆为 `request-runtime-scope-data.test.ts`、`request-runtime-url-params.test.ts`、`request-runtime-adaptor.test.ts`、`request-runtime-executor.test.ts`。
- **为什么值得现在做**: 当前已进入 500-700 WARN 区间，拆分边界沿现有 `describe` 即可完成。
- **误报排除**: 不是单纯大文件压力；该文件同时覆盖无副作用 pure shaping 与异步 executor 状态/去重行为，职责层级明确不同。
- **历史模式对应**: 对应已覆盖的 runtime 综合测试桶按 owner 行为簇拆分模式。
- **参考文档**: `docs/skills/deep-audit-prompts.md:678-697`, `docs/references/deep-audit-calibration-patterns.md:38-43`
- **复核状态**: 未复核

### [维度02-17] `runtime-scope-actions.test.ts` 将插件排序、scope action、component registry 与 action scope debug 混成单个 runtime 测试桶

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\__tests__\runtime-scope-actions.test.ts:12-555`
- **行号范围**: 文件总行数 556。
- **证据片段**:
  ```ts
  describe('createRendererRuntime', () => {
    it('updates page scope through setValue action', async () => {
  ...
    it('runs plugins by ascending priority and preserves declaration order on ties', () => {
  ...
    it('exposes component registry debug helpers through the public contract', () => {
  ...
    it('resolves namespaced actions through parent action scopes', async () => {
  ```
- **严重程度**: P2
- **现状**: 文件超过 500 行，且同一顶层 `createRendererRuntime` 桶中混合 runtime plugin ordering、page scope setValue/setValues、component handle dispatch/ambiguity/debug、namespaced action scope resolution/debug。
- **风险**: 后续 runtime plugin、component targeting 或 action-scope debug 变更都会继续进入同一文件，导致不同 runtime boundary 的 fixture 和断言互相堆叠。
- **建议**: 拆为 `runtime-scope-actions.test.ts`、`runtime-plugin-ordering.test.ts`、`runtime-component-actions.test.ts`、`runtime-action-scope.test.ts`。
- **为什么值得现在做**: 已超过 500 行且职责边界清晰，拆分能避免 runtime action 测试继续二次膨胀。
- **误报排除**: 不是合理 orchestrator 测试；插件排序、组件句柄注册、命名空间 action scope 是不同 runtime 子模块边界。
- **历史模式对应**: 对应 runtime 综合测试桶拆分模式，区别于已报告的 `action-adapter.unit.test.ts`，这是另一条 runtime scope/action 入口。
- **参考文档**: `docs/skills/deep-audit-prompts.md:678-697`, `docs/references/deep-audit-calibration-patterns.md:38-43`
- **复核状态**: 未复核

### [维度02-18] `hidden-field-policy.test.ts` 同时测试 policy helper、compiler model resolution、runtime validation 与清值生命周期

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\__tests__\hidden-field-policy.test.ts:79-553`
- **行号范围**: 文件总行数 554。
- **证据片段**:
  ```ts
  describe('resolveHiddenFieldPolicy', () => {
  ...
  describe('getCompiledValidationField hiddenFieldPolicy resolution', () => {
  ...
  describe('hidden field validation participation', () => {
  ...
  describe('clearValueWhenHidden behavior', () => {
  ```
- **严重程度**: P2
- **现状**: 文件超过 500 行，并将纯 policy resolution、compiled validation model lookup、runtime hidden validation participation、async cancellation、clearValueWhenHidden、validation-scope owner 行为放在同一测试桶。
- **风险**: hidden field policy 横跨 compiler metadata 与 runtime validation；继续混放会让 form validation 修复难以判断应改 helper、compiled model 还是 runtime owner。
- **建议**: 拆为 `hidden-field-policy-resolution.test.ts`、`hidden-field-validation-participation.test.ts`、`hidden-field-clear-value.test.ts`、`hidden-field-validation-scope-owner.test.ts`。
- **为什么值得现在做**: 文件已进入 WARN 区间，且正处于表单验证核心边界，拆分可降低后续验证规则变更的回归成本。
- **误报排除**: 不是单纯大文件；证据显示 pure helper、compiled metadata 与 runtime lifecycle 三类职责混杂。
- **历史模式对应**: 对应 form validation / runtime owner 测试按职责拆分的模式。
- **参考文档**: `docs/skills/deep-audit-prompts.md:678-697`, `docs/references/deep-audit-calibration-patterns.md:38-43`
- **复核状态**: 未复核

### [维度02-19] `runtime-actions-monitor.test.ts` 将 retry/debounce 控制、refreshSource、API monitor 与 delegated metadata 混在单文件

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\__tests__\runtime-actions-monitor.test.ts:12-561`
- **行号范围**: 文件总行数 562。
- **证据片段**:
  ```ts
  describe('createRendererRuntime', () => {
    it('retries failed actions until one succeeds', async () => {
  ...
    it('returns a failure result when refreshSource cannot resolve a source id', async () => {
  ...
    it('debounces matching actions and cancels superseded executions', async () => {
  ...
    it('emits delegated action monitor metadata for component and namespace dispatch', async () => {
  ```
- **严重程度**: P2
- **现状**: 文件超过 500 行，并把 action retry、debounce cancellation、refreshSource failure、ajax API monitor、params canonicalization monitor、component/namespace delegated monitor 元数据放在一个测试文件。
- **风险**: action control 与 monitor instrumentation 会继续各自扩展；混放会使控制流语义和观测性契约互相耦合，后续回归定位困难。
- **建议**: 拆为 `runtime-action-retry.test.ts`、`runtime-action-debounce.test.ts`、`runtime-refresh-source-action.test.ts`、`runtime-action-monitor.test.ts`、`runtime-delegated-action-monitor.test.ts`。
- **为什么值得现在做**: 已进入 500-700 WARN 区间，且拆分点沿现有 case 族即可完成。
- **误报排除**: 不是重复 `action-adapter.unit.test.ts`；此文件覆盖 monitor/operation-control 集成面，且混入 refreshSource 与 delegated metadata。
- **历史模式对应**: 对应 runtime action 综合测试桶拆分模式。
- **参考文档**: `docs/skills/deep-audit-prompts.md:678-697`, `docs/references/deep-audit-calibration-patterns.md:38-43`
- **复核状态**: 未复核

第 5 轮上限已达，深挖结束。

## 维度复核结论

- [维度02-01] 保留：`pnpm check:oversized-code-files` 当前仍失败，4 个测试文件分别为 779/751/726/718 行，且 grep 显示覆盖 pagination/selection/sort/filter、submit/init/scope、diagnostics/strict/host-action、dialog/drawer/surface 等多职责簇。
- [维度02-02] 保留：`input.tsx` 当前 636 行，仍同时包含 input/select/textarea/checkbox/switch/radio/checkbox-group/input-number renderer 与 definitions 注册，非纯 orchestrator。
- [维度02-03] 保留：`variant-field.tsx` 当前 589 行，live code 仍包含 variant detection、transform action、hidden child paths、child contract、FieldFrame shell 等多职责。
- [维度02-04] 降级：`index.tsx` 当前 120 行且确实内联 renderer definitions/propContracts，但文档“root entry keeps stable schema/manifest registration surface”并不明确禁止 definitions 暴露在入口，故不按 P1 文档-代码违约保留，仅作为入口纯度 P2。
- [维度02-05] 保留：`designer-core.test.ts` 当前 694 行，单个 `describe('createReportDesignerCore')` 覆盖 metadata/history、preview 并发、codec、inspector、field-source 生命周期，距硬阈值 6 行。
- [维度02-06] 保留：`designer-command-adapter.test.ts` 当前 692 行，前段 graph adapter，后段 tree-mode fixture/owner mutation/undo-redo，距硬阈值 8 行。
- [维度02-07] 保留：`context-menu-operations.test.tsx` 当前 678 行，单文件覆盖 clear/fill/structure/merge/freeze/sort/filter/disabled state 多个 spreadsheet operation。
- [维度02-08] 保留：`designer-page.tree.test.tsx` 当前 664 行，tree rendering、graph regression、runtime props、render-phase warning、core continuity 仍混在同一文件。
- [维度02-09] 保留：`array-field.tsx` 当前 573 行，仍包含 item identity、ArrayItem scope/form/validation provider、scalar validation publication、child contract、add/remove 与 shell。
- [维度02-10] 保留：`core-basics.test.ts` 当前 654 行，describe 分组覆盖 core init/selection/cell value/formula/style/merge/resize/hide/sheet/filter/sort 多个 command family。
- [维度02-11] 保留：`word-editor-page-host-scope.test.tsx` 当前 644 行，host scope 外还测试 recovery、window probe、shell marker、renderer manifest metadata。
- [维度02-12] 保留：`data-table.test.tsx` 当前 615 行，单个 table behavior describe 覆盖 row scope、regions/style marker、instancePath、cell form binding 等 contract 面。
- [维度02-13] 保留：`action-adapter.unit.test.ts` 当前 611 行，built-in/component/namespaced/formId targeting 分组仍在同一 action adapter 测试桶。
- [维度02-14] 保留：`field-utils.unit.test.tsx` 当前 609 行，纯 helper、field handlers、hidden policy hook、controller adapter、subscription precision 混合存在。
- [维度02-15] 保留：`controller-inspect-advanced.test.ts` 当前 628 行，inspectByCid、DOM scope、component tree、explainNode、formState 多个 debugger 能力共用单文件。
- [维度02-16] 保留：`request-runtime.test.ts` 当前 586 行，scope/url/data/adaptor shaping 与 async executor dedup/retry 仍混在同一测试文件。
- [维度02-17] 保留：`runtime-scope-actions.test.ts` 当前 556 行，runtime plugin ordering、scope actions、component registry、action-scope debug 仍在单个 createRendererRuntime 桶中。
- [维度02-18] 保留：`hidden-field-policy.test.ts` 当前 554 行，policy resolution、compiled model lookup、runtime validation participation、clearValueWhenHidden、validation-scope owner 混合。
- [维度02-19] 保留：`runtime-actions-monitor.test.ts` 当前 562 行，retry/debounce/refreshSource/API monitor/delegated metadata 仍混在单个 runtime action monitor 测试文件。

需子项复核：P0/P1：[维度02-01]；跨包边界：无；文档-代码违约/不确定项：[维度02-04]；不确定项：[维度02-04]。

## 子项复核结论

- [维度02-01] 保留：live `pnpm check:oversized-code-files` 仍因 4 个 >700 行测试文件失败，且这些文件覆盖多个独立行为簇，命中硬性文件边界规则，最终 P1。
- [维度02-04] 降级：`flow-designer-renderers/src/index.tsx` 确实内联 renderer definitions/propContracts，但 owner 文档只说 root 保留 stable schema/manifest registration surface，并未明确禁止 definitions 位于入口，最终降为 P2 入口纯度/膨胀风险而非 P1 文档违约。

最终进入汇总：[维度02-01] P1；[维度02-04] P2。
