# 14 Concrete Technical Solution

## 1. 目标

本文把前面的 clean-slate 规范进一步压实成**具体实现技术方案**。

这里不是再讲原则，而是明确：

1. 代码用什么技术栈。
2. 内核用什么数据结构。
3. 调度、缓存、依赖、事务怎么落地。
4. 哪些第三方能力可以用，哪些明确不用。

## 1.1 MVP / Platform / Advanced 分层

为了避免平台化过载，本文所有技术方案按三层理解：

### MVP

必须先落地：

1. `ExecutionPackage` 最小骨架
2. runtime session 最小实现
3. transaction kernel
4. owner substrate
5. validation/runtime resource/reaction 的统一 async governance
6. `runtime-facade`

### Platform

第二阶段落地：

1. admission version/trust/namespace 校验
2. snapshot/journal/checkpoint/replay
3. full debugger snapshots
4. host protocol 版本协商

### Advanced

第三阶段增强：

1. remote distribution
2. plugin trust / revocation 完整链路
3. worker offload
4. full persistence backends

## 2. 顶层技术选型

### 2.1 语言与构建

固定选择：

1. `TypeScript` strict mode
2. `ESM-first`
3. `pnpm workspace`
4. `tsc project references`
5. `Vitest`

不选择：

1. Babel-only runtime transpile
2. decorator-heavy metaprogramming
3. runtime-generated code string + `new Function`

原因：

1. 编译期 contract 多，TypeScript 类型系统必须成为一等约束。
2. `ExecutionPackage`、`PublishedSnapshot`、`RuntimeFailureKind` 等 shared DTO 需要在 monorepo 中稳定复用。

### 2.2 Host 层技术

固定选择：

1. `React 19` 作为首个 host adapter
2. `useSyncExternalStore` 作为 React 订阅基线
3. Surface host 仍由 React 承载

不选择：

1. React Context 当 authoritative runtime store
2. Hooks 直接驱动事务主逻辑

### 2.3 State / Store 基线

固定选择：

1. **自研 vanilla store substrate**
2. 每类 store 暴露显式 `getSnapshot()` / `subscribe()` / domain-specific fine-grained subscribe

不选择：

1. 让 `Zustand` 成为 core runtime store substrate
2. 让 React store API 反向定义 runtime model

判断：

1. 当前项目已经证明 vanilla store + `useSyncExternalStore` 是可行路径。
2. 新内核要求 deterministic transaction、owner-local publish、admission/recovery/journal，这些不应被某个 UI store 框架反向约束。

### 2.4 网络与异步

固定选择：

1. 标准 `AbortController`
2. pluggable `fetcher` / `host dispatch` adapter
3. microtask-based transaction queue
4. monotonic sequence ID + owner/lane epoch

不选择：

1. RxJS 作为核心异步 substrate
2. Promise race + ad hoc stale result 判断散落各处

### 2.5 哈希与稳定序列化

固定选择：

1. canonical JSON serialization
2. `SHA-256` package hash

不选择：

1. 依赖对象插入顺序的 `JSON.stringify`
2. 仅用短随机 hash 作为 package identity

原因：

1. `ExecutionPackage` 需要稳定 hash，不只是本地 cache key。
2. 后续 trust、distribution、snapshot compatibility 都依赖稳定 hash。

## 3. Runtime Contracts 的物理落点

共享 contract 一律落在 `runtime-contracts`。

包括：

1. `ExecutionPackage`
2. `ExecutionPackageFragment`
3. `PublishedSnapshot`
4. `ScopeWrite`
5. `RuntimeFailureKind`
6. `RuntimeFailureEnvelope`
7. `CapabilityPermissionManifest`
8. `HostCommandEnvelope`
9. `RuntimeDebugSnapshot`

规则：

1. `package-compiler` 只生产这些 DTO，不拥有它们。
2. `kernel-core` / `host-protocol` / `conformance-kit` 直接依赖这些 contract。

## 4. Execution Package 的具体表示

### 4.1 内存布局

`ExecutionPackage` 在内存中使用**归一化 dictionary + frozen metadata** 表示：

