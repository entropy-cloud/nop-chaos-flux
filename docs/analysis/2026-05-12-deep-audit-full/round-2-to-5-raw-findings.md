# Round 2-5 Raw Deep-Dig Findings

> 状态：原始发现归档。该文件用于补救此前维度文件过度压缩的问题，保留第 2-5 轮追加深挖的完整线索。后续需要将这些条目拆回对应维度文件，并追加独立复核/修订意见。

## 记录规则

- 以下条目保持子 agent 输出的可定位信息、证据、风险和建议。
- 任何进入最终报告的条目必须再经过独立复核。
- 维度文件中的一句话表格不能替代本文件的完整发现正文。

## 维度 02：模块职责与文件边界

### [维度02-05] async-data contract 测试文件超过 700 行且混合多类异步子系统契约

- **文件**: `packages/flux-runtime/src/__tests__/async-data-contracts.test.ts:1-756`
- **行号**: `7-16`
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
- **严重程度**: P1
- **现状**: 文件 756 行，超过 >700 强制拆分线；同一测试文件同时覆盖 api-cache、request-runtime、source observer、runtime factory 等异步数据契约。
- **风险**: oversized 检查已失败；后续异步数据修复容易继续把回归用例堆入同一 contract suite，导致测试 owner 不清、局部运行困难。
- **建议**: 拆成 `api-cache-contracts.test.ts`、`request-runtime-contracts.test.ts`、`source-observer-contracts.test.ts` 等 focused suites，保留薄的跨子系统 integration suite。
- **为什么值得现在做**: 当前命令基线里的硬错误；拆分测试不改变运行时代码，风险低且能立即恢复文件边界红线。
- **误报排除**: 命中“大文件压力”校准模式，但这里超过 >700 且实际混合多个 async-data 子模块 contract。
- **历史模式对应**: “先按 owner 切开超大聚合文件”。
- **复核状态**: 未复核。

### [维度02-06] word-editor host-scope 测试文件超过 700 行并内联多套 mock host/store

- **文件**: `packages/word-editor-renderers/src/__tests__/word-editor-page-host-scope.test.tsx:1-732`
- **行号**: `20-28`
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

- **严重程度**: P1
- **现状**: 文件 732 行，超过 >700 强制拆分线；文件内联 core mocks、editor store、dataset store、registry/render 集成测试夹具与多个 host-scope 用例。
- **风险**: host scope、dataset、save/recovery、renderer registry 的测试夹具互相耦合，新增回归时会继续膨胀，单个测试失败时难以定位具体 owner。
- **建议**: 将 mock core/store fixture 提到 `__tests__/word-editor-test-fixtures.tsx`，再按 host projection、host actions、save/recovery 分文件拆分。
- **误报排除**: 测试源也纳入 >700 hard error，且文件确实混合 fixture owner 与多类行为断言。
- **复核状态**: 未复核。

### [维度02-07] `input.tsx` 重新形成表单基础控件聚合文件

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:41-636`
- **行号**: `556-565`
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
- **现状**: 文件 637 行，超过 >500 评估线；同一文件包含 input/select/textarea/checkbox/switch/radio/checkbox group/input-number、多类 source error、number clamp/precision/stepper 逻辑和 definition registry。
- **风险**: 基础表单控件是高频修改区，新增控件或 source/validation 规则会继续把所有控件 owner 堆入一个文件，接近 >700 硬线。
- **建议**: 拆出 `field-validation.ts`、`choice-renderers.tsx`、`input-number-renderer.tsx`、`input-renderer-definitions.ts`。
- **误报排除**: 同时承载 validation factory、source transient error、数值编辑行为和 registry 表，不是单纯多个小组件同文件。
- **复核状态**: 未复核。

### [维度02-08] `variant-field.tsx` 是 ArrayField 同类盲区

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:120-620`
- **行号**: `390-399`
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
- **现状**: 文件 621 行；同时处理 active variant 推断、`detectVariantAction`、`transformInAction`、variant scope/form proxy、projected validation owner、hidden child notification、child contract 注册和 UI。
- **风险**: 变体字段是复合字段 owner，后续 value adaptation / validation owner 修复容易在同一渲染文件继续膨胀。
- **建议**: 提取 `variant-field-controller.ts`、`variant-field-validation-owner.ts`、`variant-field-render-body.tsx`。
- **误报排除**: 直接操作 validation owner hidden state 和 child contract，已越过纯 UI renderer 边界。
- **复核状态**: 未复核。

### [维度02-09] `runtime-factory.ts` 超过 500 行且重新吸入 import prepare/cache/load 逻辑

- **文件**: `packages/flux-runtime/src/runtime-factory.ts:244-312`
- **行号**: `244-253`
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
- **现状**: 文件 590 行；`prepareSchema` 内联 prepared import 加载、module cache pending dedupe、staticMeta 获取和错误包装。
- **风险**: runtime assembly 文件重新成为 import/cache 行为落点，后续 import lifecycle、AbortSignal、prepared import 错误处理会继续在 factory 中膨胀。
- **建议**: 提取 `runtime-schema-preparer.ts` 或并入 import manager focused helper。
- **误报排除**: cache pending、loader 调用和错误包装是具体业务逻辑，不只是组装子模块调用。
- **复核状态**: 未复核。

### [维度02-10] `controller-inspect-advanced.test.ts` 超过硬上限且混合多类 debugger inspector 合同测试

- **文件**: `packages/nop-debugger/src/controller-inspect-advanced.test.ts:10-31`, `:142-169`, `:392-580`, `:628-708`
- **行号**: 当前文件 711 行（>700 必须拆分）
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
- **严重程度**: P1
- **现状**: 单个测试文件同时覆盖 authoring contract、DOM/runtime-root scoping、component tree、node state fallback、explanation API、formState、failure trace 等多类 inspector 合同。
- **风险**: 后续 debugger inspector 变更会继续把不同 owner 的测试追加到同一文件，定位失败用例和 review diff 成本升高。
- **建议**: 拆为 `controller-inspect-authoring-contract.test.ts`、`controller-inspect-runtime-root.test.ts`、`controller-explanations-integration.test.ts`。
- **误报排除**: 同目录已有 `controller-inspect-basic.test.ts`、`explanations.test.ts`，该测试族支持按职责拆分。
- **复核状态**: 未复核。

### [维度02-11] `spreadsheet-grid.tsx` 重新形成 Spreadsheet UI 超级组件边界

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
- **复核状态**: 未复核。

### [维度02-12] `reaction-runtime.ts` 同时拥有 reaction 执行引擎与 registry 生命周期 owner

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
- **复核状态**: 未复核。

### [维度02-13] `import-stack.ts` 混合 import loader/cache、frame install、namespace collision 与 binding projection

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
- **复核状态**: 未复核。

### [维度02-14] stable renderer 直接依赖 `flux-react/unstable` 的 Context 写入口

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
- **复核状态**: 未复核。

### [维度02-15] `flux-renderers-form` 生产包导出测试支撑模块且 import 即改全局 i18n

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
- **复核状态**: 未复核。

### [维度02-16] form renderer 直接依赖 `flux-runtime` 表单状态发布实现

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
- **复核状态**: 未复核。

## 后续归档说明

本文件保留维度 02 的第 2-5 轮原始发现正文。维度 03-06 的追加原始发现已归档到 `raw-findings-03-06.md`，维度 07-20 的追加原始发现已归档到 `raw-findings-07-20.md`。最终逐条复核以 `final-review-results-*.md` 和 `summary.md` 为准。
