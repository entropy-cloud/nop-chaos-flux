# 维度 02：模块职责与文件边界

## 第 1 轮（初审）

本轮只输出初审线索，不作复核结论。已按要求先阅读共享前缀文档与 owner 文档，并使用主 agent 提供的 `pnpm check:oversized-code-files` 基线；未手工重跑全仓行数统计。

### [维度02-01] `runtime-factory.ts` 作为装配层继续承载非平凡 import/cache/作用域实现逻辑

- **文件**: `packages/flux-runtime/src/runtime-factory.ts:258-330`
- **证据片段**:

  ```ts
  async prepareSchema(schema, options) {
    const prepare = schemaCompiler.prepare;
    if (!prepare) {
      return { preparedImports: new Map() };
    }

    const result = await prepare(schema, {
      schemaUrl: options?.schemaUrl,
      signal: options?.signal,
      importLoader: getEnv().importLoader,
  ```

- **严重程度**: P1
- **现状**: owner 文档明确规定 `runtime-factory.ts` 是 runtime assembly 层，应限制为 wiring / top-level factory composition；但当前文件内仍直接实现 `ModuleCache`、prepared import 加载/缓存/错误包装、child scope 创建、surface scope 创建、dispose 顺序等非平凡逻辑。
- **风险**: runtime 装配层会继续吸入 import lifecycle、scope lifecycle、surface scope normalization 等实现细节，后续修改 import/cache 或 scope 语义时容易绕过 `imports.ts` / `import-stack.ts` / `scope.ts` 等 focused owner。
- **建议**: 将 `createModuleCache` 与 prepared import hydration 提取到 `runtime-import-preparation.ts` 或并入 import manager 相关模块；将 surface opening scope 构造提取为 runtime-owned helper，`runtime-factory.ts` 只保留调用和依赖注入。
- **为什么值得现在做**: 该文件已在 warning top offenders 内且是 owner 文档点名的主装配层；继续膨胀会直接削弱 runtime boundary 文档的约束力。
- **误报排除**: 这不是单纯“>500 行”问题；证据显示该文件含有 async import loading/cache mutation/error wrapping 等实现逻辑，而 owner 文档要求“非 trivial assembly code move to focused runtime module”。
- **历史模式对应**: 对应“入口/装配层二次吸入实现细节”的重构模式，类似历史上从 `flux-core/src/index.ts`、`schema-compiler.ts` 中拆出 focused modules 的经验。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度02-02] `form-store.ts` 同时实现 FormStore、PageStore、SurfaceStore 三个 store owner

- **文件**: `packages/flux-runtime/src/form-store.ts:149-160,498-525`
- **证据片段**:
  ```ts
  export function createFormStore(initialValues: Record<string, any>): FormStoreApi {
    const store = createStore<InternalFormStoreState>(() => ({
      values: initialValues,
      fieldStates: {},
      submitting: false,
      submitAttempted: false,
      summary: {
        ...emptySummary(),
      },
    }));
  ```
  ```ts
  export function createPageStore(initialData: Record<string, any>): PageStoreApi {
    const store = createStore<PageStoreState>(() => ({
      data: initialData,
      refreshTick: 0,
    }));
  ```
- **严重程度**: P2
- **现状**: 单个 `form-store.ts` 文件承载复杂 form path subscription / field summary diff / submit state，同时还包含 page store 和 surface store 的独立实现。
- **风险**: form store 的高复杂度会掩盖 page/surface store 的独立生命周期语义；后续 surface 或 page store 变更容易被误归入 form runtime 维护面，扩大文件职责边界。
- **建议**: 拆为 `form-store.ts`、`page-store.ts`、`surface-store.ts`，保留当前 API re-export 或通过 focused imports 更新调用点。
- **为什么值得现在做**: 这是明确的多 owner 混放，不依赖行数本身；拆分成本低，能立即改善 runtime store boundary。
- **误报排除**: owner 文档虽把 `form-store.ts` 描述为 form/page/surface store state updates，但当前 v1 口径下不应继续保留这种 broad file owner；三类 store 没有共享实现闭包，天然可分离。
- **历史模式对应**: 对应“按 runtime owner 分文件，而不是以历史文件名容纳多个 store owner”的边界收敛模式。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度02-03] `node-compiler.ts` 在 schema-compiler 已拆分后继续聚合单节点编译的多类实现细节

- **文件**: `packages/flux-compiler/src/schema-compiler/node-compiler.ts:175-190,521-553,576-646`
- **证据片段**:
  ```ts
  return function compileSingleNode(
    schema: BaseSchema,
    options: CompileNodeOptions,
    diagnostics: SchemaCompilerDiagnosticsContext,
    depth: number,
  ): TemplateNode {
    const renderer = options.renderer;
    const path = options.path;
    const fieldInspection = inspectSchemaNodeFields(schema, renderer, path, diagnostics, false);
    const metaProgram = buildMetaProgram(schema, renderer, expressionCompiler);
  ```
