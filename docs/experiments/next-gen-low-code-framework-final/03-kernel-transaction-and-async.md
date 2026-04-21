# 03 Kernel Transaction And Async

## 1. Scope 与 Value

```ts
interface ScopeFrame {
  scopeId: string;
  parentScopeId?: string;
  ownerId: string;
  rootPath: string;
  kind: 'page' | 'form' | 'draft' | 'row' | 'slot' | 'host-projection' | 'fragment';
  store: ScopeStore;
}

interface ScopeStore {
  getOwnSnapshot(): Record<string, unknown>;
  getVisibleSnapshot(): Record<string, unknown>;
  read(path: string): unknown;
  has(path: string): boolean;
  write(change: ScopeWrite): void;
  subscribe(listener: (change: ScopeChange) => void): () => void;
}

type ValueProgram =
  | { kind: 'static'; value: unknown }
  | { kind: 'expr'; exprId: string }
  | { kind: 'template'; templateId: string }
  | { kind: 'array'; items: string[] }
  | { kind: 'object'; entries: Record<string, string> }
  | { kind: 'source-ref'; sourceDefId: string };
```

规则：

1. `Scope` 是数据环境，不是行为注册表。
2. `Value` 求值不允许产生副作用。
3. 静态子树必须零开销返回原引用。
4. 动态值若语义不变，应尽量复用旧引用。

## 2. Dependency 粒度

依赖模型采用分层粒度：

| Granularity | 用途 |
| --- | --- |
| lexical root | 普通 value/resource/reaction invalidation |
| exact path | validation、draft patch、write diagnostics |
| collection-shape | row materialization、virtualization、structural change |
| wildcard | whole-scope enumeration |

```ts
interface DependencySet {
  roots: readonly string[];
  exactPaths?: readonly string[];
  collectionShapes?: readonly string[];
  wildcard: boolean;
  broadAccess: boolean;
}
```

规则：

1. `dependsOn` 显式声明优先。
2. 普通 value 默认 runtime root tracking。
3. validation 使用 owner-local exact-path closure，但不能反向扩大普通 dataflow 粒度。
4. collection owner 必须把 parent collection change 翻译为 row-local change。

## 3. Scope 写入语言

```ts
interface ScopeWrite {
  scopeId: string;
  path: string;
  op: 'set' | 'merge' | 'replace' | 'remove' | 'array-insert' | 'array-remove' | 'array-move';
  value?: unknown;
  meta?: ScopeWriteMeta;
}

interface ScopeWriteMeta {
  source: 'user-input' | 'resource' | 'reaction' | 'submit' | 'host-command' | 'system';
  ownerId?: string;
  txId?: string;
  runId?: string;
}
```

规则：

1. 所有最终 publish 都必须 lowering 到 `ScopeWrite[]`。
2. structural sharing 是唯一允许的数据写入基线。
3. 任何 write provenance 都必须进入 diagnostics。

## 4. Transaction 对象

```ts
interface RuntimeTransaction {
  txId: string;
  cause: TransactionCause;
  startedAt: number;
  commitDomain: 'session' | 'owner';
  writes: ScopeWrite[];
  ownerEffects: OwnerEffect[];
  resourcePublications: ResourcePublication[];
  reactionQueue: ReactionTrigger[];
  diagnostics: TransactionDiagnostics;
}
```

## 5. 固定执行阶段

1. `collect`
2. `apply`
3. `invalidate`
4. `recompute`
5. `publish`
6. `settle`

语义：

1. `collect` 接收 write / async settle / host snapshot replacement。
2. `apply` 只做值更新和 owner-local structural change。
3. `invalidate` 按 dependency set 标记重算目标。
4. `recompute` 重算 value/resource status/owner summary/validation materialization。
5. `publish` 产生新的 `PublishedSnapshot`。
6. `settle` 才允许 reaction enqueue 和下一轮 async scheduling。

## 6. Deterministic Commit 语义

规则：

1. 默认 commit domain 是 `session`。
2. `owner` 级 commit 只用于 detached child runtime 或 offscreen precompute；进入 host 可见边界前仍要合并到 session-level publish。
3. 同一 event-loop tick 内的多个 async settle 必须按 `(arrivalSeq, lanePriority, runEpoch, runId)` 线性化。
4. reaction 不得在当前 transaction 的 `apply/recompute` 阶段重入。
5. host 和 React 只能看到 publish 后的稳定快照。

## 7. 写入仲裁

同一路径默认优先级：

1. `submit/commit`
2. `user-input`
3. `host-command`
4. `resource publication`
5. `reaction`
6. `system`

规则：

