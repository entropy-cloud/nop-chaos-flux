# 02 Execution Package And Admission

## 1. Execution Package 的定位

`Execution Package` 是唯一进入执行内核的制品。

它不是：

1. raw schema
2. authoring AST
3. 运行时临时拼装对象

它是：

1. 已完成结构装配的执行包
2. 已完成字段语义定型的执行包
3. 已完成 manifest 汇总、source-map、diagnostics、version metadata 的执行包

## 2. Package 结构

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
```

## 3. Package 不变量

1. template/value/action/resource/reaction id 在一个 package 内唯一。
2. renderer binding 已在编译期解析，不允许 runtime 再做 registry discovery。
3. validation model 已按 owner boundary 分区。
4. host contract、capability contract 必须携带版本信息。
5. `hash` 必须稳定并可重现。
6. 事件定义必须在 package 顶层 `events` 表中全局唯一登记，`TemplateNode.eventRefs` 只保存引用，不再重复成为第二份权威定义。
7. 若使用 import/module policy，必须通过顶层 `imports` 表显式声明。

## 4. 版本协商

```ts
interface PackageMigrationManifest {
  authoredSchemaVersion: string;
  executionFormatVersion: string;
  persistedSnapshotVersion?: string;
  journalVersion?: string;
  hostContractVersions?: Record<string, string>;
  capabilityContractVersions?: Record<string, string>;
  requiredFeatures: string[];
  incompatibleFeatures?: string[];
  fallbackPolicy?: 'reject' | 'warn-and-disable';
}
```

校验顺序固定为：

1. `executionFormatVersion`
2. host contract version
3. capability contract version
4. feature compatibility
5. persisted snapshot / journal version

规则：

1. compiler 负责 authored schema 到 execution format 的迁移。
2. runtime 不负责 authoring migration，只负责 execution compatibility 检查。
3. `warn-and-disable` 只能关闭非核心扩展能力，不能弱化七个 primitive 的主语义。
4. snapshot/journal version 不兼容时必须拒绝恢复，并发出 diagnostics。

## 5. Authoring 到 Package 的 Lowering

| Authoring construct | Lowering target                       | 运行时责任                          |
| ------------------- | ------------------------------------- | ----------------------------------- |
| renderer node       | `TemplateDefinition` / `TemplateNode` | instantiate / render boundary       |
| 普通值字段          | `ValueProgram`                        | 求值、依赖收集、identity reuse      |
| `visible`           | meta program                          | visual presence only                |
| `when`              | activation guard / boundary plan      | lifecycle participation             |
| `loop`              | repeated binding plan                 | repeated instantiate、instancePath  |
| `dynamic-renderer`  | admitted package fragment placeholder | lazy admission                      |
| 事件字段            | `EventDefinition` + `ActionProgram`   | payload normalize + dispatch        |
| `data-source`       | `ResourceDefinition`                  | lifecycle、status、publish、refresh |
| `reaction`          | `ReactionDefinition`                  | watch、post-publish dispatch        |
| validation          | `ValidationModelDefinition`           | owner-local materialization         |
| slot params         | `RegionDefinition.params`             | publish to `$slot` frame            |
| host projection     | `HostContractManifest.projections`    | readonly snapshot admit             |
| host command        | `CapabilityContract` + host manifest  | command validation / dispatch       |
| semantic owner      | `OwnerBoundaryDefinition`             | create/inherit/no-owner             |

规则：

1. 每个 authoring construct 只有一个规范 lowering 目标。
2. debugger、source-map、diagnostics 必须对齐同一 lowering 结果。
3. fragment 只是 admission 时机不同，不能使用第二套 lowering 规则。

```ts
interface EventDefinition {
  eventId: string;
  eventName: string;
  actionProgramId: string;
  payloadShape?: ValueShape;
}