```ts
interface ExecutionPackage {
  packageId: string;
  packageVersion: string;
  frameworkRange: string;
  hash: string;
  entryTemplateId: string;
  templates: Record<string, TemplateDefinition>;
  values: Record<string, ValueProgram>;
  events: Record<string, EventDefinition>;
  actions: Record<string, ActionProgram>;
  validations: Record<string, ValidationModelDefinition>;
  resources: Record<string, ResourceDefinition>;
  reactions: Record<string, ReactionDefinition>;
  renderers: Record<string, RendererBinding>;
  hostContracts: Record<string, HostContractManifest>;
  capabilityContracts: Record<string, CapabilityContract>;
  permissionManifest: CapabilityPermissionManifest;
}
```

技术决策：

1. package 顶层永远是平坦表，不保留 authoring tree 形态。
2. `TemplateNode` 内只保留 ID 引用和最小结构元数据。
3. dev 模式下可 `Object.freeze()` metadata，production 不强制 freeze。

### 4.2 编译器输出格式

固定选择：

1. `ExecutionPackage.json` 作为可序列化产物
2. `ExecutionPackage` 加可选 sidecar source map

不选择：

1. 把 package emit 成 JS module 执行文件
2. runtime 再做 schema compile

### 4.3 Canonicalization 边界

package hash 包含：

1. templates
2. values
3. expressions
4. requests
5. events
6. actions
7. transforms
8. validations
9. resources
10. reactions
11. renderer bindings metadata
12. host/capability contracts
13. permission manifest
14. imports
15. compiler/plugin version metadata
16. migrations

package hash 不包含：

1. source map 内容本体
2. diagnostics 文本内容
3. debug-only fields
4. machine-local absolute path

判断：

1. source map 和 diagnostics 会影响 developer experience，但不应破坏 package identity。
2. 若需要“debug build identity”，应使用单独 debug hash，而不是污染主 package hash。

## 5. Scope 与值模型的具体实现

### 5.1 Canonical value storage

固定选择：

1. canonical values 使用普通 JS object/array 存储
2. path 在编译期或第一次访问时规范化为 segment array
3. 更新走自定义 structural sharing helpers

不选择：

1. Immer 作为核心更新引擎
2. nested Proxy 作为长期运行时值容器

原因：

1. 需要完全可控的 copy path、diff path 和 replay path。
2. array reorder/remove 的 identity remap 需要显式算法，不适合隐藏在 proxy draft 中。

### 5.2 Path representation

```ts
interface CanonicalPath {
  raw: string;
  segments: readonly (string | number)[];
}
```

规则：

1. `raw` 只用于 diagnostics / author-facing references。
2. 热路径只使用 `segments`。
3. path parse 结果全局缓存。

### 5.3 Scope store 实现

```ts
interface ScopeStore {
  getSnapshot(): Record<string, unknown>;
  getLastChange(): ScopeChange;
  setSnapshot(next: Record<string, unknown>, change: ScopeChange): void;
  subscribe(listener: (change: ScopeChange) => void): () => void;
}
```

具体实现：

1. 每个 scope store 内部维护一个 `version: number`
2. 每次 successful apply 后 version 递增
3. `ScopeChange` 记录 `paths`、`kind`、`sourceScopeId`、`txId`

## 6. 依赖跟踪实现

### 6.1 三层索引

固定选择：

1. `rootIndex: Map<string, Set<subscriberId>>`
2. `exactPathIndex: Map<string, Set<subscriberId>>`
3. `collectionShapeIndex: Map<string, Set<subscriberId>>`

不选择：

1. 只保留一个统一大图再做全量遍历

### 6.1.1 Collection shape 命中定义

| 读取模式 | 订阅类型 | 命中的 change |
| --- | --- | --- |
| `items` | root | replace / merge / broad wildcard |
| `items.length` | collection-shape | insert / remove / replace |
| `items[*]` | collection-shape | insert / remove / reorder / replace |
| `items[*].qty` | collection-shape + exact leaf projection | insert / remove / reorder / matching leaf update |
| `items.3.qty` | exact path | exact leaf update / ancestor replace |

