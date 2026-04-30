# Clean-Slate Composite Value Owner Design

## Purpose

本文档定义一个“如果完全重新开始”的运行时设计，用于统一支撑以下低代码控件：

- `form`
- `dialog` / `drawer`
- `tabs`
- `wizard`
- `object-field`
- `variant-field`
- `array-field`
- `detail-view`
- `table`
- `input-text`

目标是：

- 性能高
- 内存占用小
- owner 边界清晰
- runtime graph 清晰
- 值获取、校验、提交规则一致

本文档优先使用伪代码描述运行时与控件行为。只有伪代码不足以说明边界时，才补充解释文字。

## Position

- `docs/architecture/frontend-programming-model.md` 仍拥有顶层 primitive / owner / runtime precedence。
- `docs/architecture/renderer-runtime.md` 仍拥有 React renderer/runtime integration precedence。
- `docs/architecture/form-validation.md` 仍拥有 validation owner 抽象与规则优先级。
- 本文档只定义从零设计时，composite value owners 与 repeated table owners 的统一运行时基线。

## Core Claim

从零设计时，不应把上述控件分别做成 5 套独立 runtime。

也不应把它们压成一个“大一统中心 runtime”。

推荐做法是：

1. `RendererRuntime` 持有共享 runtime substrate
2. `PageRuntime` / `FormRuntime` / `SurfaceRuntime` 等 concrete runtime 在其上创建
3. composite controls 复用同一套 value/validation/ui/surface substrate
4. 真正的运行时结构是一张 owner/runtime graph，而不是一个全局状态平面

行为上仍按 owner 模式区分：

1. inline live-edit owner
2. surface-backed staged owner
3. collection owner

映射关系：

- `form` -> submit-oriented `FormRuntime`
- `dialog` / `drawer` -> `SurfaceRuntime` + per-entry runtime boundary
- `tabs` -> page/form-local UI owner with explicit mount/validation policy
- `wizard` -> staged step owner on top of `FormRuntime`
- `object-field` -> inline live-edit owner
- `variant-field` -> inline live-edit owner
- `array-field` -> inline live-edit owner + collection owner
- `detail-view` -> surface-backed staged owner
- `table` -> collection owner；editable table 再叠加 field/value owner
- `input-text` -> leaf field bound to nearest value + validation runtime

## Naming Alignment

从零设计时，命名应尽量贴近仓库现有体系。

推荐规则：

1. `owner` 用于架构语义和 family 分类，例如 `surface owner`、`validation owner`、`inline owner`
2. `*Runtime` 用于 concrete runtime instance，例如 `PageRuntime`、`FormRuntime`、`SurfaceRuntime`、`ValidationScopeRuntime`
3. `*StoreApi` / `*StoreState` 用于 store contract
4. `*Entry` 用于 stack/cache/projected records，例如 `SurfaceEntry`、`TableRowEntry`
5. 不要把 `PageOwner`、`FormOwner`、`RowSession`、`TabOwner` 这类名字直接提升成 public contract，除非它们真的形成新的 owner family 和 runtime boundary

本文档中的少量 `ownerId` / `uiOwnerId` 仅表示“owner 归属键”，不是建议新增同名 public runtime type。

## Runtime Graph

理想模型不是：

```ts
OneRuntimeForEverything;
```

而是：

```ts
RendererRuntime
  -> PageRuntime
    -> FormRuntime
    -> SurfaceRuntime (shared host for opened entries)
    -> local owner-scoped value/validation/ui bindings
```

或者在具体场景里：

```ts
RendererRuntime
  -> PageRuntime
    -> FormRuntime(profile)
      -> object-field(profile)
      -> array-field(lineItems)
      -> table(lineItems)
    -> SurfaceRuntime
      -> SurfaceEntry(dialog-1)
        -> ValidationScopeRuntime(detail draft)
```

关键点：

- `RendererRuntime` 是 shared infrastructure host
- `PageRuntime` / `FormRuntime` / `SurfaceRuntime` 是 concrete runtime boundary
- `object-field` / `variant-field` / `array-field` 默认不额外创建新的 form runtime
- `detail-view` 打开时才创建 staged draft runtime boundary
- table row 级失效属于 table owner 的局部 runtime 规则，不应变成新的全局 family

## Runtime Substrate

从零设计时，共享 substrate 至少按 4 个域分开。

```ts
interface CompositeRuntimeSubstrate {
  valueScopes: ValueScopeStore;
  validationRuntimes: ValidationRuntimeRegistry;
  uiState: UiStateStore;
  surfaceRuntime: SurfaceRuntime;
}
```

说明：

- 这是 `RendererRuntime` 持有的 shared substrate，不是作者可见的新大一统 runtime
- `SurfaceRuntime` 继续沿用现有命名，而不是引入新的 `SurfaceManager` public type

## Immutable Data And Structural Sharing

React 风格的不可变更新并不要求对整棵值树做 deep clone。

从零设计时，应明确拒绝“每次写值都深拷贝整个对象/数组”的实现。

推荐基线：

1. 值更新使用 path-based structural sharing
2. 只复制被修改路径上的祖先节点
3. 未变化分支保持旧引用复用
4. staged edit 优先使用 overlay/patch，而不是打开时 deep clone

