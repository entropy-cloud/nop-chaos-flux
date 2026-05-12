# 维度 02：模块职责与文件边界

## 范围与状态

- **维度范围**: 模块职责、文件边界、过厚入口、职责混杂与稳定/不稳定边界。
- **最终状态**: 最终保留 16 项，无驳回项。
- **来源限制**: 本文件仅根据同目录 `stage-1-full-findings-01-05.md`、`round-2-to-5-raw-findings.md`、`raw-findings-03-06.md`、`final-review-results-01-05.md`、`summary.md` 重写。
- **代码检查**: 本次重写未检查运行时代码。

## 深挖轮次与收敛说明

- **第 1 轮**: 初审形成 4 项，独立复核后保留 2 项、降级保留 2 项。
- **第 2-5 轮**: raw findings 追加 `02-05` 到 `02-16`，覆盖测试巨文件、form/renderers、runtime import/reaction、spreadsheet grid、unstable context、test-support 和 form status publication。
- **收敛说明**: `summary.md` 与 `final-review-results-01-05.md` 均说明第 5 轮达到执行上限后进入最终复核，不声称自然收敛。

## 最终复核摘要

- **最终保留**: 16 项。
- **最终 P2**: 14 项。
- **最终 P3**: 2 项。
- **重大修订**: `02-04` 修订为 bridge/sync orchestration 可维护性风险；`02-05`、`02-06`、`02-10` 从 P1 降级为 P2；`02-09` 标题修订为 prepared-import loading/cache preparation；`02-15` 标题修订为 public subpath exposes test support with global side effects。

## 最终保留项

### [02-01] `node-compiler.ts` 混合多类 compiler responsibilities

- **文件**: `packages/flux-compiler/src/schema-compiler/node-compiler.ts:1-58`, `325-342`, `565-753`
- **证据片段**:
  ```ts
  import { compileActions } from '../action-compiler.js';
  import { compileDataSource } from '../source-compiler.js';
  import { compileReaction } from '../reaction-compiler.js';
  ...
  return function compileSingleNode(
  ...
  const fieldInspection = inspectSchemaNodeFields(schema, renderer, path, diagnostics, false);
  const metaProgram = buildMetaProgram(schema, renderer, expressionCompiler);
  const rawLifecycleActions = extractLifecycleActions(schema);
  const deepNormalizers = DEEP_FIELD_NORMALIZERS[renderer.type] ?? {};
  ```
- **严重程度**: P2
- **现状**: 单文件约 757 行，编译 runtime values、fields/regions、events、lifecycle、named actions、imports、validation owner/model plans、data sources、reactions。
- **风险**: 高变更编译路径耦合，修复一个 compile domain 时容易影响无关责任。
- **建议**: 按 runtime-value、field/region、action/import、validation plan、source/reaction attachment 拆分模块。
- **误报排除**: 不是单纯“文件长”；导入和主体逻辑显示多个独立 compiler domain 聚合。
- **最终复核结论**: 保留 P2。`node-compiler.ts` 仍为 757 行并混合 runtime values、fields/regions、events/lifecycle、imports、validation、sources/reactions。
- **修订标题/理由**: 标题、风险、建议维持。

### [02-02] `flow-designer-renderers` root entry 是较厚 registry/config surface

- **文件**: `packages/flow-designer-renderers/src/index.tsx:18-47`, `49-154`
- **证据片段**:
  ```tsx
  function compileDesignerConfig(value: unknown, context: FieldCompileContext): unknown {
    if (Array.isArray(value)) {
      return value.map((item, index) =>
        compileDesignerConfig(item, { ...context, sourcePath: `${context.sourcePath}.${index}` }),
  ...
  export * from './schemas.js';
  export { createDesignerActionProvider } from './designer-action-provider.js';
  export const flowDesignerRendererDefinitions: RendererDefinition[] = [
  ```
