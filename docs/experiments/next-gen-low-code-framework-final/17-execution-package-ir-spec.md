# 17 Execution Package IR Spec

## 1. 目标

本文把前面的 `ExecutionPackage` 从“结构目录”进一步收口为**字段级 IR 规范**。

这里回答：

1. package 里到底有哪些正式 DTO。
2. 各 DTO 的字段、默认值、闭包关系是什么。
3. 什么必须 stable，什么是 optional。
4. IR 怎样容纳 owner、validation、resource、reaction、host、复合字段这些实验线索。

## 1.1 与 02 / 06 的关系

1. `02-execution-package-and-admission.md` 拥有 `ExecutionPackage` 的高层协议语义。
2. 本文负责把 `ExecutionPackage` 细化为字段级 IR 规范。
3. `06-persistence-journal-collaboration.md` 拥有 recovery/journal 的生命周期语义；本文只定义进入 shared contract 的 DTO 字段。

## 2. IR 设计原则

1. runtime 只接受 `ExecutionPackage` 或 `ExecutionPackageFragment`。
2. IR 必须 deterministic、可序列化、可 hash。
3. IR 不保留 authoring merge/extends 语义。
4. IR 不能退化成 generic graph cell dump。
5. IR 必须显式容纳 owner boundary、composite field、host contract、async policy、conformance observability。

## 3. 顶层对象

```ts
interface ExecutionPackage {
  packageId: string;
  packageVersion: string;
  frameworkRange: string;
  hash: string;
  entryTemplateId: string;
  metadata?: PackageMetadata;
  templates: Record<string, TemplateDefinition>;
  values: Record<string, ValueProgram>;
  expressions?: Record<string, ExpressionProgramDefinition>;
  events: Record<string, EventDefinition>;
  requests?: Record<string, RequestProgramDefinition>;
  actions: Record<string, ActionProgram>;
  transforms?: Record<string, TransformProgramDefinition>;
  validations: Record<string, ValidationModelDefinition>;
  resources: Record<string, ResourceDefinition>;
  reactions: Record<string, ReactionDefinition>;
  renderers: Record<string, RendererBinding>;
  hostContracts: Record<string, HostContractManifest>;
  capabilityContracts: Record<string, CapabilityContract>;
  permissionManifest: CapabilityPermissionManifest;
  imports?: Record<string, ImportBindingDefinition>;
  diagnostics: PackageDiagnosticsBundle;
  sourceMap: ExecutionSourceMap;
  migrations?: PackageMigrationManifest;
}

interface ExecutionPackageFragment extends Omit<ExecutionPackage, 'entryTemplateId'> {
  mountPoints: string[];
}

interface PackageMetadata {
  compilerVersion: string;
  pluginSetHash: string;
  buildProfileId?: string;
}

interface PackageDiagnosticsBundle {
  entries: PackageDiagnosticEntry[];
}

interface PackageDiagnosticEntry {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

interface ExecutionSourceMap {
  entries: SourceMapEntry[];
}

interface SourceMapEntry {
  targetId: string;
  sourcePath: string;
  startOffset: number;
  endOffset: number;
}
```

## 4. 顶层不变量

1. 所有顶层 dictionary key 在 package 内唯一。
2. 所有引用字段必须指向已存在的顶层 entry。
3. package 不允许悬空 `templateId` / `valueId` / `eventId` / `actionId` / `resourceId` / `reactionId` / `modelId`。
4. `entryTemplateId` 必须存在于 `templates` 中。
5. fragment 不能带第二套 lowering 规则。

## 5. Canonicalization 与 Hash

### 5.1 Canonicalization 输入域

package hash 包含：

1. `metadata`
2. `templates`
3. `values`
4. `expressions`
5. `requests`
6. `events`
7. `actions`
8. `transforms`
9. `validations`
10. `resources`
11. `reactions`
12. `renderers`
13. `hostContracts`
14. `capabilityContracts`
15. `permissionManifest`
16. `imports`
17. `migrations`

package hash 不包含：

1. source map 内容
2. diagnostics 文本
3. debug-only annotations

### 5.2 排序规则

1. object key 按字典序排序。
2. diagnostics/source-map 采用独立稳定排序，不进入主 hash。
3. 数组顺序只来自 canonical traversal，不来自对象插入顺序。

## 6. Template IR