最小伪代码：

```ts
function writeWithStructuralSharing(
  root: unknown,
  path: string[],
  nextLeafValue: unknown,
): unknown {
  if (path.length === 0) {
    return nextLeafValue;
  }

  const [head, ...rest] = path;
  const current = isContainer(root) ? root : createContainerForKey(head);
  const currentChild = current[head];
  const nextChild = writeWithStructuralSharing(currentChild, rest, nextLeafValue);

  if (Object.is(nextChild, currentChild)) {
    return current;
  }

  const nextContainer = Array.isArray(current) ? current.slice() : { ...current };
  nextContainer[head] = nextChild;
  return nextContainer;
}
```

拒绝基线：

```ts
function badWrite(root: unknown, path: string[], nextLeafValue: unknown): unknown {
  const cloned = deepClone(root);
  setIn(cloned, path, nextLeafValue);
  return cloned;
}
```

原因：

1. 大对象编辑会放大内存峰值
2. 高频输入会放大 GC 压力
3. 未变化分支引用全部失效，破坏 selector/memo 命中
4. repeated row/item 的局部复用会明显变差

### `detail-view` Rule

`detail-view` 打开时不应 deep clone 整个对象。

推荐：

```ts
interface DraftOverlayScope {
  baseValue: unknown;
  patch: Record<string, unknown>;
}

function writeDraftPatch(scope: DraftOverlayScope, path: string, nextValue: unknown) {
  scope.patch = writeWithStructuralSharing(scope.patch, splitPath(path), nextValue);
}
```

规则：

1. open 时保留 `baseValue` 引用
2. 编辑时只累积 patch
3. confirm 时再 materialize final value
4. cancel 时只丢弃 patch

### `array-field` And `table` Rule

数组和表格热点路径也不应 deep clone 全集合。

推荐：

```ts
function updateArrayObjectField(
  root: unknown,
  arrayPath: string,
  sourceIndex: number,
  childPath: string,
  nextValue: unknown,
) {
  return writeWithStructuralSharing(
    root,
    [...splitPath(arrayPath), String(sourceIndex), ...splitPath(childPath)],
    nextValue,
  );
}
```

规则：

1. 只复制数组外壳
2. 只复制目标 item / row
3. 只复制目标字段祖先链
4. 不因修改一个 cell 而 deep clone 整个 table source

### Runtime Implication

这条规则直接影响前文所有 owner family：

1. `input-text` 更新只应复制该字段路径祖先
2. `object-field` 更新只应复制对象祖先链
3. `array-field(object)` 更新只应复制数组壳与目标 item
4. editable `table` 更新只应复制 source 数组壳与目标 row
5. `detail-view` staged edit 优先 patch overlay

### 1. Value Scope Store

```ts
interface ValueScopeStore {
  read(scopeId: string, path: string): unknown;
  write(scopeId: string, path: string, value: unknown): void;
  patch(scopeId: string, path: string, patch: unknown): void;
  replace(scopeId: string, nextRoot: Record<string, unknown>): void;
  subscribe(scopeId: string, paths: string[], listener: (change: ScopeChange) => void): () => void;
}
```

用途：

- 存持久值
- 存 draft overlay 的 base/patch 读取入口
- 提供路径级依赖订阅

### 2. Validation Runtime Registry

```ts
interface ValidationRuntimeRegistry {
  create(spec: ValidationRuntimeSpec): ValidationScopeRuntime;
  get(runtimeId: string): ValidationScopeRuntime | undefined;
  dispose(runtimeId: string): void;
}
```

用途：

- 存 `errors`
- 存 `validating`
- 存 `touched` / `dirty` / `visited`
- 执行 `ValidationScopeRuntime` 级 validate API

### 3. UI State Store

```ts
interface UiStateStore {
  get(ownerId: string, key: string): unknown;
  set(ownerId: string, key: string, value: unknown): void;
  subscribe(ownerId: string, keys: string[], listener: () => void): () => void;
}
```

用途：

- `variant-field.activeVariant`
- `array-field.collapsedItems`
- `detail-view.activeTab`
- `table.sort`
- `table.pagination`
- `table.expandedRowKeys`

### 4. Surface Runtime

沿用现有 `SurfaceRuntime` / `SurfaceStore` 命名。

用途：

- 管理 opened `SurfaceEntry` stack
- 每次打开 surface 时创建对应 scope/runtime boundary
- 不直接吞掉内部值、校验、业务提交状态

## Compile Model

运行时性能首先靠 compile-once。

```ts
compile(schema) -> CompiledTemplate {
  templateNodes: TemplateNode[]
  validationModel?: CompiledValidationModel
  fieldBindings: FieldBindingSpec[]
  dependencyHints: DependencyHint[]
}
```

规则：

- renderer field meaning 在编译期定型
- path binding 在编译期定型
- validation graph 在编译期定型
- repeated template 在编译期只保留一份模板

## Common Runtime Algorithms

### Read A Bound Value

```ts
function readBoundValue(owner: ValueOwner): unknown {
  return substrate.valueScopes.read(owner.scopeId, owner.valuePath);
}
```