规则：

1. reorder 命中 `collection-shape`，不直接命中无关 exact leaf 订阅。
2. object key 枚举与 array shape 读取同属 shape 订阅。
3. wildcard 订阅永远命中所有变更，但必须被记录为高成本订阅。

### 6.2 Runtime collector

表达式求值时插入 collector：

```ts
interface DependencyCollector {
  onRoot(path: string): void;
  onExactPath(path: string): void;
  onCollectionShape(path: string): void;
  onWildcard(): void;
}
```

subscriber 生命周期规则：

1. value/resource/reaction/node-resolution 在创建时注册 subscriber。
2. owner dispose、fragment detach、scope tree dispose 时必须同步注销 subscriber。
3. wildcard/broadAccess subscriber 必须进入 diagnostics，以便性能分析。

### 6.3 编译期辅助

1. 对明显静态的 `dependsOn` 走编译期直接写入
2. 对 runtime formula 走 collector
3. 对 validation 走独立 owner-local closure graph

## 7. Transaction 内核实现

### 7.1 核心对象

```ts
interface RuntimeTransaction {
  txId: string;
  seq: number;
  cause: TransactionCause;
  commitDomain: 'session' | 'owner';
  writes: ScopeWrite[];
  invalidations: DependencyInvalidation[];
  diagnostics: TransactionDiagnostics;
}
```

### 7.2 调度模型

固定选择：

1. 单 session 单 transaction queue
2. microtask drain
3. monotonic `seq`

规则：

1. 任意外部输入只会 `enqueueTxInput()`，不会直接改 store。
2. tx runner 在同一 microtask drain 中执行一个完整 phase pipeline。
3. publish 只发生在 phase 末尾。

### 7.2.1 Flush 语义

```ts
interface EnqueuedTxInput {
  kind: 'write' | 'async-settle' | 'host-snapshot' | 'reconcile' | 'capability-dispatch';
  payload: unknown;
}
```

固定规则：

1. admission 是 session-level atomic attach protocol，不作为普通 `EnqueuedTxInput` 进入 phase runner。
2. `reaction` 触发的新 capability request 必须入 `capability-dispatch` input，不能伪装成普通 `write`。
3. `resource` authoritative result settle 后只能 enqueue `async-settle` input，不能直接 publish。
4. async validation completion 也必须 enqueue 新 transaction；禁止只局部写 validation state 而绕开 publish。
5. owner 已 dispose 时，属于该 owner 的 settle 输入必须变成 `stale-dropped` diagnostics，不再入 apply。

### 7.3 Phase runner 实现

phase 固定为：

1. `collect`
2. `apply`
3. `invalidate`
4. `recompute`
5. `publish`
6. `settle`

每个 phase 使用独立模块：

```text
kernel-core/transaction/
  collect.ts
  apply.ts
  invalidate.ts
  recompute.ts
  publish.ts
  settle.ts
```

### 7.4 写入仲裁实现

固定选择：

1. 在 `collect` 结束前对同一路径 writes 做 sort + collapse
2. 优先级表硬编码在 transaction module

```ts
const WRITE_PRIORITY = {
  'submit': 600,
  'commit': 600,
  'user-input': 500,
  'host-command': 400,
  'resource': 300,
  'reaction': 200,
  'system': 100
} as const;
```

同优先级 tie-break 规则：

1. 先按 `inputArrivalSeq`
2. 再按 `path depth`，父路径 structural op 优先于更深叶子写
3. 再按 `write kind`，`replace/remove/array-move` 优先于普通 leaf `set`

冲突处理规则：

1. `a` 与 `a.b` 同 tx 冲突时，以父路径 structural op 为准，子写进入 diagnostics 记录为 dropped-by-collapse。
2. `array-move` / `array-remove` 与同数组叶子写冲突时，先执行结构变换，再根据 collection identity mode 重写叶子写目标；若无法重写则 dropped-by-collapse。`keyed` / `index` 双模式见 `19-composite-field-lowering-and-identity.md`。

## 8. Async Governance 实现