- **严重程度**: P2
- **现状**: 文件内同时处理 imports symbol table、lazy eval、region compilation、custom field compile failure node、deep field nested regions、event/lifecycle action compilation、class aliases、provider plan、validation owner plan、named action plans、static analysis、data-source/reaction artifacts。
- **风险**: schema compiler 的 focused submodules 已存在，但单节点编译仍是“二级大入口”；新增 renderer compilation feature 时容易继续塞入 `compileSingleNode`，导致 compiler boundary 难以局部测试和替换。
- **建议**: 优先提取低耦合块：`compile-node-imports.ts`、`compile-node-actions.ts`、`compile-node-validation-plan.ts`、`compile-node-artifacts.ts`；保留 `node-compiler.ts` 为编排层。
- **为什么值得现在做**: 该文件已接近 hard gate，且属于已拆分后的二次膨胀，不是首次大文件。
- **误报排除**: 不是 parser/visitor 这类天然集中算法；当前文件已经依赖多个 focused helper，说明边界已形成，只是 node-level glue 又承载了过多具体分支。
- **历史模式对应**: 对应“第一轮提取后不要继续按行数拆，但若重新吸入实现细节则处理二次膨胀”的历史教训。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/architecture/flux-core.md`
- **复核状态**: 未复核

### [维度02-04] `report-designer-renderers/src/page-renderer.tsx` 同时承担 renderer、host bridge、spreadsheet sync、panel shell 与默认业务行为

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:282-335,448-481,584-623`
- **证据片段**:

  ```tsx
  export function ReportDesignerPageRenderer(
    props: RendererComponentProps<ReportDesignerPageSchema>,
  ) {
    const titleContent = resolveRendererSlotContent(props, 'title');
    const env = useRendererEnv();
    const documentInputValid = hasValidReportTemplateDocument(props.props.document);
  ```

  ```tsx
  useEffect(() => {
    const nextReportSpreadsheet = snapshot.document.spreadsheet;

    if (nextReportSpreadsheet === lastAppliedReportSpreadsheetRef.current) {
      return;
    }
  ```

