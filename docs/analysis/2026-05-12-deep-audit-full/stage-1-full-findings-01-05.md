# Stage-1 Full Findings: Dimensions 01-05

> 状态：第 1 轮初审条目重建稿。内容来自 live repo 复查，用于补救早期维度文件只保留一句话摘要的问题；最终结论仍需与第 2-5 轮 raw findings 合并后重新独立复核。

## 维度 01：依赖图与分层方向

- **复核结论**: 零发现保留。
- **说明**: 第 1 轮未形成 01-xx 条目，也没有驳回项。

## 维度 02：模块职责与文件边界

### [维度02-01] `node-compiler.ts` 混合多类 compiler responsibilities

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
- **复核结论**: 保留 P2。live 文件行数和职责混合成立。

### [维度02-02] `flow-designer-renderers` root entry 是较厚 registry/config surface

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
- **复核结论**: 降级保留 P3。主要是可维护性问题。

### [维度02-03] `ArrayFieldRenderer` 混合 item identity、runtime projection、validation registration 和 UI

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
- **复核结论**: 保留 P2。

### [维度02-04] Report Designer page renderer 是 report/spreadsheet bridge 可维护性热点

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
- **复核结论**: 降级保留 P3。

## 维度 03：API 表面积与契约一致性

### [维度03-01] `flux-renderers-form` root barrel 暴露低层 field helpers

- **文件**: `packages/flux-renderers-form/src/index.tsx:11-22`
- **证据片段**:
  ```tsx
  export { FormRenderer } from './renderers/form.js';
  export { formRendererDefinition } from './renderers/form-definition.js';
  export {
    createFieldValidation,
    createInputRenderer,
    inputRendererDefinitions,
    validateInputFieldSchema,
  } from './renderers/input.js';
  export * from './renderers/shared/index.js';
  export * from './field-utils.js';
  ```
- **严重程度**: P3
- **现状**: package root 同时导出 renderer definitions、shared renderer internals 和全部 `field-utils`。
- **风险**: 消费者可能依赖 helper internals，使后续实现重构被 public API 冻结。
- **建议**: root 缩窄为 stable renderer registration/schema surface；低层 helpers 移入显式 subpath 或 unstable export。
- **误报排除**: 不是 build/export failure，而是 public API width 问题。
- **复核结论**: 保留 P3。

### [维度03-02] runtime type docs 缺少 exported `subscribeToModelGeneration`

- **文件**: `packages/flux-core/src/types/runtime.ts:79-107`, `318-324`; `packages/flux-runtime/src/form-runtime.ts:217-222`; `docs/references/form-validation-runtime-types.md:215-245`, `288-330`
- **证据片段**:
  ```ts
  export interface FormStoreApi {
    subscribe(listener: () => void): () => void;
    subscribeToPath(path: string, listener: () => void): () => void;
    subscribeToPaths(paths: readonly string[], listener: () => void): () => void;
    subscribeToSubmitting(listener: () => void): () => void;
    subscribeToModelGeneration?(listener: () => void): () => void;
  ...
  export interface ValidationScopeRuntime {
    subscribeToModelGeneration?(listener: () => void): () => void;
  ```
- **严重程度**: P2
- **现状**: core public types 与 runtime 实现存在 `subscribeToModelGeneration`，但 reference doc 的 `ValidationStoreApi`、`FormStoreApi`、`ValidationScopeRuntime` 片段未说明。
- **风险**: public consumers 无法从文档获知 generation subscription contract，可能退回 broad store subscription。
- **建议**: 更新 `docs/references/form-validation-runtime-types.md`，加入并解释 `subscribeToModelGeneration`。
- **误报排除**: live code 显示 public type member，文档片段确实缺失。
- **复核结论**: 保留 P2。

## 维度 04：状态所有权与单一事实来源