说明：

- `object-field` / `variant-field` / `array-field` / editable table cell 都属于 `ValueOwner`
- `detail-view` 在 staged 模式下读取 draft scope，而不是直接读父 scope

### Write A Bound Value

```ts
function writeBoundValue(owner: ValueOwner, nextValue: unknown): void {
  substrate.valueScopes.write(owner.scopeId, owner.valuePath, nextValue);
}
```

### Validate A Bound Path

```ts
async function validateOwnedPath(
  owner: ValueOwner,
  relativePath: string,
  reason: ValidationReason,
) {
  const absolutePath = joinPath(owner.rootPath, relativePath);
  return substrate.validationRuntimes
    .get(owner.validationRuntimeId)
    ?.validateAt(absolutePath, reason);
}
```

### Inline Owner Submit Rule

```ts
function submitInlineOwner(owner: InlineValueOwner): InlineSubmitResult {
  return {
    mode: 'no-op',
    reason: 'value already lives in parent owner',
  };
}
```

说明：

- `object-field` / `variant-field` / `array-field` 默认不拥有独立 submit
- 它们的“提交”就是父 owner 最终提交时读取当前值

### Staged Owner Confirm Rule

```ts
async function confirmStagedOwner(owner: StagedValueOwner): Promise<ConfirmResult> {
  const validation = await substrate.validationRuntimes
    .get(owner.validationRuntimeId)
    ?.validateAll('commit');

  if (!validation || !validation.ok) {
    return { ok: false, reason: 'validation-failed' };
  }

  const draftValue = substrate.valueScopes.read(owner.draftScopeId, '');
  const outboundValue = await runTransformOutIfNeeded(owner, draftValue);

  substrate.valueScopes.write(owner.parentScopeId, owner.parentPath, outboundValue);
  substrate.surfaceRuntime.close(owner.surfaceId);
  disposeOwnerSession(owner);

  return { ok: true };
}
```

## Shared Runtime Role Types

以下类型名只是本文档中的伪代码辅助名，用来说明行为分类。

它们不是推荐新增到 `flux-core` 的 public contract 名称。

```ts
interface InlineValueOwner {
  kind: 'inline';
  scopeId: string;
  validationRuntimeId: string;
  valuePath: string;
  rootPath: string;
}

interface StagedValueOwner {
  kind: 'staged';
  parentScopeId: string;
  parentPath: string;
  draftScopeId: string;
  validationRuntimeId: string;
  surfaceId: string;
  uiOwnerId: string;
}

interface CollectionOwner {
  scopeId: string;
  collectionPath: string;
  validationRuntimeId?: string;
}

interface LeafFieldBinding {
  scopeId: string;
  valuePath: string;
  validationRuntimeId: string;
  validationPath: string;
}
```

## Control Design

## `form`

### Runtime Role

`form` 是 submit-oriented runtime boundary。

它负责：

1. 创建 `FormRuntime`
2. 创建 form-owned `ScopeRef`
3. 绑定最近的 `ValidationScopeRuntime`
4. 维护 submit policy、touch policy、error visibility policy

### Get Value

```ts
function createFormRuntime(
  parentScope: ScopeRef,
  initialValues: object,
  model: CompiledValidationModel,
): FormRuntime {
  const scopeId = substrate.valueScopes.createChildScope(parentScope.id, initialValues);
  const validationRuntime = substrate.validationRuntimes.create({
    scopeId,
    rootPath: '',
    model,
  });

  return assembleFormRuntime({
    scopeId,
    validationRuntime,
    submitPolicy: 'form',
  });
}

function readFormValues(form: FormRuntime): Record<string, unknown> {
  return asObject(substrate.valueScopes.read(form.scope.id, ''));
}
```

### Validate

```ts
async function validateForm(form: FormRuntime, reason: ValidationReason = 'submit') {
  return form.validateAll(reason);
}
```

### Submit

```ts
async function submitForm(form: FormRuntime): Promise<FormSubmitResult> {
  const result = await form.validateAll('submit');
  if (!result.ok) {
    return { ok: false, errors: result.errors };
  }

  const payload = readFormValues(form);
  return dispatchFormSubmit(form, payload);
}
```

说明：

- `form` 是默认 submit owner
- inline composite fields 不覆盖 form submit
- staged child runtime 通过 child contract 影响 `canSubmit`

## `dialog` / `drawer`

### Runtime Role

`dialog` / `drawer` 是 `SurfaceRuntime` family 的 concrete surface entry。

它们负责：

1. open / close / active
2. stacking / focus restore
3. 为内部内容创建 surface-local scope boundary

### Get Value

如果 surface 只是展示 page/form 当前值：

```ts
function openReadOnlySurface(parentScope: ScopeRef, kind: 'dialog' | 'drawer') {
  return substrate.surfaceRuntime.open({
    kind,
    surface: {},
    scope: parentScope,
    runtime: currentRendererRuntime,
  });
}
```

如果 surface 承载 staged editor：