### 8.1 Owner + lane + epoch

固定选择：

1. `Map<ownerId, OwnerAsyncState>`
2. owner 下再维护 `Map<lane, LaneState>`
3. lane 内维护 `epoch`、`currentRunId`、`recentRuns`

### 8.2 Run identity

```ts
interface AsyncRunIdentity {
  ownerId: string;
  lane: string;
  epoch: number;
  runId: number;
}
```

### 8.3 为什么不用当前式 debug-first async governance

当前实现里的 `createAsyncGovernanceStore()` 主要负责：

1. 记录 current run
2. 记录 recent runs
3. 做 stale-dropped 诊断

新方案要求它进入真正的执行主路径：

1. lane policy
2. timeout/retry
3. authoritative publish gate
4. owner dispose cascade cancel

### 8.4 Lane policy 装配点

lane policy 的来源固定为三层：

1. core default by owner kind / lane kind
2. compiled package override for resource / validation / host command
3. host runtime override only for allowed host-targeted lanes

禁止：

1. renderer 临时拼 lane policy
2. resource controller 私有自定义另一套 retry/dedup 语义

## 9. Resource 具体实现

### 9.1 Resource driver

固定选择：

1. `sync-value`
2. `refresh-capability`

不选择：

1. resource 自己私有一套 API runtime

### 9.2 Resource state storage

```ts
interface ResourceState {
  resourceId: string;
  status: 'idle' | 'loading' | 'ready' | 'refreshing' | 'error';
  stale: boolean;
  inFlightCount: number;
  currentRunId?: string;
  dataUpdatedAt?: number;
  errorUpdatedAt?: number;
}
```

实现细节：

1. resource summary 和 published data 分离存储
2. publish 阶段才把 mapped result 降成 `ScopeWrite[]`
3. resource loop guard 在 dependency hit 和 publish target 之间维护 explicit self-write check

## 10. Reaction 具体实现

### 10.1 Watch state

固定选择：

1. 每个 reaction 持有独立 compiled watch + runtime state
2. reaction 只在 `settle` phase 被调度

### 10.2 Loop guard

固定选择：

1. per-cycle fire count
2. owner/lane stale guard
3. queued change-path coalescing

### 10.3 与当前实现差异

当前实现里 reaction 已有：

1. explicit dependency hit
2. debounce
3. max fire count

新方案保留这些，但把 reaction 完全纳入 transaction/async owner model，不再作为相对独立的 runtime registry。

## 11. Owner substrate 实现

### 11.1 Owner registry

固定选择：

1. `Map<ownerId, OwnerRuntime>`
2. `Map<scopeId, ownerId>`
3. `Map<parentOwnerId, Set<childOwnerId>>`

### 11.2 Owner summary

```ts
interface OwnerSummaryState {
  ownerId: string;
  ownerType: string;
  lifecycleState: OwnerLifecycleState;
  valid?: boolean;
  validating?: boolean;
  ready?: boolean;
  busy?: boolean;
  canSubmit?: boolean;
}
```

### 11.3 Draft owner confirm pipeline

固定实现：

1. `validateAll('commit')`
2. `transformOut`
3. `ScopeWrite[]` for parent owner
4. parent revalidate
5. child owner dispose

## 12. Validation 具体实现

### 12.1 Model representation

固定选择：

1. validation nodes 平坦表
2. order 数组
3. dependents 反向索引
4. fieldStates 平坦表

### 12.2 Field state storage

```ts
type FieldStateMap = Map<string, FieldValidationState>;
```

不选择：

1. nested tree of nested validation state

原因：

1. path-based lookups 更稳定
2. reorder/remove remap 更容易
3. per-path subscription 更自然

### 12.3 Async validation

固定选择：

1. async validation run 复用 async governance substrate
2. submit/commit 优先级高于 change/blur

## 13. Renderer / Host 实现

### 13.1 Resolved node contract generation

固定归属：

1. `runtime-facade/node-resolution/` 负责 runtime-side resolution
2. `react-host/node-renderer/` 负责 host-specific assembly