```ts
interface TemplateDefinition {
  templateId: string;
  rendererType: string;
  rendererBindingId: string;
  rootNode: TemplateNode;
}

interface TemplateNode {
  nodeId: string;
  path: string;
  rendererType: string;
  propsProgramId?: string;
  metaProgramId?: string;
  regionRefs: Record<string, RegionDefinition>;
  eventRefs: Record<string, string>;
  lifecycle?: LifecycleActionBinding;
  scopeBoundary?: ScopeBoundaryDefinition;
  ownerBoundary?: OwnerBoundaryDefinition;
  hostBoundary?: HostBoundaryDefinition;
  validationBinding?: ValidationBindingDefinition;
  fieldBinding?: FieldBindingDefinition;
}

interface LifecycleActionBinding {
  onMountActionId?: string;
  onUnmountActionId?: string;
}

interface ScopeBoundaryDefinition {
  scopeKind: 'inherit' | 'child' | 'isolated-child' | 'host-projection';
  scopeLabel?: string;
}

interface HostBoundaryDefinition {
  hostType: string;
  projectionKey?: string;
}

interface ValidationBindingDefinition {
  validationModelId: string;
}

interface RegionDefinition {
  key: string;
  templateIds: string[];
  params?: string[];
}
```

规则：

1. `eventRefs` 只保存 `eventId` 引用。
2. `TemplateNode` 不内嵌 event/action/value 定义。
3. repeated structure 只保留一份模板节点。

## 7. Renderer Binding IR

```ts
interface RendererBinding {
  rendererBindingId: string;
  rendererType: string;
  rendererClass: 'instance-renderer' | 'owner-renderer' | 'domain-host-renderer' | 'null-renderer';
  contractVersion: string;
  propContracts?: Record<string, unknown>;
  eventContracts?: Record<string, unknown>;
}
```

## 8. Value IR

```ts
type ValueProgram =
  | { valueId: string; kind: 'static'; value: unknown }
  | { valueId: string; kind: 'expr'; exprId: string; dependencySet?: DependencySetDefinition }
  | { valueId: string; kind: 'template-ref'; templateId: string }
  | { valueId: string; kind: 'array'; items: string[] }
  | { valueId: string; kind: 'object'; entries: Record<string, string> };
```

```ts
interface ExpressionProgramDefinition {
  exprId: string;
  source: string;
}

interface RequestProgramDefinition {
  requestProgramId: string;
  capabilityRequest: CapabilityRequestProgram;
}

interface TransformProgramDefinition {
  transformId: string;
  mode: 'replace' | 'merge';
  valueProgramId: string;
}
```

规则：

1. `dependencySet` 是可选显式声明，不存在时 runtime collector 兜底。
2. `exprId` 是已编译表达式引用，不是 raw formula string。

## 9. Event IR

```ts
interface EventDefinition {
  eventId: string;
  eventName: string;
  actionProgramId: string;
  payloadShape?: ValueShape;
}
```

## 10. Action IR

```ts
interface ActionProgram {
  actionId: string;
  entryStepId: string;
  steps: Record<string, ActionStep>;
}

interface ActionStep {
  stepId: string;
  when?: string;
  request?: CapabilityRequestProgram;
  then?: string[];
  onError?: string[];
  parallel?: string[];
  finally?: string[];
}

interface CapabilityRequestProgram {
  capability: string;
  target?: CapabilityTarget;
  argsProgramId?: string;
  control?: OperationControl;
}
```

```ts
type CapabilityTarget =
  | { kind: 'scope'; path: string }
  | { kind: 'owner'; ownerId: string }
  | { kind: 'resource'; resourceId: string }
  | { kind: 'handle'; handleId: string }
  | { kind: 'host'; hostType: string };

interface OperationControl {
  dedup?: 'cancel-previous' | 'ignore-new' | 'parallel' | 'queue';
  timeoutMs?: number;
}
```

## 11. Owner Boundary IR

```ts
interface OwnerBoundaryDefinition {
  ownerType: 'page' | 'form' | 'draft' | 'surface' | 'collection' | 'domain-host';
  resolution: 'create-owner' | 'inherit-owner' | 'no-owner';
  summaryPolicy?: 'default' | 'ignore' | 'summary-gate' | 'recurse-submit';
}
```

```ts
type FieldBindingDefinition =
  | ObjectFieldBindingDefinition
  | VariantFieldBindingDefinition
  | ArrayFieldBindingDefinition;
```

## 12. Composite Field IR

与 authoring / runtime bridge 相关的 `itemKey -> rowKey` lowering、`useItemSchema` 语义和 row draft commit target，见 `19-composite-field-lowering-and-identity.md`。

### 12.1 Object field