```ts
function openStagedSurface(parentScopeId: string, parentPath: string, kind: 'dialog' | 'drawer') {
  const baseValue = substrate.valueScopes.read(parentScopeId, parentPath);
  const draftScopeId = createDraftOverlayScope(baseValue);

  return substrate.surfaceRuntime.open({
    kind,
    surface: { parentPath, draftScopeId },
    scope: createSurfaceDraftScope(draftScopeId),
    runtime: currentRendererRuntime,
  });
}
```

### Validate

```ts
async function validateSurfaceContent(surfaceId: string): Promise<ScopeValidationResult> {
  const validationRuntime = resolveSurfaceValidationRuntime(surfaceId);
  return validationRuntime?.validateAll('commit') ?? { ok: true, errors: [], fieldErrors: {} };
}
```

### Submit

```ts
async function confirmSurface(surfaceId: string): Promise<ConfirmResult> {
  const stagedRuntime = resolveStagedRuntime(surfaceId);
  if (!stagedRuntime) {
    substrate.surfaceRuntime.close(surfaceId);
    return { ok: true };
  }

  return confirmStagedOwner(stagedRuntime);
}
```

说明：

- `dialog` / `drawer` 本身不是 submit owner
- 它们只承载具体 submit owner 或 staged runtime
- surface close 不等于内部 form submit

## `tabs`

### Runtime Role

`tabs` 主要是 UI state owner，不默认创建新的 `FormRuntime` 或 `ValidationScopeRuntime`。

但它必须明确 2 个策略：

1. hidden tab mount policy
2. hidden tab validation participation policy

### Get Value

```ts
interface TabsRuntimePolicy {
  mountPolicy: 'keep-alive' | 'unmount-hidden';
  validationPolicy: 'active-only' | 'mounted-only' | 'all-owned';
}

function getActiveTab(ownerId: string, defaultKey: string): string {
  return (substrate.uiState.get(ownerId, 'activeTab') as string) ?? defaultKey;
}

function setActiveTab(ownerId: string, nextKey: string) {
  substrate.uiState.set(ownerId, 'activeTab', nextKey);
}
```

### Validate

```ts
async function validateTabs(
  ownerId: string,
  policy: TabsRuntimePolicy,
): Promise<ScopeValidationResult> {
  if (policy.validationPolicy === 'active-only') {
    return validateActiveTabSubtree(ownerId);
  }

  if (policy.validationPolicy === 'mounted-only') {
    return validateMountedTabSubtrees(ownerId);
  }

  return validateAllOwnedTabSubtrees(ownerId);
}
```

### Submit

```ts
function submitTabs() {
  return {
    mode: 'no-op',
    reason: 'tabs only route visibility; nearest form/detail runtime submits',
  };
}
```

说明：

- `tabs` 只切换可见 subtree
- `tabs` 不吞子表单值
- 是否保留隐藏 tab state，由 `mountPolicy` 明确决定

## `wizard`

### Runtime Role

`wizard` 不是新的基础 runtime family。

它更适合定义为：

1. `FormRuntime` 上的一层 step-flow policy
2. 带 step-local gating 的 staged progression controller

### Get Value

```ts
interface WizardRuntime {
  form: FormRuntime;
  stepOrder: string[];
  currentStep: string;
  stepPolicy: 'keep-mounted' | 'unmount-completed' | 'unmount-hidden';
}

function getCurrentStep(ownerId: string, steps: string[]): string {
  return (substrate.uiState.get(ownerId, 'currentStep') as string) ?? steps[0];
}
```

### Validate

```ts
async function validateCurrentStep(wizard: WizardRuntime): Promise<ScopeValidationResult> {
  const stepPath = resolveStepValidationPath(wizard.currentStep);
  return wizard.form.validateSubtree(stepPath, 'submit');
}

async function goToNextStep(wizard: WizardRuntime): Promise<boolean> {
  const result = await validateCurrentStep(wizard);
  if (!result.ok) {
    return false;
  }

  substrate.uiState.set(getWizardUiOwnerId(wizard), 'currentStep', getNextStepKey(wizard));
  return true;
}
```

### Submit

```ts
async function submitWizard(wizard: WizardRuntime): Promise<FormSubmitResult> {
  const result = await wizard.form.validateAll('submit');
  if (!result.ok) {
    return { ok: false, errors: result.errors };
  }

  return dispatchFormSubmit(wizard.form, readFormValues(wizard.form));
}
```

说明：

- `wizard` 的最终提交仍是 form submit
- “Next” 是 step-local validate + step transition
- 不是每一步都单独创建新 form runtime

## `input-text`

### Runtime Role

`input-text` 是最小 leaf field。

它只依赖：

1. 最近的 value scope
2. 最近的 validation runtime
3. field binding path

### Get Value

```ts
function bindInputText(currentForm: FormRuntime, name: string): LeafFieldBinding {
  return {
    scopeId: currentForm.scope.id,
    valuePath: name,
    validationRuntimeId: currentForm.scopeId,
    validationPath: name,
  };
}

function readInputText(binding: LeafFieldBinding): string {
  return String(substrate.valueScopes.read(binding.scopeId, binding.valuePath) ?? '');
}
```

### Validate