`ResolvedNodeContract` 的生成输入固定为：

1. `ExecutionPackage`
2. current `PublishedSnapshot`
3. `instancePath`
4. current scope / owner read models

### 13.2 为什么不继续当前的 runtime-in-React 初始化方式

当前 `createSchemaRenderer()`：

1. 在 React component 内 `useMemo(createRendererRuntime)`
2. 在 component 内 create page/surface runtime
3. React context 直接环绕 runtime/page/surface/scope

新方案要求：

1. runtime session 可以脱离 React 存在
2. React 只消费 facade + published snapshot
3. admission/recovery/debugger/conformance 不依赖 React 生命周期

## 14. Host protocol 实现

### 14.1 Host command

固定选择：

1. `HostCommandEnvelope`
2. `expectedProjectionVersion`
3. `idempotencyKey`

### 14.2 Host bridge adapter

```ts
interface DomainBridgeAdapter {
  getSnapshot(): { version: number; data: unknown };
  subscribe(listener: () => void): () => void;
  dispatch(command: HostCommandEnvelope): Promise<HostCommandResultEnvelope>;
}
```

## 15. Persistence / Recovery 实现

### 15.1 Snapshot adapter

固定选择：

1. adapter interface
2. in-memory implementation first
3. browser storage later

```ts
interface SnapshotAdapter {
  load(): Promise<PublishedSnapshot | undefined>;
  save(snapshot: PublishedSnapshot): Promise<void>;
}
```

### 15.2 Journal adapter

```ts
interface JournalAdapter {
  append(entry: TransactionJournalEntry): Promise<void>;
  loadFrom(cursor: JournalCursor): Promise<TransactionJournalEntry[]>;
  writeCheckpoint(record: CheckpointRecord): Promise<void>;
}
```

### 15.3 Replay 原子协议

固定协议：

1. checkpoint 记录 `publishSeq`、`txId`、`snapshotHash`
2. replay 起点必须是 `checkpoint.publishSeq + 1`
3. journal entry 必须携带单调 `publishSeq`
4. 若 replay 时发现 `publishSeq` 或 `txId` 不连续，恢复立即中止并进入 diagnostics-only mode

数组结构写入的可逆表示：

1. `keyed` mode 的 `array-insert` 记录 `index + insertedValue + rowKey`
2. `keyed` mode 的 `array-remove` 记录 `index + removedValue + rowKey`
3. `keyed` mode 的 `array-move` 记录 `from + to + rowKey`
4. `index` mode 只要求记录结构位置与必要值快照，不承诺 stable row continuity
5. inverse patch 按结构写回放，不用通用 diff 反推

## 16. Diagnostics 实现

### 16.1 Hot path policy

固定选择：

1. runtime 只记录 summary-level debug events
2. full debugger snapshot 按需 materialize

### 16.2 Debug event sink

```ts
interface DebugEventSink {
  onTransaction(event: TransactionDebugEvent): void;
  onFailure(event: RuntimeFailureEnvelope): void;
  onAdmission(event: AdmissionDebugEvent): void;
}
```

## 17. 明确拒绝的实现技术

1. 核心 store 建在 React context + state hook 上
2. runtime 直接执行 authoring schema
3. resource / validation / reaction 各自维护完全独立的异步调度协议
4. compiler emit 依赖随机 ID 或不稳定对象顺序
5. renderer 直接 import kernel 内部 owner/store 实现

## 18. 与当前实现相比的现实取舍

新方案不是要求当前就同时拿下 admission/recovery/platform 全家桶。

更现实的顺序应是：

1. 先把当前实现中已成熟的 path store、compiled validation、data-source/reaction stale guard 思路收编进 MVP kernel
2. 再把 admission/journal/recovery 做成 platform layer
3. trust/distribution/worker 最后补齐

## 19. MVP 技术落地顺序

1. `runtime-contracts`
2. `package-compiler`
3. `kernel-core`
4. `kernel-actions`
5. `kernel-owners`
6. `kernel-validation`
7. `runtime-facade`
8. `react-host`
9. `builtin-renderers`
10. `builtin-capabilities`