```ts
interface ObjectFieldBindingDefinition {
  fieldKind: 'object-field';
  fieldPath: string;
  childTemplateId?: string;
  detailView?: DetailViewDefinition;
}
```

### 12.2 Variant field

```ts
interface VariantFieldBindingDefinition {
  fieldKind: 'variant-field';
  fieldPath: string;
  discriminatorPath: string;
  inactiveBranchPolicy: 'drop' | 'preserve' | 'project';
  branches: VariantBranchDefinition[];
  projection?: VariantProjectionDefinition;
}

interface VariantBranchDefinition {
  value: string;
  templateId?: string;
  validationModelId?: string;
}

interface VariantProjectionDefinition {
  canonicalFields: string[];
  mapProgramId: string;
}
```

### 12.3 Array field

```ts
interface ArrayFieldBindingDefinition {
  fieldKind: 'array-field';
  fieldPath: string;
  itemKeyPath?: string;
  itemTemplateId?: string;
  tableView?: ArrayTableViewDefinition;
  createItemProgramId?: string;
}

interface ArrayTableViewDefinition {
  mode: 'display' | 'interactive' | 'editable-inline' | 'editable-staged';
  rowEditor?: RowEditorDefinition;
}
```

### 12.4 Detail / Row editor

```ts
interface DetailViewDefinition {
  surfaceKind: 'dialog' | 'drawer' | 'sheet';
  contentTemplateId: string;
  transformOut?: { transformId: string };
}

interface RowEditorDefinition {
  surfaceKind: 'dialog' | 'drawer' | 'sheet';
  contentTemplateId?: string;
  useItemSchema?: true;
  transformOut?: { transformId: string };
}
```

## 13. Validation IR

```ts
interface ValidationModelDefinition {
  modelId: string;
  ownerType: string;
  rootPath: string;
  nodes: Record<string, ValidationNodeDefinition>;
  order: string[];
  dependents: Record<string, string[]>;
  behavior?: ValidationBehaviorDefinition;
}

interface ValidationNodeDefinition {
  path: string;
  kind: 'scope-root' | 'field' | 'object' | 'array' | 'variant-root' | 'variant-branch' | 'repeated-template';
  rules: ValidationRuleTemplate[];
  ownerResolution: 'inherit-owner' | 'create-owner' | 'no-owner';
}
```

## 14. Resource IR

```ts
interface ResourceDefinition {
  resourceId: string;
  ownerScopePath: string;
  driver: ResourceDriverDefinition;
  publish: ResourcePublishDefinition;
  dependencySet?: DependencySetDefinition;
  lanePolicy?: LanePolicyDefinition;
  statusPath?: string;
}

type ResourceDriverDefinition =
  | { kind: 'sync-value'; valueProgramId: string }
  | { kind: 'refresh-capability'; requestProgramId: string };

interface ResourcePublishDefinition {
  path: string;
  mode: 'replace' | 'shallow-merge' | 'append' | 'prepend' | 'upsert';
  keyField?: string;
  mappingProgramId?: string;
}
```

## 15. Reaction IR

```ts
interface ReactionDefinition {
  reactionId: string;
  ownerScopePath: string;
  watchProgramId: string;
  whenProgramId?: string;
  dependencySet?: DependencySetDefinition;
  actionsProgramId: string;
  immediate?: boolean;
  debounce?: number;
  once?: boolean;
  lanePolicy?: LanePolicyDefinition;
}
```

## 16. Dependency IR

```ts
interface DependencySetDefinition {
  roots?: string[];
  exactPaths?: string[];
  collectionShapes?: string[];
  wildcard?: boolean;
  broadAccess?: boolean;
}
```

规则：

1. IR 允许表达多层依赖粒度。
2. collection/validation 不得被压缩成仅有 root 依赖。

## 17. Host / Capability IR

```ts
interface HostContractManifest {
  hostType: string;
  version: string;
  projections: Record<string, ProjectionShape>;
  commands: Record<string, CommandShape>;
  summaryShape?: ProjectionShape;
  snapshotVersionField?: string;
}

interface ProjectionShape {
  valueShape?: ValueShape;
}

interface CommandShape {
  argsShape?: ValueShape;
  resultShape?: ValueShape;
}

interface ValueShape {
  kind: 'unknown' | 'string' | 'number' | 'boolean' | 'object' | 'array';
}

interface CapabilityContract {
  capability: string;
  version: string;
  targetKinds: Array<'scope' | 'owner' | 'resource' | 'handle' | 'host'>;
}

interface CapabilityPermissionManifest {
  allowedCapabilities: string[];
  allowedNamespaces: string[];
  deniedCapabilities?: string[];
  allowedHostContracts?: string[];
}
```