```ts
async function onInputTextChange(binding: LeafFieldBinding, nextValue: string) {
  substrate.valueScopes.write(binding.scopeId, binding.valuePath, nextValue);
  await substrate.validationRuntimes
    .get(binding.validationRuntimeId)
    ?.validateAt(binding.validationPath, 'change');
}

async function onInputTextBlur(binding: LeafFieldBinding) {
  markTouched(binding.validationRuntimeId, binding.validationPath);
  await substrate.validationRuntimes
    .get(binding.validationRuntimeId)
    ?.validateAt(binding.validationPath, 'blur');
}
```

### Submit

```ts
function submitInputText() {
  return { mode: 'no-op', reason: 'leaf field delegates submit to nearest form or staged runtime' };
}
```

说明：

- `input-text` 不自己提交
- `input-text` 只负责 value write + field validate trigger
- 这也是其他叶子控件的默认基线

## `object-field`

### Schema Baseline

```ts
interface ObjectFieldSchema {
  type: 'object-field';
  name: string;
  body: SchemaInput;
  readOnly?: boolean;
}
```

### Get Value

```ts
function createObjectFieldOwner(
  parent: InlineValueOwner,
  schema: ObjectFieldSchema,
): InlineValueOwner {
  return {
    kind: 'inline',
    scopeId: parent.scopeId,
    validationOwnerId: parent.validationOwnerId,
    valuePath: joinPath(parent.valuePathRoot ?? '', schema.name),
    rootPath: joinPath(parent.rootPath, schema.name),
  };
}

function readObjectFieldValue(owner: InlineValueOwner): Record<string, unknown> {
  return asObject(substrate.valueScopes.read(owner.scopeId, owner.valuePath));
}
```

子字段相对对象根取值：

```ts
function readObjectChild(owner: InlineValueOwner, childName: string): unknown {
  return substrate.valueScopes.read(owner.scopeId, joinPath(owner.valuePath, childName));
}
```

### Validate

```ts
async function onObjectChildChange(owner: InlineValueOwner, childName: string, nextValue: unknown) {
  substrate.valueScopes.write(owner.scopeId, joinPath(owner.valuePath, childName), nextValue);
  await substrate.validationRuntimes
    .get(owner.validationRuntimeId)
    ?.validateAt(joinPath(owner.rootPath, childName), 'change');
}

async function validateObjectField(owner: InlineValueOwner) {
  return substrate.validationRuntimes
    .get(owner.validationRuntimeId)
    ?.validateSubtree(owner.rootPath, 'manual');
}
```

### Submit

```ts
function submitObjectField(owner: InlineValueOwner) {
  return submitInlineOwner(owner);
}
```

说明：

- `object-field` 不创建独立 form runtime
- `object-field` 不创建独立 draft
- 父 owner 提交时自然包含 `name` 对应对象值

## `variant-field`

### Schema Baseline

```ts
interface VariantFieldSchema {
  type: 'variant-field';
  name: string;
  variants: VariantOption[];
  defaultVariant?: string;
}
```

### Get Value

```ts
function readVariantRawValue(owner: InlineValueOwner): unknown {
  return substrate.valueScopes.read(owner.scopeId, owner.valuePath);
}

function detectVariant(schema: VariantFieldSchema, rawValue: unknown): string {
  return (
    detectByDiscriminator(rawValue) ??
    detectByMatch(schema.variants, rawValue) ??
    detectByActionIfNeeded(schema, rawValue) ??
    schema.defaultVariant ??
    schema.variants[0].key
  );
}

function getActiveVariant(ownerId: string, schema: VariantFieldSchema, rawValue: unknown): string {
  return (
    (substrate.uiState.get(ownerId, 'activeVariant') as string) ?? detectVariant(schema, rawValue)
  );
}
```

variant editor 看到的统一 payload：

```ts
function buildVariantScopePayload(ownerId: string, rawValue: unknown, readOnly: boolean) {
  const variant = substrate.uiState.get(ownerId, 'activeVariant');
  return {
    value: rawValue,
    variant,
    readOnly,
  };
}
```

### Validate

```ts
async function onVariantValueChange(owner: InlineValueOwner, nextValue: unknown) {
  substrate.valueScopes.write(owner.scopeId, owner.valuePath, nextValue);
  await substrate.validationRuntimes
    .get(owner.validationRuntimeId)
    ?.validateSubtree(owner.rootPath, 'change');
}

async function switchVariant(ownerId: string, owner: InlineValueOwner, nextVariant: string) {
  const currentValue = readVariantRawValue(owner);
  const nextValue = await buildNextVariantValue(nextVariant, currentValue);

  substrate.uiState.set(ownerId, 'activeVariant', nextVariant);
  substrate.valueScopes.write(owner.scopeId, owner.valuePath, nextValue);

  await substrate.validationRuntimes
    .get(owner.validationRuntimeId)
    ?.validateSubtree(owner.rootPath, 'change');
}
```

### Submit

```ts
function submitVariantField(owner: InlineValueOwner) {
  return submitInlineOwner(owner);
}
```

说明：

- `variant-field` 默认只挂载 active variant
- 切换 variant 时默认重建目标值，不隐式保留旧 variant 内部结构
- 变体切换后仍由父 owner 统一提交

## `array-field`

### Schema Baseline