### [维度04-01] Spreadsheet editing state 在 renderer local state/ref 与 core snapshot 双轨

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts:12-16`, `31-44`; `packages/spreadsheet-core/src/core/internal-state.ts:10-15`, `29-35`
- **证据片段**:
  ```ts
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const editingCellRef = useRef<{ row: number; col: number } | null>(null);
  const editValueRef = useRef('');
  ...
  const handleEditSave = useCallback(async () => {
    editingCellRef.current = null;
    editValueRef.current = '';
    setEditingCell(null);
    await bridge.dispatch({
  ```
- **严重程度**: P2
- **现状**: renderer 本地持有 active edit cell/value，同时 spreadsheet core snapshot 也有 `editing` 字段。
- **风险**: editing lifecycle 可能分叉，尤其保存时先清 local state 再 dispatch，失败场景容易状态不一致。
- **建议**: 将 editing lifecycle 收敛到 core；或明确 core `editing` 未使用并移除/避免平行 truth。
- **误报排除**: 这不是允许的 report/spreadsheet bridge；同一个 editing 概念在 local renderer 和 core snapshot 双重表示。
- **复核结论**: 保留 P2。

### [维度04-02] Report/spreadsheet dual-core bridge 不是状态所有权缺陷

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:223-244`, `307-337`; `docs/architecture/report-designer/design.md:438-442`
- **证据片段**:
  ```md
  - `document.spreadsheet` 是 report-designer 对外发布、`save` / `exportDocument()` 返回、以及 host scope `spreadsheet.workbook`/`workbook` 投影所共同依赖的 canonical spreadsheet subtree
  - 内部 `spreadsheet-core` 可以维护自己的编辑态与 history store，但支持路径下的 report-owned mutation 必须把同步后的 spreadsheet document 回写到 report document，再由 host projection 读取同一份 canonical snapshot
  - `runtime.dirty` 表示对宿主发布的聚合 dirty，等于 `designer.dirty || spreadsheet.runtime.dirty`
  ```
- **严重程度**: 无
- **现状**: report designer renderer 同时创建 report core 与 spreadsheet core，并将 spreadsheet document 同步回 report document。
- **风险**: 存在维护性/性能风险，但 owner docs 明确支持此 bridge 形态。
- **建议**: 不作为状态所有权违规跟踪；如需跟进，使用更窄的 bridge maintainability/performance 条目。
- **误报排除**: 文档明确区分 internal spreadsheet core 和 canonical `document.spreadsheet`。
- **复核结论**: 驳回。

## 维度 05：响应式订阅精度

### [维度05-01] form field-state 更新会唤醒 form scope data subscribers

- **文件**: `packages/flux-runtime/src/form-runtime.ts:100-129`; `packages/flux-runtime/src/form-runtime-status.ts:61-75`; `packages/flux-runtime/src/form-store.ts:281-297`
- **证据片段**:
  ```ts
  store: {
    getSnapshot: () => store.getState().values,
    getLastChange: () => lastChange,
    subscribe: (listener) => store.subscribe(() => listener(lastChange)),
  ...
  function updateFieldState(path: string, patch: Partial<FieldState>) {
    store.setState({ fieldStates: { ...current, [path]: next } });
    notifyPath(path);
  ```
- **严重程度**: P2
- **现状**: form scope store 的 `getSnapshot` 返回 values，但 `subscribe` 绑定到 broad `store.subscribe`；field-state-only changes 也会触发 scope subscribers。
- **风险**: value selectors 被 touched/dirty/errors/validating 更新唤醒，降低响应式精度。
- **建议**: data-scope selectors 只订阅 value changes；form status/field state 使用独立 channel。
- **误报排除**: `subscribeToPath` 对 form hooks 存在，但 form scope store 本身仍订阅整个 form store。
- **复核结论**: 保留 P2。

### [维度05-02] non-form field scope fallback 缺少 path-scoped subscription

- **文件**: `packages/flux-renderers-form/src/field-utils/field-handlers.tsx:42-59`; `packages/flux-react/src/hooks.ts:96-107`
- **证据片段**:
  ```tsx
  const scopeValue = useScopeSelector(
    (scopeData) => (name ? getIn(scopeData, name) : scopeData),
    eq,
    { enabled: !currentForm, fallback: UNUSED_VALUE },
  );
  ```
- **严重程度**: P3
- **现状**: 非 form fallback selector 只读一个 named path，但未传 `paths: [name]`。
- **风险**: 非 form 上下文的字段值 selector 会被无关 scope changes 唤醒。
- **建议**: 传 `{ enabled: !currentForm, fallback: UNUSED_VALUE, paths: name ? [name] : undefined }`。
- **误报排除**: form 分支已有 form path subscription；本条只针对 scope fallback。
- **复核结论**: 保留 P3。

### [维度05-03] dialog/drawer surface host 使用 whole-scope subscription

- **文件**: `packages/flux-react/src/dialog-host.tsx:79-85`, `168-174`; `packages/flux-react/src/dialog-host-surface.tsx:50-72`
- **证据片段**:
  ```tsx
  export function useSurfaceScopeSnapshot(scope: ScopeRef, paths?: string[]) {
    useSyncExternalStoreWithSelector(
      scope.store?.subscribe ?? (() => () => undefined),
      () => scope.readVisible(),
      (state: unknown) => {
        if (!paths || paths.length === 0) {
          return state;
        }
  ```
- **严重程度**: P3
- **现状**: `DialogView`/`DrawerView` 调用 `useSurfaceScopeSnapshot(props.surface.scope)` 时不传 paths，订阅整个 surface scope。
- **风险**: 无关 scope changes 会通知 surface host views。
- **建议**: 只有 surface-level dependency 需要时才订阅，或从 title/body/action dependency 推导 explicit paths。
- **误报排除**: hook 支持 `paths`，但当前调用点未使用。
- **复核结论**: 降级保留 P3。

### [维度05-04] code editor form mode 仍启用 scope fallback subscription

- **文件**: `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts:18-27`
- **证据片段**:
  ```ts
  const formValue = useCurrentFormState(
    (state) => (hasName ? getIn(state.values, name) : undefined),
    Object.is,
    { enabled: hasName, path: hasName ? name : undefined },
  );
  const scopeValue = useScopeSelector(
    (data) => (hasName ? getIn(data, name) : undefined),
    Object.is,
    { enabled: hasName, fallback: undefined },
  );
  ```
- **严重程度**: P3
- **现状**: 即使 `currentForm` 存在，只要 `hasName` 为 true，scope subscription 仍创建；同时缺少 `paths`。
- **风险**: form-bound code editor 不必要订阅 scope updates；non-form 模式又 broad subscribe。
- **建议**: scope subscription 仅在 `!currentForm && hasName` 时启用，并传 `paths: [name]`。
- **误报排除**: form mode 的值选择最终用 `formValue`，但 unused scope subscription 仍存在。
- **复核结论**: 保留 P3。