1. 更高优先级可覆盖同 transaction 内更低优先级写入。
2. `resource publication` 不得覆盖已经开始的 submit/commit authoritative snapshot。
3. remote patch 不直接进仲裁表，必须先经 collaboration policy 归类后再入 transaction。

## 8. Async Governance

```ts
interface AsyncRun {
  runId: string;
  ownerId: string;
  lane: string;
  cause: string;
  epoch: number;
  priority: 'critical' | 'high' | 'normal' | 'low';
  status: 'queued' | 'running' | 'done' | 'error' | 'cancelled' | 'stale-dropped';
  startedAt?: number;
  settledAt?: number;
  abortController?: AbortController;
  result?: unknown;
  error?: unknown;
}

type ConcurrencyPolicy = 'cancel-previous' | 'ignore-new' | 'parallel' | 'queue';

interface LanePolicy {
  concurrency: ConcurrencyPolicy;
  timeoutMs?: number;
  retry?: RetryPolicy;
  authoritativeScope: 'lane' | 'owner' | 'target-path';
}
```

每个 owner 下存在多个 lane，例如：

1. `resource:companyLookup`
2. `validation:user.email`
3. `submit:mainForm`
4. `domain:designer.save`

规则：

1. `submit` lane 默认等待同 owner 内必需 validation lane，但不等待无关 resource lane。
2. owner dispose 后，该 owner 下所有 lane 必须进入 `cancelled` 或 `stale-dropped`。
3. 旧 run 只能发布到 diagnostics channel，不能覆盖新的 authoritative publish。

## 9. Failure Taxonomy

所有 capability/resource/reaction/validation/domain command 的失败都必须归一到同一 taxonomy：

```ts
type RuntimeFailureKind =
  | 'business-error'
  | 'infra-error'
  | 'validation-error'
  | 'cancelled'
  | 'timeout'
  | 'stale-dropped'
  | 'permission-denied'
  | 'contract-mismatch';
```

```ts
interface RuntimeFailureEnvelope {
  kind: RuntimeFailureKind;
  origin: 'resource' | 'capability' | 'validation' | 'host-command' | 'reaction' | 'collaboration';
  code?: string;
  message?: string;
  retryable: boolean;
  userVisible: boolean;
  authoritativeImpact: 'none' | 'summary-only' | 'publish-blocking';
}
```

规则：

1. `business-error` 表示语义上可预期的失败。
2. `infra-error` 表示 transport、bridge、host runtime、plugin failure。
3. `stale-dropped` 不是异常，但必须留 diagnostics。
4. `cancelled` 与 `timeout` 不得伪装成普通 business error。

### 9.1 Failure 映射表

| Source | Mapped kind |
| --- | --- |
| host contract version mismatch | `contract-mismatch` |
| denied capability / namespace | `permission-denied` |
| async validation 被新输入淘汰 | `stale-dropped` |
| host command timeout | `timeout` |
| user-cancelled command | `cancelled` |
| domain semantic reject | `business-error` |
| fetch/bridge crash | `infra-error` |

### 9.2 Failure 与 Publish 的关系

1. `stale-dropped` 只进入 diagnostics，不改变 authoritative publish。
2. `business-error` / `validation-error` 可 materialize 到 owner/resource summary。
3. `contract-mismatch` / `permission-denied` 默认阻断对应 capability 执行，但不必阻断整个 session publish。
4. 只有被标记为 `publish-blocking` 的 failure 才能阻断当前 target 的 authoritative publish。

## 10. Resource 与 Reaction 的事务边界

1. Resource 的 async 刷新必须以 lane 驱动，结果 settle 后开启新 transaction。
2. Resource publish 只能通过 lowering 到 `ScopeWrite[]` 完成。
3. Reaction dispatch 永远晚于触发它的 publish。
4. Reaction 造成的新写入必须进入新的 transaction，而不是直接追加到当前 publish。

## 11. Concurrency 示例

### 用户输入 vs reaction

1. 用户输入 `setValue`
2. 当前 transaction publish
3. reaction 在 `settle` 阶段发现条件命中
4. reaction 发起新的 capability request
5. capability result 进入下一 transaction

### 并行 resource

1. lane policy 为 `parallel`
2. run-1 和 run-2 同时在 flight
3. run-1 晚于 run-2 返回
4. publish gate 只允许当前 authoritative run 发布
5. run-1 标记为 `stale-dropped`

## 12. 核心不变量

1. 所有异步 settle 都要开启新 transaction。
2. owner summary、resource state、validation summary 必须和对应值写入同轮 publish。
3. owner dispose 必须取消或失活所有未完成 async activity。
4. 同一输入、同一 settle 顺序、同一 host snapshot 序列下，publish 序列必须确定。

## 13. 后续阅读

继续读：`04-owner-validation-and-data-model.md`