```ts
interface ArrayFieldSchema {
  type: 'array-field';
  name: string;
  itemKind: 'scalar' | 'object';
  item: SchemaInput;
}
```

### Get Value

```ts
function readArrayValue(owner: InlineValueOwner): unknown[] {
  return asArray(substrate.valueScopes.read(owner.scopeId, owner.valuePath));
}

interface ArrayItemEntry {
  itemKey: string;
  sourceIndex: number;
}

function resolveArrayItemKey(item: unknown, sourceIndex: number, itemKeyField?: string): string {
  if (isRecord(item) && itemKeyField) {
    const explicit = getIn(item, itemKeyField);
    if (explicit != null && explicit !== '') {
      return String(explicit);
    }
  }

  if (isRecord(item) && item.__rowKey != null && item.__rowKey !== '') {
    return String(item.__rowKey);
  }

  if (isRecord(item) && item.id != null && item.id !== '') {
    return String(item.id);
  }

  return `legacy-index:${sourceIndex}`;
}

function materializeArrayEntries(owner: InlineValueOwner): ArrayItemEntry[] {
  const arrayValue = readArrayValue(owner);
  return arrayValue.map((item, sourceIndex) => ({
    itemKey: resolveArrayItemKey(item, sourceIndex, owner.itemKeyField),
    sourceIndex,
  }));
}

function readArrayItem(owner: InlineValueOwner, index: number): unknown {
  return substrate.valueScopes.read(owner.scopeId, joinPath(owner.valuePath, String(index)));
}
```

### Validate

```ts
async function appendArrayItem(owner: InlineValueOwner, initialItem: unknown) {
  const items = readArrayValue(owner);
  substrate.valueScopes.write(owner.scopeId, owner.valuePath, [...items, initialItem]);
  await substrate.validationRuntimes
    .get(owner.validationRuntimeId)
    ?.validateSubtree(owner.rootPath, 'change');
}

async function updateArrayItemField(
  owner: InlineValueOwner,
  index: number,
  relativePath: string,
  nextValue: unknown,
) {
  const absoluteValuePath = joinPath(owner.valuePath, String(index), relativePath);
  const absoluteValidationPath = joinPath(owner.rootPath, String(index), relativePath);

  substrate.valueScopes.write(owner.scopeId, absoluteValuePath, nextValue);
  await substrate.validationRuntimes
    .get(owner.validationRuntimeId)
    ?.validateAt(absoluteValidationPath, 'change');
}
```

### Submit

```ts
function submitArrayField(owner: InlineValueOwner) {
  return submitInlineOwner(owner);
}
```

说明：

- 值路径仍按 index 写入
- 对象数组 item runtime identity 优先不按 index，而按稳定 `itemKey`
- reorder 只改变 entry 映射，不应让每个 item subtree 全 remount

### Object Item Identity Rule

当 `array-field.itemKind = 'object'` 时，推荐显式支持：

```ts
interface ArrayFieldSchema {
  type: 'array-field';
  name: string;
  itemKind: 'scalar' | 'object';
  itemKey?: string;
  item: SchemaInput;
}
```

解析顺序：

1. `schema.itemKey`
2. `record.__rowKey`
3. `record.id`
4. last-resort fallback: `legacy-index:${sourceIndex}`

规则：

1. form values 和 validation path 仍保持 index-addressed
2. repeated instance identity、item-local UI state、item scope cache 优先使用稳定 `itemKey`
3. 如果没有 `itemKey`，允许兼容退化到 index-based identity
4. 但对象数组的 editable baseline 仍推荐显式提供 `itemKey`

最小伪代码：

```ts
function writeObjectArrayField(
  owner: InlineValueOwner,
  entry: ArrayItemEntry,
  childPath: string,
  nextValue: unknown,
) {
  substrate.valueScopes.write(
    owner.scopeId,
    joinPath(owner.valuePath, String(entry.sourceIndex), childPath),
    nextValue,
  );
}

function getObjectArrayItemRuntimeKey(entry: ArrayItemEntry): string {
  return entry.itemKey;
}
```

说明：

- 这里和 table 一样，把“值位置”和“运行时 identity”拆开
- 没有稳定 key 时仍可运行，但 reorder/remap continuity 会退化

## `detail-view`

### Schema Baseline

```ts
interface DetailViewSchema {
  type: 'detail-view';
  scopePath?: string;
  data?: Record<string, SchemaValue>;
  surface: 'dialog' | 'drawer' | 'sheet';
  content: SchemaInput;
  viewer?: SchemaInput;
}
```

### Get Value

打开时创建 staged session：

```ts
function openDetailView(
  parentScopeId: string,
  parentPath: string,
  schema: DetailViewSchema,
): StagedValueOwner {
  const sourceValue = substrate.valueScopes.read(parentScopeId, parentPath);
  const draftScopeId = createDraftOverlayScope(sourceValue);
  const validationRuntime = substrate.validationRuntimes.create({
    scopeId: draftScopeId,
    rootPath: '',
    model: compileDetailValidation(schema),
  });
  const surfaceId = substrate.surfaceRuntime.open({
    kind: schema.surface,
    surface: {},
    scope: createSurfaceDraftScope(draftScopeId),
    runtime: currentRendererRuntime,
  });

  return {
    kind: 'staged',
    parentScopeId,
    parentPath,
    draftScopeId,
    validationRuntimeId: validationRuntime.scopeId,
    surfaceId,
    uiOwnerId: createUiOwnerId(surfaceId),
  };
}
```