## 18. Import / Module IR

这是对实验全集里 import 线程的正式收编。

```ts
interface ImportBindingDefinition {
  importId: string;
  source: string;
  kind: 'module' | 'namespace' | 'capability-provider' | 'renderer-bundle';
  versionRange?: string;
}
```

规则：

1. import/module policy 是正式 IR 能力，不是 runtime 私有细节。
2. fragment admission 时也必须校验 `imports`。

## 19. Lane Policy IR

```ts
interface LanePolicyDefinition {
  concurrency: 'cancel-previous' | 'ignore-new' | 'parallel' | 'queue';
  timeoutMs?: number;
  retry?: RetryPolicyDefinition;
  authoritativeScope: 'lane' | 'owner' | 'target-path';
}

interface RetryPolicyDefinition {
  times: number;
  delayMs: number;
  strategy?: 'fixed' | 'exponential';
  maxDelayMs?: number;
}
```

## 19.1 引用闭包规则

所有 `*Id` / `*ProgramId` 的权威指向固定如下：

| Field | Must reference |
| --- | --- |
| `propsProgramId` | `values[valueId]` |
| `metaProgramId` | `values[valueId]` |
| `argsProgramId` | `values[valueId]` |
| `mappingProgramId` | `values[valueId]` |
| `valueProgramId` | `values[valueId]` |
| `exprId` | `expressions[exprId]` |
| `requestProgramId` | `requests[requestProgramId]` |
| `watchProgramId` | `values[valueId]` |
| `whenProgramId` | `values[valueId]` |
| `actionProgramId` / `actionsProgramId` | `actions[actionId]` |
| `validationModelId` | `validations[modelId]` |
| `rendererBindingId` | `renderers[rendererBindingId]` |
| `transformId` | `transforms[transformId]` |
```

## 20. Admission IR

```ts
interface PackageAdmissionRequest {
  packageOrFragment: ExecutionPackage | ExecutionPackageFragment;
  targetSessionId: string;
  mountPoint?: string;
  trustLevel: 'local' | 'signed-remote' | 'unsigned-remote';
}

interface PackageAdmissionResult {
  ok: boolean;
  admissionId: string;
  attachedTemplateIds?: string[];
  disabledFeatures?: string[];
  diagnostics: PackageDiagnosticsBundle;
}
```

## 21. Recovery / Journal IR

```ts
interface PublishedSnapshot {
  sessionId: string;
  snapshotVersion: string;
  publishSeq: number;
  txId: string;
  committedAt: number;
  scopeSummaries: Record<string, ScopeSummarySnapshot>;
  ownerSummaries: Record<string, OwnerSummaryState>;
  resourceSummaries: Record<string, ResourceState>;
  surfaceSummary: SurfaceSummarySnapshot;
}

interface TransactionJournalEntry {
  txId: string;
  publishSeq: number;
  ownerId: string;
  reversible: boolean;
  forward: ScopeWrite[];
  inverse?: ScopeWrite[];
  arrayIdentity?: ArrayIdentityJournalMetadata[];
  groupId?: string;
  committedAt: number;
}

interface ArrayIdentityJournalMetadata {
  path: string;
  identityMode: 'keyed' | 'index';
  rowKey?: string;
}

interface CheckpointRecord {
  checkpointId: string;
  publishSeq: number;
  txId: string;
  snapshotHash: string;
  committedAt: number;
}
```

## 22. Conformance / Diagnostics Observability IR

IR 必须保留 enough observability 字段，至少包括：

1. `txId`
2. `publishSeq`
3. `admissionId`
4. owner/resource/reaction ids
5. `RuntimeFailureKind`

这是为了响应实验全集里反复强调的 conformance-first 和 debugger explainability。

## 23. 默认值规则

### 必须显式

1. `variant-field.inactiveBranchPolicy`
2. `PackageAdmissionRequest.trustLevel`
3. `LanePolicyDefinition.authoritativeScope`

### 可在 normalize 阶段补默认

1. `retry.strategy = 'fixed'`
2. `resource.publish.mode = 'replace'`
3. `reaction.immediate = false`
4. `reaction.once = false`

## 24. 明确拒绝的 IR 设计

1. 让 package 重新接收 raw schema string formula + runtime parse 作为主执行形态
2. 用单一 generic graph node 吞掉 owner/field/resource/reaction/host 差异
3. 不为 composite field 留专门 IR，只靠 renderer props 猜语义
4. 不为 imports/module policy 留正式位置