- **严重程度**: P3
- **现状**: package root 同时公开 schema/action/manifest surface，并实现 config compilation 与 renderer definitions。
- **风险**: root entry 变成维护热点，stable public surface 与 implementation detail 边界模糊。
- **建议**: root 继续 re-export 稳定 API，但将 `compileDesignerConfig` 和 bulky definitions 移到 dedicated modules。
- **误报排除**: definitions 属当前 stable surface，因此不是 package-boundary 违规。
- **最终复核结论**: 保留 P3。root entry 混合 public exports、config compilation、renderer definitions，但只有 154 行，属于可维护性问题，不是边界违规。
- **修订标题/理由**: 降级保留为 P3，理由是风险集中在维护性。

### [02-03] `ArrayFieldRenderer` 混合 item identity、runtime projection、validation registration 和 UI

- **文件**: `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx:41-90`, `119-142`, `281-299`, `414-548`
- **证据片段**:
  ```tsx
  const itemScope = React.useMemo(
    () => createItemScope(parentScope, arrayPath, index, itemKind, readOnly, itemIdentity),
  ...
  const itemForm = React.useMemo(
    () => (parentForm ? createItemFormProxy(parentForm, arrayPath, index, itemKind) : parentForm),
  ...
  const itemValidationOwner = React.useMemo(() => {
    return createProjectedValidationRuntime(parentValidationOwner, {
      ownerRootPath: `${arrayPath}.${index}`,
  ```
- **严重程度**: P2
- **现状**: 同一 renderer 负责 array key generation、compat identity、projected scopes/forms/validation owners、scalar validation registration/child contracts、mutation handlers 和 JSX。
- **风险**: identity、validation、UI 变更相互干扰，重复子项 ownership 与 validation lifecycle 难以推理。
- **建议**: 提取 identity/reconciliation 与 validation registration 到 hook/runtime helper，renderer 保留 orchestration/UI。
- **误报排除**: live code 显示 runtime、validation、identity、UI 责任均在 573 行模块内，不是样式偏好。
- **最终复核结论**: 保留 P2。`array-field.tsx` 仍混合 identity/keying、projection、validation owners、child contract、mutation、JSX。
- **修订标题/理由**: 标题与理由维持。