draft overlay 推荐基线：

```ts
interface DraftOverlayScope {
  baseValue: unknown;
  patch: Record<string, unknown>;
}

function readDraft(scope: DraftOverlayScope, path: string): unknown {
  return readOverlay(scope.baseValue, scope.patch, path);
}
```

### Validate

```ts
async function validateDetailView(owner: StagedValueOwner) {
  return substrate.validationRuntimes.get(owner.validationRuntimeId)?.validateAll('commit');
}
```

### Submit

```ts
async function submitDetailView(owner: StagedValueOwner): Promise<ConfirmResult> {
  return confirmStagedOwner(owner);
}

function cancelDetailView(owner: StagedValueOwner): void {
  substrate.surfaceRuntime.close(owner.surfaceId);
  disposeOwnerSession(owner);
}
```

说明：

- `detail-view` 的提交不是父 form submit 的别名
- `detail-view` 自己先 `validate -> transformOut -> commit`
- confirm 前，draft 与父值隔离

## `table`

### Schema Baseline

```ts
interface TableSchema {
  type: 'table';
  source: SchemaValue;
  rowKey: string;
  columns: TableColumn[];
  mode?: 'display' | 'interactive' | 'editable';
}
```

### Get Value

table owner 先把集合规范成 row entries：

```ts
interface TableRowEntry {
  rowKey: string;
  sourceIndex: number;
  record: Record<string, unknown>;
  viewIndex?: number;
}

function buildRowEntries(source: unknown[], rowKeyField: string): TableRowEntry[] {
  return source.map((record, sourceIndex) => ({
    rowKey: resolveStableRowKey(record, rowKeyField, sourceIndex),
    sourceIndex,
    record: asObject(record),
  }));
}

function resolveStableRowKey(record: unknown, sourceIndex: number, rowKeyField?: string): string {
  if (isRecord(record) && rowKeyField) {
    const explicit = getIn(record, rowKeyField);
    if (explicit != null && explicit !== '') {
      return String(explicit);
    }
  }

  if (isRecord(record) && record.__rowKey != null && record.__rowKey !== '') {
    return String(record.__rowKey);
  }

  if (isRecord(record) && record.id != null && record.id !== '') {
    return String(record.id);
  }

  return `legacy-index:${sourceIndex}`;
}
```

### Row Identity Rule

table 采用与对象数组相同的 identity split：

1. 值路径、校验路径、数组重映射仍按 index
2. React key、row scope cache、expanded/selected/editing 等 row-local UI state 优先按 `rowKey`
3. 缺少稳定 key 时，兼容退化到 `legacy-index:${sourceIndex}`
4. 但 editable table 的规范 baseline 仍要求显式 `rowKey`

最小伪代码：

```ts
function writeEditableCell(
  scopeId: string,
  tablePath: string,
  row: TableRowEntry,
  column: TableColumn,
  nextValue: unknown,
) {
  substrate.valueScopes.write(
    scopeId,
    joinPath(tablePath, String(row.sourceIndex), column.name),
    nextValue,
  );
}

function getTableRowRuntimeKey(row: TableRowEntry): string {
  return row.rowKey;
}
```

cell 读取规则：

```ts
function readDisplayCell(row: TableRowEntry, column: TableColumn): unknown {
  return getIn(row.record, column.name);
}

function readEditableCell(
  scopeId: string,
  tablePath: string,
  row: TableRowEntry,
  column: TableColumn,
): unknown {
  return substrate.valueScopes.read(
    scopeId,
    joinPath(tablePath, String(row.sourceIndex), column.name),
  );
}
```

### Validate

display / interactive mode：

```ts
function validateDisplayTable(): ScopeValidationResult {
  return { ok: true, errors: [], fieldErrors: {} };
}
```

editable mode：

```ts
async function validateEditableCell(
  owner: InlineValueOwner,
  row: TableRowEntry,
  column: TableColumn,
) {
  return substrate.validationRuntimes
    .get(owner.validationRuntimeId)
    ?.validateAt(joinPath(owner.rootPath, String(row.sourceIndex), column.name), 'change');
}

async function validateEditableTable(owner: InlineValueOwner) {
  return substrate.validationRuntimes
    .get(owner.validationRuntimeId)
    ?.validateSubtree(owner.rootPath, 'manual');
}
```

### Submit

```ts
function submitDisplayTable() {
  return { mode: 'no-op', reason: 'table is view-only' };
}

function submitEditableTable(owner: InlineValueOwner) {
  return submitInlineOwner(owner);
}
```

说明：

- 纯展示 table 不应创建 field owner
- editable table 才把 cell 视为 path-bound value owner
- 父 form 提交时自然包含 table 对应集合值

## Common Nested Scenarios

## Page -> Form -> `input-text`