interface CapabilityPermissionManifest {
  allowedCapabilities: string[];
  allowedNamespaces: string[];
  deniedCapabilities?: string[];
  allowedHostContracts?: string[];
}
```

## 6. Compiler Determinism

compiler 必须满足：

1. 同输入、同 profile、同 plugin 集合、同 host manifest、同编译选项，产出相同 package hash。
2. plugin 执行顺序固定。
3. source-map 位置稳定，不受无关遍历顺序影响。
4. diagnostics 排序稳定。

```ts
interface CompilerDeterminismInputs {
  authoringHash: string;
  profileId: string;
  pluginSetHash: string;
  hostManifestHash: string;
  compilerOptionsHash: string;
}
```

## 6.1 Canonicalization Rules

编译器 canonicalization 规则固定如下：

1. object key 必须按稳定字典序输出。
2. diagnostics 必须按 `(severity, sourcePath, line, column, code)` 排序。
3. source-map entries 必须按 `(templateId, sourcePath, startOffset)` 排序。
4. 模板、值、表达式、请求、事件、动作、transform、resource、reaction 的 ID 分配必须只依赖 canonical traversal，不允许依赖对象插入顺序或运行时随机数。
5. `hash` 输入域包含：metadata、templates、values、expressions、requests、events、actions、transforms、validations、resources、reactions、renderers、hostContracts、capabilityContracts、permissionManifest、imports、migrations。
6. `hash` 输入域不包含：时间戳、绝对文件路径、进程 pid、机器名、非稳定插件日志。

## 6.2 Plugin Determinism Contract

compiler plugin 必须满足：

1. pure transform，不读不稳定外部环境。
2. 明确声明自己是否影响最终 package hash。
3. 相同 plugin set 的 canonical 顺序必须稳定。
4. 不允许在 transform 中引入随机 ID、当前时间、进程路径。

## 6.3 Determinism Failure Diagnostics

编译器必须能产出以下 diagnostics：

1. `compiler.nondeterministic-input`
2. `compiler.hash-mismatch`
3. `compiler.unstable-diagnostics-order`
4. `compiler.unstable-source-map-order`
5. `compiler.plugin-impure-transform`

## 7. Admission Protocol

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

admission 顺序：

1. execution format version
2. hash / signature / trust policy
3. host contract and permission manifest
4. id namespace collision check
5. reserve namespace
6. atomic attach

规则：

1. attach 是原子操作，不允许半 attach。
2. 冲突默认 `reject`，不做 silent override。
3. attach 失败必须回滚已分配 namespace 和 runtime side effects。
4. detach 必须 dispose 该 admission 引入的 owner/resource/reaction/handle/async lane。
5. fragment 保留原始 package/fragment hash，同时生成 session-local `admissionId`；debugger 同时展示原始 hash 和 admissionId，避免多次挂载混淆。

## 8. Runtime Session

```ts
interface RuntimeSession {
  sessionId: string;
  packageId: string;
  packageHash: string;
  mount(): void;
  dispose(): void;
  admit(request: PackageAdmissionRequest): PackageAdmissionResult;
  exportSnapshot(): PublishedSnapshot;
  importSnapshot(snapshot: PublishedSnapshot, mode?: 'before-mount' | 'rehydrate'): void;
  subscribe(listener: (snapshot: PublishedSnapshot) => void): () => void;
}

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
```

规则：

1. host 只能订阅 `PublishedSnapshot`，不能订阅 transaction 中间态。
2. `publishSeq` 在同一 session 内单调递增。
3. `importSnapshot(..., 'before-mount')` 可做冷恢复。
4. `importSnapshot(..., 'rehydrate')` 只允许导入兼容 snapshot，并必须进入新的 transaction 做 reconcile。
5. import 后必须重新校验 owner/resource/host projection summary 的一致性。

## 9. 恢复与重绑

恢复顺序固定为：

1. mount package
2. restore scope summaries / owner summaries
3. restore resource summaries
4. rebind host projections
5. re-arm reactions and async lanes
6. publish recovered snapshot

恢复规则：

1. 只恢复 structured-clone-safe state。
2. 不恢复 DOM ref、bridge object、AbortController、timer handle。
3. host/domain owner 的私有状态是否恢复由 host contract 自己决定，但对 kernel 只表现为新的 projection summary。

## 10. 动态装配

remote fragment / lazy package 必须经历同一 admission 流程。

attach 后：

1. 新模板进入当前 session 命名空间。
2. 新 owner boundary 可被 instantiate。
3. source-map 和 diagnostics 必须能追溯到 fragment 来源。

失败后：

1. 回滚 namespace
2. 不留下 owner/resource/reaction 残留
3. 记录 fragment-scoped diagnostics

## 11. 后续阅读

继续读：`03-kernel-transaction-and-async.md`