### [02-04] Report Designer page renderer concentrates bridge/sync orchestration

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:213-253`, `287-337`; `docs/architecture/report-designer/design.md:438-442`
- **证据片段**:
  ```tsx
  const spreadsheetCore = useMemo(
    () => createSpreadsheetCore({ document: resolvedDocument.spreadsheet }),
  ...
  const spreadsheetBridge = useMemo(
    () => createSpreadsheetBridge(spreadsheetCore),
  ...
  const core = useMemo(
    () => createReportDesignerCore({
      document: resolvedDocument,
  ```
- **严重程度**: P3
- **现状**: page renderer 创建 spreadsheet core/bridge 与 report designer core，注册两个 action namespace，订阅两个 snapshot，并同步 spreadsheet document。
- **风险**: 合法 bridge 逻辑集中在一个 renderer，sync/dirty 语义变更的维护和回归风险上升。
- **建议**: 将 bridge/sync orchestration 提取到 dedicated hook/module，同时保持文档定义的 owner boundary。
- **误报排除**: 不是单一事实源缺陷；架构文档允许 internal spreadsheet core 与 canonical report document 同步。
- **最终复核结论**: 保留 P3。report page renderer 集中 bridge/sync orchestration；架构允许该 owner model，因此仅保留 maintainability 风险。
- **修订标题/理由**: 标题修订为“concentrates bridge/sync orchestration”。

### [02-05] async-data contract 测试文件混合多类异步子系统契约

- **文件**: `packages/flux-runtime/src/__tests__/async-data-contracts.test.ts:1-756`
- **证据片段**:
  ```ts
  import {
    generateCacheKey,
    createApiCacheStore,
    stableStringify,
    resolveCacheKey,
  } from '../async-data/api-cache.js';
  import {
    createApiRequestExecutor,
    executeApiSchema,
    buildUrlWithParams,
  ```
- **严重程度**: P2
- **现状**: 文件约 755-756 行，同时覆盖 api-cache、request-runtime、source observer、runtime factory 等异步数据契约。
- **风险**: 后续异步数据修复容易继续把回归用例堆入同一 contract suite，导致测试 owner 不清、局部运行困难。
- **建议**: 拆成 `api-cache-contracts.test.ts`、`request-runtime-contracts.test.ts`、`source-observer-contracts.test.ts` 等 focused suites，保留薄的跨子系统 integration suite。
- **误报排除**: 命中“大文件压力”校准模式，且实际混合多个 async-data 子模块 contract。
- **最终复核结论**: 降级保留 P2。async-data 测试文件 755 行且混合多个 async 子系统；未复核到自动 hard failure，P1 过高。
- **修订标题/理由**: 从 P1 降级为 P2，保留为文件边界与测试 owner 问题。

### [02-06] word-editor host-scope 测试文件混合多套 mock host/store

- **文件**: `packages/word-editor-renderers/src/__tests__/word-editor-page-host-scope.test.tsx:1-732`
- **证据片段**:

  ```ts
  const mockedCore = vi.hoisted(() => ({
    saveDocumentMock: vi.fn(() => true),
    saveDatasetsMock: vi.fn(),
    loadRecoveredStateMock: vi.fn<() => { document: SavedDocumentData | null; datasets: Dataset[] }>(
      () => ({ document: null, datasets: [] }),
    ),
  }));

  const mockState: {
  ```

- **严重程度**: P2
- **现状**: 文件约 731-732 行，内联 core mocks、editor store、dataset store、registry/render 集成测试夹具与多个 host-scope 用例。
- **风险**: host scope、dataset、save/recovery、renderer registry 的测试夹具互相耦合，新增回归时会继续膨胀，单个测试失败时难以定位具体 owner。
- **建议**: 将 mock core/store fixture 提到 `__tests__/word-editor-test-fixtures.tsx`，再按 host projection、host actions、save/recovery 分文件拆分。
- **误报排除**: 测试源也纳入大文件风险，且文件确实混合 fixture owner 与多类行为断言。
- **最终复核结论**: 降级保留 P2。word-editor host-scope 测试 731 行且 fixture/host/save/recovery 混杂；P1 过高，保留为拆分候选。
- **修订标题/理由**: 从 P1 降级为 P2。

### [02-07] `input.tsx` 重新形成表单基础控件聚合文件

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:41-636`
- **证据片段**:
  ```ts
  export const inputRendererDefinitions: RendererDefinition[] = [
    {
      type: 'input-text',
      component: createInputRenderer('text'),
      fields: [formLabelFieldRule],
      validation: createFieldValidation(),
      wrap: true,
    },
    {
      type: 'input-email',
  ```
- **严重程度**: P2
- **现状**: 文件约 637-653 行，包含 input/select/textarea/checkbox/switch/radio/checkbox group/input-number、多类 source error、number clamp/precision/stepper 逻辑和 definition registry。
- **风险**: 基础表单控件是高频修改区，新增控件或 source/validation 规则会继续把所有控件 owner 堆入一个文件，接近更高风险线。
- **建议**: 拆出 `field-validation.ts`、`choice-renderers.tsx`、`input-number-renderer.tsx`、`input-renderer-definitions.ts`。
- **误报排除**: 同时承载 validation factory、source transient error、数值编辑行为和 registry 表，不是单纯多个小组件同文件。
- **最终复核结论**: 保留 P2。`input.tsx` 653 行，混合多控件、source error、validation factory、number logic、definitions。
- **修订标题/理由**: 标题与方向维持。

### [02-08] `variant-field.tsx` 是 ArrayField 同类盲区

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:120-620`
- **证据片段**:

  ```ts
  React.useLayoutEffect(() => {
    const owner = parentForm ?? parentValidationOwner;

    if (!owner || !name) {
      return;
    }

    for (const hiddenPath of hiddenVariantChildPaths) {
      owner.notifyFieldHidden(`${name}.${hiddenPath}`, true);
    }
  ```

- **严重程度**: P2
- **现状**: 文件约 620-621 行；同时处理 active variant 推断、`detectVariantAction`、`transformInAction`、variant scope/form proxy、projected validation owner、hidden child notification、child contract 注册和 UI。
- **风险**: 变体字段是复合字段 owner，后续 value adaptation / validation owner 修复容易在同一渲染文件继续膨胀。
- **建议**: 提取 `variant-field-controller.ts`、`variant-field-validation-owner.ts`、`variant-field-render-body.tsx`。
- **误报排除**: 直接操作 validation owner hidden state 和 child contract，已越过纯 UI renderer 边界。
- **最终复核结论**: 保留 P2。`variant-field.tsx` 620 行，混合 variant detection、transform、projection、hidden notifications、child contract、UI。
- **修订标题/理由**: 标题与方向维持。

### [02-09] `runtime-factory.ts` 吸收 prepared-import loading/cache preparation

- **文件**: `packages/flux-runtime/src/runtime-factory.ts:244-312`
- **证据片段**:

  ```ts
  async prepareSchema(schema, options) {
    const prepare = schemaCompiler.prepare;
    if (!prepare) {
      return { preparedImports: new Map() };
    }

    const result = await prepare(schema, {
      schemaUrl: options?.schemaUrl,
      importLoader: getEnv().importLoader,
      resolveImportUrl: getEnv().resolveImportUrl,
  ```

- **严重程度**: P2
- **现状**: 文件约 590 行；`prepareSchema` 内联 prepared import 加载、module cache pending dedupe、staticMeta 获取和错误包装。
- **风险**: runtime assembly 文件重新成为 import/cache 行为落点，后续 import lifecycle、AbortSignal、prepared import 错误处理会继续在 factory 中膨胀。
- **建议**: 提取 `runtime-schema-preparer.ts` 或并入 import manager focused helper。
- **误报排除**: cache pending、loader 调用和错误包装是具体业务逻辑，不只是组装子模块调用。
- **最终复核结论**: 保留 P2。`runtime-factory.ts` 仍吸收 prepared-import loading/cache/staticMeta/error wrapping。
- **修订标题/理由**: 标题修订为 prepared-import loading/cache preparation。

### [02-10] `controller-inspect-advanced.test.ts` 混合多类 debugger inspector 合同测试

- **文件**: `packages/nop-debugger/src/controller-inspect-advanced.test.ts:10-31`, `142-169`, `392-580`, `628-708`
- **证据片段**:
  ```ts
  10:   it('inspectByCid exposes resolved authoring contract from runtime registry when renderer metadata is available', () => {
  ...
  142:   it('inspectByCid scopes DOM lookup to the active runtime root', () => {
  ...
  392:   it('explains value source, meta causality, failure, and async owners with bounded machine-oriented results', () => {
  ...
  628:   it('explains button-triggered request aborts from the node interaction trace', () => {
  ```
- **严重程度**: P2
- **现状**: 单个测试文件约 710-711 行，同时覆盖 authoring contract、DOM/runtime-root scoping、component tree、node state fallback、explanation API、formState、failure trace 等多类 inspector 合同。
- **风险**: 后续 debugger inspector 变更会继续把不同 owner 的测试追加到同一文件，定位失败用例和 review diff 成本升高。
- **建议**: 拆为 `controller-inspect-authoring-contract.test.ts`、`controller-inspect-runtime-root.test.ts`、`controller-explanations-integration.test.ts`。
- **误报排除**: 同目录已有 `controller-inspect-basic.test.ts`、`explanations.test.ts`，该测试族支持按职责拆分。
- **最终复核结论**: 降级保留 P2。debugger advanced inspect 测试 710 行并混合多类 inspector contracts；P1 过高。
- **修订标题/理由**: 从 P1 降级为 P2。

### [02-11] `spreadsheet-grid.tsx` 重新形成 Spreadsheet UI 超级组件边界

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`
- **证据片段**:
  ```tsx
  function renderCell(r: number, c: number) {
    const addr = cellAddress(r, c);
    const cell = snapshot.activeSheet?.cells?.[addr];
    const isSelected = selectedCell?.row === r && selectedCell?.col === c;
    const inRange = isInRange(r, c);
    const hasComment = !!cell?.comment;
    const hasBinding = getCellMetadata ? getCellMetadata(r, c) : undefined;
    const isFrozenCell = frozen && (r < (frozen.row ?? 0) || c < (frozen.col ?? 0));
  ```
- **严重程度**: P2
- **现状**: 598 行单文件承担 viewport/virtual scroll、selection/keyboard navigation、cell rendering/editing、mouse drag/fill/field drop、headers resize、context menu capability gate。
- **风险**: 冻结窗格、虚拟滚动、键盘编辑、拖拽填充或 context menu 变更都会冲突在同一文件。
- **建议**: 拆出 `use-spreadsheet-viewport.ts`、`use-spreadsheet-keyboard.ts`、`spreadsheet-cell.tsx`、`spreadsheet-headers.tsx`。
- **误报排除**: 已有 `spreadsheet-grid/` 子目录但主体仍集中多个 owner。
- **最终复核结论**: 保留 P2。`spreadsheet-grid.tsx` 598 行，集中 viewport、headers、selection keyboard、render/edit、drag/fill/drop、context menu。
- **修订标题/理由**: 标题与方向维持。

### [02-12] `reaction-runtime.ts` 同时拥有 reaction 执行引擎与 registry 生命周期 owner

- **文件**: `packages/flux-runtime/src/async-data/reaction-runtime.ts`
- **证据片段**:
  ```ts
  export function createRuntimeReactionRegistry(args: {
    runtime: RendererRuntime;
    executeActions: ExecuteReactionActions;
    reporter?: RuntimeIssueReporter;
  }): RuntimeReactionRegistry {
    const buckets = new Map<string, Map<string, ReactionRegistration>>();
  ```
- **严重程度**: P2
- **现状**: 593 行单文件包含单个 reaction 的 watch/when/debounce/cascade/dispatch/error/debug/dispose 状态机，也包含按 scope bucket 注册/替换、owner cleanup、debug snapshot、scope tree disposal 的 registry owner。
- **风险**: registry scope ownership/cleanup 与单个 reaction 调度/执行/cascade 混在一起，async governance、debug snapshot、dispose 改动互相影响。
- **建议**: 拆为 `reaction-runner.ts`、`reaction-registry.ts`，`reaction-runtime.ts` 保留 public factory/types。
- **误报排除**: `reaction-runtime-helpers.ts` 已拆出 helper，但核心执行状态机与 registry owner 仍混合。
- **最终复核结论**: 保留 P2。`reaction-runtime.ts` 同时含单 reaction state machine 与 registry lifecycle/debug/disposal owner。
- **修订标题/理由**: 标题与方向维持。

### [02-13] `import-stack.ts` 混合 import loader/cache、frame install、namespace collision 与 binding projection

- **文件**: `packages/flux-runtime/src/import-stack.ts`
- **证据片段**:
  ```ts
  async push(imports, scope, options = {}) {
    const normalized = normalizeImportSpecs(imports, options.schemaUrl, resolveImportUrl);
    const context = buildImportContext(scope, normalized);
    const loaded: ImportModule[] = [];
    const pushed: ImportStackFrame[] = [];
  ```
- **严重程度**: P2
- **现状**: 510 行单文件同时处理 import spec normalize/resolve/key、module cache pending load/preload、async push、prepared install、namespace collision、release/abort rollback、alias resolution 与 `$alias` binding projection。
- **风险**: `push()` 与 `installPrepared()` 存在大量重复 alias/collision/context/register/release 逻辑，后续修复 import lifecycle 或 prepared import contract 时容易双路径漂移。
- **建议**: 拆为 `import-loader.ts`、`import-frame-installer.ts`、`import-bindings.ts`。
- **误报排除**: 不是已列 02-09 runtime factory；这里是 import stack 内部职责混合。
- **最终复核结论**: 保留 P2。`import-stack.ts` 混合 normalize/load/cache、frame install、collision、rollback、alias binding。
- **修订标题/理由**: 标题与方向维持。

### [02-14] stable renderer 直接依赖 `flux-react/unstable` 的 Context 写入口

- **文件**: `packages/flux-renderers-basic/src/loop.tsx:1-15`, `58-62`, `107-142`
- **证据片段**:
  ```tsx
  import { useRenderInstancePath } from '@nop-chaos/flux-react';
  import { StructuralLoopContext } from '@nop-chaos/flux-react/unstable';
  ```
  ```tsx
  return (
    <StructuralLoopContext.Provider value={contextValue}>
      {props.children}
    </StructuralLoopContext.Provider>
  );
  ```
- **严重程度**: P2
- **现状**: `flux-renderers-basic` 是稳定 renderer 包，但 `loop.tsx` 直接从 `@nop-chaos/flux-react/unstable` 拿 `StructuralLoopContext` 并手写 Provider。
- **风险**: 稳定 renderer 绑定 `flux-react` 内部 Context 形状；后续 Context 改名、拆分或 Provider 语义调整时，稳定 renderer 静默破裂。
- **建议**: 在 `flux-react` 提供稳定 `StructuralLoopProvider` 或 helper，renderer 只消费稳定 API。
- **误报排除**: 问题不在自建 React Context，而在稳定包直接写入 unstable Context。
- **最终复核结论**: 保留 P2。stable renderer `loop.tsx` 直接写入 `flux-react/unstable` 的 `StructuralLoopContext`。
- **修订标题/理由**: 建议稳定 provider/helper。

### [02-15] public subpath exposes test support with global side effects

- **文件**: `packages/flux-renderers-form/package.json:16-22`; `packages/flux-renderers-form/src/test-support.tsx:1-24`
- **证据片段**:
  ```json
  "./test-support": {
    "types": "./dist/test-support.d.ts",
    "default": "./dist/test-support.js"
  }
  ```
  ```tsx
  import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
  resetFluxI18n();
  initFluxI18n({ lng: 'en-US', fallbackLng: 'en-US' });
  ```
- **严重程度**: P2
- **现状**: `./test-support` 被作为包级 export 暴露；模块顶层导入 Testing Library、DOM polyfill，并重置/初始化全局 i18n。
- **风险**: 测试支撑逻辑进入生产包导出面，任意 import 会触发全局 i18n reset，造成测试间污染或运行时副作用。
- **建议**: 迁移到专用测试工具包或内部测试路径；若跨包共享，建立 `@nop-chaos/test-support-*` 包，避免顶层全局初始化。
- **误报排除**: 主要服务内部测试，但从模块职责和文件边界看，生产包公开面与测试支撑混杂。
- **最终复核结论**: 保留 P2。form package public subpath 暴露 test support，且 import 会引入 Testing Library 和全局 i18n reset/init。
- **修订标题/理由**: 标题修订为“public subpath exposes test support with global side effects”。

### [02-16] form renderer 直接依赖 `flux-runtime` 表单状态发布实现

- **文件**: `packages/flux-renderers-form/src/renderers/form-status-publication.ts:1-5`, `22-28`, `42-53`
- **证据片段**:
  ```ts
  import { buildFormStatusSummary, publishOwnerStatus } from '@nop-chaos/flux-runtime';
  ```
  ```ts
  function publishStatus() {
    const summary = buildFormStatusSummary(
      ownedForm.store.getState(),
      ownedForm.id,
      ownedForm.name,
      ownedForm.getScopeState().validating ? 1 : 0,
    );
  ```
- **严重程度**: P2
- **现状**: React hook 直接导入 runtime 的 `buildFormStatusSummary` / `publishOwnerStatus`，并访问 `ownedForm.store.getState()`、`ownedForm.getScopeState()` 组装状态。
- **风险**: renderer 层承担运行时状态汇总与发布细节，runtime/form lifecycle 语义被 React hook 分叉实现。
- **建议**: 下沉为 runtime 或 flux-react 的稳定 helper，renderer 不直接组合 runtime 状态发布流程。
- **误报排除**: 不是非法深路径 import；问题是职责边界上 renderer 正在组合 runtime 状态发布流程。
- **最终复核结论**: 保留 P2。form renderer hook 直接组合 runtime form status summary/publication 细节，属责任边界泄漏。
- **修订标题/理由**: 标题与方向维持。

## 驳回项

无。