```ts
pageScope = createPageScope(pageData);
form = createFormRuntime(pageScope, initialValues, validationModel);
binding = bindInputText(form, 'profile.name');

readInputText(binding);
onInputTextChange(binding, 'Alice');
submitForm(form);
```

规则：

- `input-text` 从最近 `FormRuntime` 取 binding
- 值写入 form scope
- 校验由 form 的 `ValidationScopeRuntime` 执行
- 提交由 form 执行

## Page -> `tabs` -> Form

```ts
tabs.active = getActiveTab(tabsOwnerId, 'basic');

if (tabs.active === 'basic') renderBasicFormRegion();
if (tabs.active === 'advanced') renderAdvancedFormRegion();
```

规则：

- 如果 `mountPolicy = keep-alive`，切换 tab 不丢失内部 field state
- 如果 `validationPolicy = active-only`，隐藏 tab 不参与当前 validate pass
- tabs 不改变 form 的 value ownership

## Page -> Button -> Dialog -> Form

```ts
surfaceId = openReadOnlySurface(pageScope, 'dialog');
dialogForm = createFormRuntime(dialogScope, dialogInitialValues, dialogValidation);

submitForm(dialogForm);
```

规则：

- `dialog` 只提供 surface boundary
- dialog 内 form 仍是 submit owner
- close dialog 不等于 submit form

## Form -> Button -> `detail-view` -> Confirm

```ts
detail = openDetailView(form.scope.id, 'address', detailSchema);
writeDraft(detail.draftScopeId, 'street', 'Main');
submitDetailView(detail);
```

规则：

- draft 与父 form 隔离
- confirm 成功后才写回 `form.scope.address`
- cancel 直接丢弃 draft overlay

## Form -> `array-field(object)` -> `table(editable)`

```ts
rows = buildRowEntries(readArrayValue(arrayOwner), 'id');
cell = readEditableCell(form.scope.id, 'lineItems', rows[3], qtyColumn);
validateEditableCell(arrayOwner, rows[3], qtyColumn);
submitForm(form);
```

规则：

- `array-field` 提供集合值路径
- `table` 只做 row projection 和 view/edit coordination
- editable cell 仍写回 form-owned array path
- row continuity 优先跟随 `rowKey` / `itemKey`，缺失时退化到 index identity
- 最终由 form submit

## `table` Row Inline Edit

```ts
function startInlineRowEdit(rowKey: string) {
  substrate.uiState.set(tableOwnerId, `row:${rowKey}:editing`, true);
}

function commitInlineCell(row: TableRowEntry, column: TableColumn, nextValue: unknown) {
  substrate.valueScopes.write(
    form.scope.id,
    `lineItems.${row.sourceIndex}.${column.name}`,
    nextValue,
  );
}
```

规则：

- inline edit 不创建 row draft runtime
- 值直接写父 form
- 行级编辑状态只放 UI state

## `table` Row Staged Edit

```ts
function openRowDraft(row: TableRowEntry) {
  const record = substrate.valueScopes.read(form.scope.id, `lineItems.${row.sourceIndex}`);
  const draftScopeId = createDraftOverlayScope(record);
  const validationRuntime = substrate.validationRuntimes.create({
    scopeId: draftScopeId,
    rootPath: '',
    model: rowValidationModel,
  });

  return { rowKey: row.rowKey, draftScopeId, validationRuntimeId: validationRuntime.scopeId };
}
```

规则：

- 只为进入 staged edit 的行创建 draft runtime
- 不为全部行常驻创建 row draft
- confirm 后再写回父 form array path

## `wizard` + `detail-view`

```ts
if (currentStep === 'advanced') {
  detail = openDetailView(form.scope.id, 'advancedConfig', detailSchema);
  await submitDetailView(detail);
  await goToNextStep(wizard);
}
```

规则：

- `wizard` 负责步骤推进
- `detail-view` 负责 staged confirm
- `wizard` 不直接吞掉 `detail-view` draft 语义

## Rejected Baselines

从零设计时，以下基线应直接拒绝：

1. 每个 composite field 都创建一套独立 form runtime
2. `detail-view` 打开时深拷贝整对象作为 draft
3. table 每行默认创建完整父 scope clone
4. table 所有 cell 默认都进入 editable runtime
5. `variant-field` 同时挂载所有变体 subtree
6. 把 surface store 变成 values + validation + ui 的大一统 store

## Minimal Authoring Rules

作者层保持简单：

1. `object-field` 子字段相对对象根
2. `array-field(object)` 子字段相对 item 根
3. `variant-field` 的编辑器统一围绕 `value`
4. `detail-view` 明确是 staged owner
5. editable table 必须声明 `rowKey`

## Final Summary

从零设计时，统一规则应是：

- `object-field`：路径前缀代理；父 owner 提交
- `variant-field`：单 active variant；父 owner 提交
- `array-field`：index-addressed value + key-addressed runtime identity；父 owner 提交
- `detail-view`：surface-backed draft owner；自己 validate/confirm/commit
- `table`：row entry owner；view/edit 模式分离；editable table 由父 owner 提交

这个基线的关键不是把 5 个控件做成 5 套实现，而是让它们共享一个小而稳定的 owner substrate，并把取值、校验、提交都收口到同一套规则里。