- **严重程度**: P2
- **现状**: 单个 renderer 文件内包含 prop resolution、invalid prop host reporting、report/spreadsheet core creation、namespace registration、双向 spreadsheet sync、status publication、panel frame UI、默认 field insert 行为和 WorkbenchShell 组装。
- **风险**: report designer 与 spreadsheet bridge 的生命周期耦合藏在 renderer JSX 文件内，后续调整 core bridge、host action provider 或面板 UX 时会互相影响；renderer 文件也更难遵守“组件只做 renderer contract glue”的边界。
- **建议**: 提取 `useReportDesignerPageRuntime`（core/provider/init/dispose）、`useReportSpreadsheetSync`、`report-designer-panel-slots.tsx`，保留 renderer 文件为 props/slots 到 `WorkbenchShell` 的薄组装。
- **为什么值得现在做**: 这是 top warning 中的生产文件，且包含跨 domain bridge（report + spreadsheet）与 UI shell 多职责，不是单纯大 JSX。
- **误报排除**: calibration pattern 允许 report -> spreadsheet 复用本身；本发现不指责依赖关系，而是指出同一 renderer 文件承载 bridge lifecycle 与 panel implementation 的文件边界问题。
- **历史模式对应**: 对应“复杂 renderer 拆出 controller hook / panel primitives / bridge helpers”的 renderer implementation 收敛模式。
- **参考文档**: `docs/architecture/report-designer/design.md`; `docs/architecture/renderer-runtime.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度02-05] `action-execution.ts` 在 action dispatcher 子目录内继续聚合控制流、监控、错误通知、debounce/retry/timeout 与分支执行

- **文件**: `packages/flux-action-core/src/action-dispatcher/action-execution.ts:208-242,388-489,491-638`
- **证据片段**:
  ```ts
  async function runParallelActions(
    ctx: ActionDispatcherContext,
    action: CompiledActionNode,
    actionCtx: ActionContext,
    startedAt: number,
    actionPayload: ActionMonitorPayload,
  ): Promise<ActionResult | undefined> {
  ```
  ```ts
  async function runSingleActionWithRetry(
    ctx: ActionDispatcherContext,
    action: CompiledActionNode,
    actionCtx: ActionContext,
  ): Promise<ActionResult> {
    if (isRequestBackedAction(action)) {
  ```
- **严重程度**: P2
- **现状**: 文件已拆在 `action-dispatcher/` 下，但仍把 parallel、single action routing、debounce、retry、timeout、branch `then/onError/onSettled`、monitor start/end、unhandled failure notification、dispatcher lifecycle 放在同一个实现文件。
- **风险**: action algebra 语义与 execution control 语义继续混在一起；后续修改 retry/timeout 或 branch failure handling 时容易产生交叉回归。
- **建议**: 提取 `action-control-execution.ts`（debounce/retry/timeout/abort merge）、`action-branch-flow.ts`（then/onError/onSettled）、`action-monitoring.ts`（monitor/error notification），`action-execution.ts` 保留主 dispatch loop。
- **为什么值得现在做**: 文件已是 top warning 生产文件，且 action dispatcher 是跨 runtime 核心路径；拆分能降低分支语义与控制语义互相污染。
- **误报排除**: 不是把 action dispatcher 作为 orchestrator 直接判错；问题在于已经存在 `operation-control.ts`、`action-runners.ts` 等 focused modules 后，剩余文件仍包含多个可独立 owner 的实现块。
- **历史模式对应**: 对应“核心控制流文件在第一轮拆分后仍需按语义轴继续收口”的二次膨胀模式。
- **参考文档**: `docs/architecture/action-algebra-formal-spec.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

## 工具基线摘要

- 使用主 agent 提供的 `pnpm check:oversized-code-files` 基线。
- 当前基线：0 errors，93 warnings >500 lines。
- 无 >700 hard error；本轮未把“超过 500 行”本身作为人工发现。
- 本轮重点复核的生产 top warnings 包括：`packages/report-designer-renderers/src/page-renderer.tsx`、`packages/spreadsheet-renderers/src/spreadsheet-manifest.ts`、`packages/flux-action-core/src/action-dispatcher/action-execution.ts`、`packages/flux-compiler/src/schema-compiler/node-compiler.ts`、`packages/flux-runtime/src/form-runtime-owner.ts`、`packages/flux-runtime/src/runtime-factory.ts`、`packages/flux-runtime/src/form-runtime.ts`、`packages/flux-runtime/src/form-runtime-validation.ts`、`packages/flux-runtime/src/form-store.ts`、`packages/flux-runtime/src/import-stack.ts`、`packages/flux-formula/src/parser.ts`、`packages/flow-designer-core/src/core.ts`、`packages/flux-runtime/src/scope.ts`、`packages/flux-renderers-data/src/tree-renderer.tsx`。

## 入口文件问题清单

- `packages/flux-runtime/src/index.ts`: 11 行，纯 re-export；未发现入口实现泄露。
- `packages/flux-core/src/index.ts`: 纯 barrel；导出面较宽，但属于 core stable surface，维度 02 未单独报告。
- `packages/flux-react/src/index.tsx`: 纯 re-export；导出项较多，适合维度 03 API surface 继续评估。
- `packages/report-designer-renderers/src/index.ts`: 存在 `import './report-field-panel.css';` side-effect import；本轮仅列为入口注意项，未判为缺陷。
- `packages/spreadsheet-renderers/src/index.ts`: 纯 re-export；未发现入口实现逻辑。
- `packages/flow-designer-renderers/src/index.tsx`: 存在 `import './designer-theme.css';` side-effect import；本轮仅列为入口注意项，未判为缺陷。

## 目录结构建议

- `packages/flux-runtime/src/`: 顶层文件数量偏高，建议继续把 store、form-owner、runtime assembly 相关 focused modules 分组到子目录。
- `packages/flux-compiler/src/schema-compiler/`: 已有拆分基础，建议继续将 `node-compiler.ts` 的 node-level plan 构建按 imports/actions/validation/artifacts 分层。
- `packages/report-designer-renderers/src/`: 建议将 page renderer 相关 hook/panel/sync helper 放入 `page-renderer/` 子目录，避免单文件继续承载 WorkbenchShell + bridge lifecycle。
- `packages/spreadsheet-renderers/src/`: `spreadsheet-manifest.ts` 虽未作为发现报告，但可考虑按 manifest shapes / method contracts / host contract 拆分，降低后续能力扩展冲突。

## 文档-代码偏离清单

- `docs/architecture/flux-runtime-module-boundaries.md` 对 `runtime-factory.ts` 的约束是“main assembly layer，非 trivial assembly 移到 focused runtime module”；当前 `runtime-factory.ts` 仍含 prepared import loading/cache/error wrapping 等实现逻辑。见 `[维度02-01]`。
- `docs/architecture/flux-runtime-module-boundaries.md` 将 `form-store.ts` 标为 form/page/surface store state updates；当前代码确实如此，但这本身暴露出 owner 文档继续认可 broad file owner。见 `[维度02-02]`。
- owner 文档列出了大量 `schema-compiler/` focused modules，但未明确记录 `schema-compiler/node-compiler.ts` 的当前职责边界；当前该文件已成为单节点编译二级大入口。见 `[维度02-03]`。

## 待基线确认项

- 本轮未重跑 `pnpm check:oversized-code-files`，完全使用主 agent 提供的 0 errors / 93 warnings 基线。
- 入口导出项数量未通过脚本精确计数；仅人工阅读代表性 `index.ts(x)`，维度 03 可继续做 API 表面积精查。
- `spreadsheet-manifest.ts`、`parser.ts`、`scope.ts`、`tree-renderer.tsx`、`flow-designer-core/src/core.ts` 当前更像 coherent manifest/parser/scope/widget/core orchestrator；本轮未保留为发现，建议复核阶段确认是否需要降为“无行动项”。

## 深挖第 2 轮追加

### [维度02-06] `import-stack.ts` 同时承担 import 模块加载缓存、namespace provider 创建、action-scope 注册和 frame 栈管理

- **文件**: `packages/flux-runtime/src/import-stack.ts:96-138,235-349,376-512`
- **证据片段**:
  ```ts
  async function loadModule(input: {
    moduleCache: ModuleCache;
    getLoader: () => import('@nop-chaos/flux-core').ImportedLibraryLoader | undefined;
    spec: XuiImportSpec;
    signal?: AbortSignal;
  }): Promise<ImportedLibraryModule> {
    const loader = input.getLoader();
  ```
  ```ts
  const provider = await module.createNamespace(context);
  expressionHelpers = module.createExpressionHelpers
    ? await module.createExpressionHelpers(context)
    : undefined;
  wrappedProvider = {
    ...provider,
    kind: provider.kind ?? 'import',
  };
  ```
- **严重程度**: P2
- **现状**: owner 文档把 `imports.ts` 标为 import-module load dedupe / imported namespace lifecycle / expression-helper publication，把 `import-stack.ts` 标为 frame lifecycle、alias visibility、push/pop 与 expression binding resolution。但当前 `import-stack.ts` 实际还实现了 module cache pending dedupe、loader 调用、namespace provider 创建、expression helper 创建、action-scope 注册/释放、prepared 与 async install 两套大段重复流程。
- **风险**: import subsystem 的“加载缓存 owner”和“frame 栈 owner”继续混在同一文件，后续修改 prepared import、loader cancellation、namespace collision 或 action-scope lifecycle 时容易绕过 `imports.ts` 的 refcount/manager 语义，也会继续放大 `runtime-factory.ts` 已暴露的 import assembly 膨胀问题。
- **建议**: 将 module load/cache/pending 逻辑提取为 `import-module-loader.ts`；将 async `push` 与 sync `installPrepared` 的共用 alias/collision/context/provider wrapping 流程提取为 `import-frame-installer.ts`；保留 `import-stack.ts` 只负责 frame map、ordered stack、alias resolution、bindings 和 pop/dispose。
- **误报排除**: 不是单纯因为 581 行。当前代码与 owner 文档的职责拆分出现实际偏离：`imports.ts` 只有 refcount manager，而真正的 load dedupe 与 namespace creation 位于 `import-stack.ts`。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度02-07] `form-runtime-owner.ts` 在 owner-validation helper 拆分后仍聚合值写入、外部错误、依赖重验、全量遍历与子树验证

- **文件**: `packages/flux-runtime/src/form-runtime-owner.ts:120-190,229-338,340-553`
- **证据片段**:

  ```ts
  async function applyChangesAndRevalidate(
    inputValue: ApplyScopeChangesInput,
  ): Promise<FormValidationResult> {
    if (input.sharedState.lifecycleState === 'disposed') {
      return createLifecycleBlockedValidationResult();
    }

    const { writes, changedPaths, reason } = inputValue;
  ```

  ```ts
  async function validateForm(reason?: ValidationReason, options?: { signal?: AbortSignal }) {
    if (reason === 'submit' || reason === 'commit') {
      supersedeLowerPriorityWork();
    }

    let currentValidation = input.getCurrentValidation();
  ```

- **严重程度**: P2
- **现状**: 文件名是 `form-runtime-owner`，且已有 `form-runtime-owner-external-errors.ts`、`form-runtime-owner-lifecycle.ts`、`form-runtime-validation.ts`、`form-runtime-values.ts`、`form-runtime-subtree.ts` 等 focused modules；但该文件仍直接实现 owner-local 值写入、外部错误清理/重建、dependent revalidation、full traversal validation、runtime child registration traversal、side-effect error preservation、subtree fallback validation 和 scope summary cache。
- **风险**: `FormRuntime` 的 owner substrate 会继续成为“验证大中台”而不是编排层。后续修改外部错误、subtree target、runtime registration 或 submit/commit supersession 时容易在该文件内互相耦合，导致本应可独立测试的 owner 子语义发生交叉回归。
- **建议**: 保留 `form-runtime-owner.ts` 为 owner API façade；进一步提取 `form-runtime-owner-change-apply.ts`（writes + external-error clearing + dependent trigger）、`form-runtime-owner-full-validation.ts`（validateForm traversal/preserve/merge）、`form-runtime-owner-subtree-validation.ts`（validateSubtree fallback）和 `form-runtime-owner-summary.ts`（scope summary cache）。
- **误报排除**: owner 文档确实给了该文件较宽职责，但 live code 已显示多个 focused helper 已存在，剩余文件仍保留多段可独立 owner 的实现逻辑，而非简单 glue。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/architecture/form-validation.md`
- **复核状态**: 未复核

### [维度02-08] `form-runtime-validation.ts` 将 compiled rule 执行、runtime registration 校验、debounce/abort 治理和 subtree 遍历放在同一验证执行文件

- **文件**: `packages/flux-runtime/src/form-runtime-validation.ts:140-182,184-258,260-488,490-605`
- **证据片段**:
  ```ts
  export function waitForValidationDebounce(
    sharedState: FormRuntimeValidationState,
    path: string,
    debounce: number | undefined,
    runId: number,
    reason?: ValidationReason,
  ): Promise<boolean> {
  ```
  ```ts
  async function validateCompiledField(
    sharedState: FormRuntimeValidationState,
    path: string,
    field: CompiledFormValidationField,
    reason?: ValidationReason,
    options?: { signal?: AbortSignal },
  ): Promise<ValidationResult> {
  ```
- **严重程度**: P2
- **现状**: 单文件同时处理 lifecycle wait、debounce cancellation、AbortController registry、async governance begin/settle、compiled sync/async rule execution、runtime registration root/child validation、hidden-field policy、external error overlay、subtree-by-node traversal 与 runtime target fallback。
- **风险**: 验证执行核心会把“执行一个 compiled field rule”和“调度/取消/治理一次 owner validation run”混成一个维护面。后续修改 async debounce、runtime registration validation 或 subtree traversal 时，需要理解整条验证运行栈，测试定位成本偏高。
- **建议**: 拆出 `form-validation-run-control.ts`（debounce/abort/async-governance/lifecycle wait）、`form-runtime-registration-validation.ts`（runtime root/child validate）、`compiled-field-validation.ts`（compiled rule execution + error overlay）和 `form-subtree-validation-execution.ts`（node/runtime target traversal）。
- **误报排除**: 这不是“验证执行天然复杂”本身；问题在于执行、运行治理、runtime registration adapter、subtree traversal 四条变化轴被放在同一个文件内。
- **参考文档**: `docs/architecture/form-validation.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度02-09] `flow-designer-core/src/core.ts` 在纯 graph core 中继续承载 workbench shell 状态与 tree-mode sidecar owner

- **文件**: `packages/flow-designer-core/src/core.ts:60-84,225-235,376-430,433-462`
- **证据片段**:

  ```ts
  let treeOwner:
    | { getTreeDocument: () => TreeDocument; setTreeDocument: (document: TreeDocument) => void }
    | undefined;
  const listeners = new Set<(event: DesignerEvent) => void>();

  let historyState: DesignerHistoryState = createHistoryState(doc, 0);
  ```

  ```ts
  function togglePalette(): void {
    shellControls.togglePalette();
  }

  function setPaletteCollapsed(collapsed: boolean): void {
    shellControls.setPaletteCollapsed(collapsed);
  }
  ```

- **严重程度**: P2
- **现状**: `flow-designer-core` 设计文档定位为纯图运行时，核心 owner 是 graph document、node/edge、history、selection、layout、serialization、validation 与 graph actions；但当前 `core.ts` 除 graph doc/history/selection 外，还直接持有 tree-mode sidecar document owner、palette/inspector/grid/viewport shell control façade、dirty/save/restore 双文档基线和 viewport reset 发布。
- **风险**: 纯 graph core 与 workbench shell/树模式 bridge 的边界会继续模糊。后续 tree mode、palette/inspector UX 或 canvas viewport 行为变更可能需要改动 graph core 主文件，削弱 core 作为可复用纯领域运行时的边界。
- **建议**: 将 tree-mode sidecar 与 saved-tree baseline 提取为 `tree-document-owner.ts`；将 palette/inspector/grid/viewport façade 与 dirty/save/restore shell publication 收敛到 `designer-shell-controller.ts`；`core.ts` 只保留 graph document core composition 和公开 façade 委托。
- **误报排除**: 不是把 core orchestrator 大文件直接判错；问题在于当前 owner 文档强调纯 graph runtime，而 live core 文件仍直接持有非 graph 的 workbench shell 与 tree sidecar 状态。
- **参考文档**: `docs/architecture/flow-designer/design.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度02-10] `form-runtime.ts` 在 focused helper 已存在后仍承载 scope adapter、外部发布与字段写入实现细节

- **文件+行号**: `packages/flux-runtime/src/form-runtime.ts:239-287,520-559`
- **证据片段**:

  ```ts
  function setupExternalPublication() {
    const parentScope = inputValue.parentScope;
    const { statusPath, valuesPath } = inputValue;

    if (!parentScope || (!statusPath && !valuesPath)) {
      return;
    }

    let lastStatusSummary: import('@nop-chaos/flux-core').FormStatusSummary | undefined;
  ```

  ```ts
  setValue(name, value) {
    if (sharedState.lifecycleState === 'disposed') return;

    validationRuns.set(name, (validationRuns.get(name) ?? 0) + 1);
    cancelValidationDebounce(sharedState, name);

    const state = store.getState();
    const baseline = initialFieldState.initialValues[name];
  ```

- **严重程度**: P2
- **现状**: `form-runtime.ts` 已引入 `form-runtime-status.ts`、`form-runtime-field-ops.ts`、`form-runtime-values.ts`、`form-runtime-array-ops.ts` 等 focused modules，但仍在主 runtime 文件内直接实现外部 status/values 发布、scope store adapter、`clearErrors`、`setValue` 的 dirty patch、external error rebuild 与 dependent revalidation。
- **风险**: `FormRuntime` façade 会继续吸入字段写入、外部发布和验证触发细节，后续修改 statusPath、valuesPath、external error 或 dependent validation 时容易绕过已有 focused owner，形成二次膨胀。
- **建议**: 将 `setupExternalPublication` 收敛到 `form-runtime-status.ts`；将 `setValue`/`clearErrors` 的剩余实现提取到 `form-runtime-field-ops.ts` 或 `form-runtime-values.ts`；`form-runtime.ts` 仅保留 runtime object 组装与委托。
- **误报排除**: 这不是重复报告 `[维度02-07] form-runtime-owner.ts`；本条针对 `FormRuntime` 主 façade 自身仍保留字段写入和外部发布实现，而非 owner-validation helper。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/architecture/form-validation.md`
- **复核状态**: 未复核

### [维度02-11] `runtime-owned-factories.ts` 的 factory 文件直接实现 page runtime store/sync 语义

- **文件+行号**: `packages/flux-runtime/src/runtime-owned-factories.ts:182-229`
- **证据片段**:
  ```ts
  function createPageRuntime(data: Record<string, any> = {}): PageRuntime {
    const externalPageStore = input.pageStore;
    const initialData = externalPageStore?.getState().data ?? data;
    const validationStore = createFormStore(initialData);
    const pageValidation = input.createValidationScopeRuntime({
      id: 'page-root-validation',
      scopePath: '$page',
      initialValues: initialData,
  ```
  ```ts
  const pageStore: PageStoreApi = {
    getState() {
      return {
        data: validationStore.getState().values,
        refreshTick,
      };
    },
  ```
- **严重程度**: P2
- **现状**: `runtime-owned-factories.ts` 名义上应提供 runtime-owned resource factories，但当前 `createPageRuntime` 在该文件内直接构造 page validation store、实现 `PageStoreApi`、维护 `refreshTick` 与外部 page store 双向同步接线；而 owner 文档将 `page-runtime.ts` 定位为 page runtime creation 与 page-shell state。
- **风险**: page runtime 的 store 语义和 validation-owner bootstrapping 被藏在 factory 文件中，后续调整 page store、refresh、root validation owner 或外部 pageStore 同步时容易绕过 `page-runtime.ts`，削弱 page runtime 边界。
- **建议**: 将 page store/validation-owner assembly 提取到 `page-runtime.ts` 或 `page-runtime-factory.ts`，`runtime-owned-factories.ts` 只负责注入 env、登记 owned sets、统一 dispose。
- **误报排除**: 不是因为文件超过阈值；该文件本身不大。问题是 factory 文件承载了 page runtime 状态实现，与 owner 文档中 page runtime 的职责锚点发生偏移。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度02-12] `word-editor-core/src/document-io.ts` 同时承担文档编解码、Canvas bridge 快照读取、本地持久化与 dataset 恢复

- **文件+行号**: `packages/word-editor-core/src/document-io.ts:1-12,337-390,436-543`
- **证据片段**:

  ```ts
  import type { CanvasEditorBridge } from './canvas-editor-bridge.js';
  import type { PaperSettings } from './paper-settings.js';
  import type { WordDocument } from './template-model.js';
  import type { Dataset } from './dataset-model.js';
  import type { DocChart } from './chart-model.js';
  import type { DocCode } from './code-model.js';
  import type { WordEditorElement } from './canvas-editor-types.js';
  import { createDataColumn, createDataset, validateDataset } from './dataset-model.js';
  import { createDocChart, validateDocChart } from './chart-model.js';
  import { createDocCode, validateDocCode } from './code-model.js';
  ```

  ```ts
  export function captureDocumentSnapshot(
    bridge: CanvasEditorBridge,
    options?: { paperSettings?: PaperSettings | null },
  ): SavedDocumentData {
    let value: ReturnType<CanvasEditorBridge['getValue']>;
    let paperSettings: ReturnType<CanvasEditorBridge['getPaperSettings']>;
  ```

  ```ts
  export function saveDatasets(datasets: Dataset[]): void {
    getStorage()?.setItem(DATASET_STORAGE_KEY, JSON.stringify(datasets));
  }

  export function normalizeDataset(value: unknown): Dataset | null {
  ```

- **严重程度**: P2
- **现状**: `document-io.ts` 名义上是 Word 文档 IO，但当前同时包含 CanvasEditorBridge 读取、SavedDocumentData 构造、localStorage document/dataset 持久化、恢复错误上报、dataset normalization、chart/code tag extraction 等多条职责轴。
- **风险**: 纯文档编解码、浏览器持久化和 canvas bridge runtime 边界混在一起；后续调整 SSR 安全、恢复策略、dataset 持久化或 canvas snapshot 语义时，容易让 core IO 文件继续吸入 renderer/runtime 集成细节。
- **建议**: 拆为 `document-codec.ts`（normalize/create/extract）、`document-persistence.ts`（localStorage save/load/clear/recovery errors）、`dataset-persistence.ts`，并将 `captureDocumentSnapshot(bridge)` 移入 `canvas-document-snapshot.ts` 或 bridge-adapter 文件；`document-io.ts` 仅保留兼容 re-export。
- **误报排除**: 这不是单纯 543 行问题；owner 文档已区分 `document-io.ts`、`dataset-store.ts`、`canvas-editor-bridge.ts`，而 live 文件实际跨越 bridge runtime、browser persistence、dataset model 与 persisted envelope 多个 owner。
- **参考文档**: `docs/architecture/word-editor/design.md`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度02-13] 通用 `code-editor` 的 SQL 状态 hook 内嵌 Report 专用执行端点

- **文件+行号**: `packages/flux-code-editor/src/code-editor-renderer/use-sql-editor-state.ts:186-204`
- **证据片段**:

  ```ts
  const executeAction = sqlConfig.execution.executeAction;
  const executionParams = buildExecutionParams(props, sqlConfig.execution.params);

  let result: ActionResult;
  if (executeAction) {
    const action = mergeExecutionData(executeAction, sqlText, executionParams);
    result = await props.helpers.dispatch(action, { signal: abortController.signal });
  } else {
    const action: ActionSchema = {
      action: 'ajax',
      args: {
        url: '/api/report/execSql',
  ```

- **严重程度**: P2
- **现状**: `flux-code-editor` 文档定位为字段级 CodeMirror 组件，不拥有平台级宿主/bridge/session 协议；但当前 SQL execution hook 在未提供 `executeAction` 时直接内嵌 `/api/report/execSql` 默认后端端点，把 report/domain-specific 执行语义放进通用 editor package。
- **风险**: 通用 code editor 被任意业务包复用时会携带 report 后端假设；后续调整 report SQL 执行 API、权限、参数格式或禁用默认执行时，需要改动字段级编辑器内部 hook，导致 code-editor 与 report/domain transport 边界耦合。
- **建议**: 将默认 SQL 执行端点移出 `flux-code-editor`：要求 `sqlConfig.execution.executeAction` 显式提供，或通过宿主/应用层注入 executor；`use-sql-editor-state.ts` 只负责编辑器内 UI 状态、abort/request-id 与结果展示映射。
- **误报排除**: 这不是反对 code-editor 支持 SQL execution preview；文档允许 SQL execution 作为组件内 feature state。问题是通用组件内硬编码 report 专用 `/api/report/execSql` transport，超出了字段级组件职责。
- **参考文档**: `docs/components/code-editor/design.md`
- **复核状态**: 未复核

## 深挖第 6 轮追加

### [维度02-14] standalone `spreadsheet-renderers` 内置 Report 字段拖拽语义

- **文件+行号**: `packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts:14-19,281-288`; `packages/spreadsheet-renderers/src/spreadsheet-grid/types.ts:47-51`
- **证据片段**:
  ```ts
  import {
    useComments,
    useFieldDrop,
    useKeyboard,
    useMouseUpBinding,
    useCellValueSync,
    useSpreadsheetShell,
  } from './spreadsheet-interactions/index.js';
  ```
  ```ts
  const {
    dropTargetCell,
    setDropTargetCell,
    dropTargetCellRef,
    handleFieldDrop,
    handleFieldDragOver,
    handleFieldDragLeave,
  } = useFieldDrop(selectionCell, readOnly);
  ```
  ```ts
  dropTargetCell: { row: number; col: number } | null;
  draggingField: unknown;
  getCellMetadata?: (row: number, col: number) => unknown;
  onFieldDragOver?: (row: number, col: number) => void;
  onFieldDragLeave?: () => void;
  ```
- **严重程度**: P2
- **现状**: 通用 `spreadsheet-renderers` 的交互聚合 hook 和 grid props 已直接包含 `fieldDrop`、`draggingField`、`getCellMetadata` 等字段/metadata 拖拽扩展点；而 Report Designer 文档明确将字段面板与字段拖拽定义为 `Report Designer` 可选能力，不属于 standalone spreadsheet 内建部分。
- **风险**: standalone spreadsheet 的公共交互模型会持续吸入 Report Designer 语义。后续字段面板、metadata 高亮、drop rollback、designer command 等逻辑扩展时，容易继续改动 spreadsheet 通用层，削弱 `spreadsheet-core/renderers` 与 `report-designer-renderers` 的职责边界。
- **建议**: 将 `useFieldDrop`、`draggingField`、`getCellMetadata` 相关 props 收敛到 report-designer 适配层，例如提供 `ReportSpreadsheetGrid`/adapter wrapper；通用 `SpreadsheetGrid` 只保留 spreadsheet 原生选择、编辑、结构操作和可复用低层 drag-over primitive。
- **误报排除**: 这不是反对 Report Designer 复用 spreadsheet grid；问题在于复用方向应由 report adapter 包装通用 grid，而不是让通用 spreadsheet 交互 API 直接暴露字段/metadata 领域名词。
- **参考文档**: `docs/architecture/report-designer/design.md`
- **复核状态**: 未复核

## 深挖第 7 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- `[维度02-01]`: 保留（P1）。`packages/flux-runtime/src/runtime-factory.ts` live code 仍直接实现 `createModuleCache`、`prepareSchema` import 加载/缓存/错误包装、child scope 创建；与 runtime boundary 文档中 assembly 层只做 wiring 的约束不一致。
- `[维度02-02]`: 降级（P3）。`packages/flux-runtime/src/form-store.ts` 确实同时含 form/page/surface store，但 `flux-runtime-module-boundaries.md` 当前也明确把三者列为该文件职责，属于边界收敛建议而非 live 违约。
- `[维度02-03]`: 保留（P2）。`packages/flux-compiler/src/schema-compiler/node-compiler.ts` live code 仍集中处理 imports、lazy eval、regions、events/lifecycle actions、validation plan、artifacts 等，且 compiler docs 已存在 focused modules。
- `[维度02-04]`: 保留（P2）。`packages/report-designer-renderers/src/page-renderer.tsx` live code 同时创建 report/spreadsheet core、注册 namespace、做双向 spreadsheet sync、status 发布和 panel/default UI，跨越 renderer shell 与 bridge lifecycle。
- `[维度02-05]`: 保留（P2）。`packages/flux-action-core/src/action-dispatcher/action-execution.ts` live code 仍聚合 parallel、debounce/retry/timeout、branch、monitor/error notification 与 dispatch loop，虽在 action-dispatcher 内但已超过单一执行编排面。
- `[维度02-06]`: 保留（P2）。`packages/flux-runtime/src/import-stack.ts` live code 实现 module load/cache pending、namespace/expression helper 创建和 action-scope 注册，而文档把 load dedupe/namespace lifecycle 标给 `imports.ts`。
- `[维度02-07]`: 保留（P2）。`packages/flux-runtime/src/form-runtime-owner.ts` live code 在已有 external-errors/lifecycle/subtree/validation helpers 后仍承载 change apply、dependent revalidation、full traversal、subtree fallback 与 summary cache。
- `[维度02-08]`: 降级（P3）。`packages/flux-runtime/src/form-runtime-validation.ts` 确实含 debounce/abort、compiled rule、runtime registration、subtree traversal，但 runtime boundary 文档当前也把这些归为该文件的 validation orchestration 职责。
- `[维度02-09]`: 降级（P3）。`packages/flow-designer-core/src/core.ts` 确有 treeOwner、shellControls、save/restore/viewport facade；但 flow docs 同时把 toggleGrid/save/restore 和 Tree Mode 同 core baseline 写入当前职责，原 P2 违约力度不足。
- `[维度02-10]`: 降级（P3）。`packages/flux-runtime/src/form-runtime.ts` 仍有 external publication、clearErrors、setValue 实现，但文档也把 ordinary value writes/form specialization 放在该文件，主要是进一步瘦 facade 的改善项。
- `[维度02-11]`: 保留（P2）。`packages/flux-runtime/src/runtime-owned-factories.ts` live `createPageRuntime` 直接构造 page validation store、PageStoreApi、refreshTick 与外部 store sync，而 docs 将 page runtime creation/page-shell state 锚定到 `page-runtime.ts`。
- `[维度02-12]`: 保留（P2）。`packages/word-editor-core/src/document-io.ts` live code 同时含 codec、Canvas bridge snapshot、localStorage document/dataset persistence、recovery error 与 dataset normalization，超出 word docs 对 `document-io.ts` 的 serialization/deserialization 定位。
- `[维度02-13]`: 保留（P2）。`packages/flux-code-editor/src/code-editor-renderer/use-sql-editor-state.ts` live fallback 硬编码 `/api/report/execSql`，与 code-editor 文档“字段级组件、不拥有平台/host transport 协议”冲突。
- `[维度02-14]`: 保留（P2）。`packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts` 与 `spreadsheet-grid/types.ts` live API 暴露 `useFieldDrop`、`draggingField`、`getCellMetadata`，而 report docs 明确字段面板/字段拖拽不属于 standalone spreadsheet 内建部分。

## 子项复核建议

- 必须逐项复核：`[维度02-01]`、`[维度02-03]`、`[维度02-04]`、`[维度02-05]`、`[维度02-06]`、`[维度02-07]`、`[维度02-11]`、`[维度02-12]`、`[维度02-13]`、`[维度02-14]`。
- 争议/降级后若要驱动改代码仍需复核：`[维度02-02]`、`[维度02-08]`、`[维度02-09]`、`[维度02-10]`。

## 子项复核结论

- `[维度02-01]`: 子项复核通过（P1）。`runtime-factory.ts` 仍直接实现 module cache、prepared import 加载/缓存/错误包装和 scope 创建，超出 docs 对 assembly 层的薄装配约束。
- `[维度02-02]`: 降级（P3）。`form-store.ts` 仍混放 form/page/surface store，但 live boundary 文档当前也明确把三者列为该文件职责。
- `[维度02-03]`: 子项复核通过（P2）。`node-compiler.ts` 仍集中处理 imports、actions、regions、validation plan 与 artifacts，属于 compiler 子模块拆分后的二级聚合点。
- `[维度02-04]`: 子项复核通过（P2）。`report-designer` page renderer 仍同时承载 renderer shell、report/spreadsheet bridge lifecycle、sync 与默认面板行为。
- `[维度02-05]`: 子项复核通过（P2）。`action-execution.ts` 仍聚合 parallel、retry/timeout、branch、monitor/error notification 与主 dispatch loop。
- `[维度02-06]`: 子项复核通过（P2）。`import-stack.ts` 仍实现 module load/cache、namespace provider 创建和 action-scope 注册，而 docs 将 load dedupe/namespace lifecycle 锚定到 import 模块职责。
- `[维度02-07]`: 子项复核通过（P2）。`form-runtime-owner.ts` 在已有 focused helpers 后仍承载 change apply、dependent revalidation、full traversal/subtree fallback 与 summary cache。
- `[维度02-08]`: 降级（P3）。`form-runtime-validation.ts` 的职责确实很宽，但 live docs 当前也把 debounce、subtree validation 和 field validation orchestration 归入该文件。
- `[维度02-09]`: 降级（P3）。`flow-designer-core/src/core.ts` 仍含 shell/tree sidecar 状态，但 flow docs 同时把 toggleGrid/save/restore 与部分 shell baseline 写入当前 core 能力。
- `[维度02-10]`: 降级（P3）。`form-runtime.ts` 仍有 external publication、clearErrors、setValue 实现，但 boundary 文档当前也把 ordinary value writes/form specialization 放在该文件。
- `[维度02-11]`: 子项复核通过（P2）。`runtime-owned-factories.ts` 仍直接实现 `createPageRuntime` 的 validation store、`PageStoreApi`、refreshTick 与外部 store sync，而 docs 将 page runtime creation 锚定到 `page-runtime.ts`。
- `[维度02-12]`: 子项复核通过（P2）。`word-editor-core/document-io.ts` 仍跨越文档 codec、Canvas bridge snapshot、localStorage persistence 与 dataset normalization，超出 word docs 的 serialization/deserialization 定位。
- `[维度02-13]`: 子项复核通过（P2）。通用 `code-editor` SQL fallback 仍硬编码 `/api/report/execSql`，与组件文档“不拥有平台/host transport 协议”冲突。
- `[维度02-14]`: 子项复核通过（P2）。standalone `spreadsheet-renderers` 仍暴露 `useFieldDrop`、`draggingField`、`getCellMetadata` 等 Report 字段/metadata 语义。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                                                                                             | 摘要                                                                                                                                             |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 维度02-01 | P1       | `packages/flux-runtime/src/runtime-factory.ts`                                                                                       | `runtime-factory.ts` 仍直接实现 module cache、prepared import 加载/缓存/错误包装和 scope 创建。                                                  |
| 维度02-02 | P3       | `packages/flux-runtime/src/form-store.ts`                                                                                            | `form-store.ts` 仍混放 form/page/surface store，但 live boundary 文档当前也列为该文件职责。                                                      |
| 维度02-03 | P2       | `packages/flux-compiler/src/schema-compiler/node-compiler.ts`                                                                        | `node-compiler.ts` 仍集中处理 imports、actions、regions、validation plan 与 artifacts。                                                          |
| 维度02-04 | P2       | `packages/report-designer-renderers/src/page-renderer.tsx`                                                                           | Report Designer page renderer 仍同时承载 renderer shell、bridge lifecycle、sync 与默认面板行为。                                                 |
| 维度02-05 | P2       | `packages/flux-action-core/src/action-dispatcher/action-execution.ts`                                                                | `action-execution.ts` 仍聚合 parallel、retry/timeout、branch、monitor/error notification 与 dispatch loop。                                      |
| 维度02-06 | P2       | `packages/flux-runtime/src/import-stack.ts`                                                                                          | `import-stack.ts` 仍实现 module load/cache、namespace provider 创建和 action-scope 注册。                                                        |
| 维度02-07 | P2       | `packages/flux-runtime/src/form-runtime-owner.ts`                                                                                    | `form-runtime-owner.ts` 在已有 focused helpers 后仍承载 change apply、dependent revalidation、full traversal/subtree fallback 与 summary cache。 |
| 维度02-08 | P3       | `packages/flux-runtime/src/form-runtime-validation.ts`                                                                               | `form-runtime-validation.ts` 职责较宽，但 live docs 当前也归入该文件。                                                                           |
| 维度02-09 | P3       | `packages/flow-designer-core/src/core.ts`                                                                                            | `flow-designer-core/src/core.ts` 仍含 shell/tree sidecar 状态，但 flow docs 当前也写入部分 core 能力。                                           |
| 维度02-10 | P3       | `packages/flux-runtime/src/form-runtime.ts`                                                                                          | `form-runtime.ts` 仍有 external publication、clearErrors、setValue 实现，但 boundary 文档当前也归入该文件。                                      |
| 维度02-11 | P2       | `packages/flux-runtime/src/runtime-owned-factories.ts`                                                                               | `runtime-owned-factories.ts` 仍直接实现 `createPageRuntime` 的 validation store、`PageStoreApi`、refreshTick 与外部 store sync。                 |
| 维度02-12 | P2       | `packages/word-editor-core/src/document-io.ts`                                                                                       | `document-io.ts` 仍跨越文档 codec、Canvas bridge snapshot、localStorage persistence 与 dataset normalization。                                   |
| 维度02-13 | P2       | `packages/flux-code-editor/src/code-editor-renderer/use-sql-editor-state.ts`                                                         | 通用 `code-editor` SQL fallback 仍硬编码 `/api/report/execSql`。                                                                                 |
| 维度02-14 | P2       | `packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts`; `packages/spreadsheet-renderers/src/spreadsheet-grid/types.ts` | standalone `spreadsheet-renderers` 仍暴露 Report 字段/metadata 语义。                                                                            |
