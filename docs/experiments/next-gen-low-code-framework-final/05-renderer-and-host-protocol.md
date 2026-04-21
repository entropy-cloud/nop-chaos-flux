# 05 Renderer And Host Protocol

## 1. Renderer contract

renderer contract 分两层：

1. host-neutral node execution contract
2. concrete host adapter

```ts
interface ResolvedNodeContract {
  nodeId: string;
  templateNodeId: string;
  instancePath?: InstanceFrame[];
  props: Record<string, unknown>;
  meta: ResolvedNodeMeta;
  regions: Record<string, ResolvedRegionHandle>;
  events: Record<string, ResolvedEventHandler | undefined>;
  helpers: RuntimeHelpers;
}
```

## 2. Renderer 分类

1. `instance-renderer`
2. `owner-renderer`
3. `domain-host-renderer`
4. `null-renderer`

规则：

1. `instance-renderer` 不引入 owner boundary。
2. `owner-renderer` 引入 form/draft/collection/surface 等 Flux-native owner boundary。
3. `domain-host-renderer` 暴露 host projection 和 namespaced capability，但不暴露私有 domain store。
4. `null-renderer` 不产生可视 UI，只负责 runtime-owned node lifecycle，例如 `data-source`、`reaction`。

## 3. React host 责任

1. 暴露 Runtime Session 给 hooks。
2. 渲染 `ResolvedNodeContract`。
3. 订阅 `PublishedSnapshot`。
4. 管理 DOM/container/ref bridge。
5. 承载 surface host。

规则：

1. React 不能订阅 transaction 中间态。
2. React 不能成为 surface summary 或 owner summary 的第二来源。
3. hooks 只是读取 runtime published state，不得绕过 capability 或 transaction 直接写 store。

## 4. Region / Fragment 规则

1. 参数化 region 的 bindings 发布到 `$slot` frame。
2. repeated region render 必须带 `instancePath`。
3. `render({ scope })` 与 `render({ bindings })` 的边界必须显式。
4. 不允许隐式 index-only repeated identity 成为唯一 contract。

## 5. Host Projection

```ts
interface HostContractManifest {
  hostType: string;
  version: string;
  projections: Record<string, ProjectionShape>;
  commands: Record<string, CommandShape>;
  summaryShape?: ProjectionShape;
  snapshotVersionField?: string;
}
```

规则：

1. projection 是 readonly snapshot admission。
2. projection DTO 必须 immutable、structured-clone-safe、无函数引用。
3. host own subtree 之外的 consumer 只能读取显式 summary DTO。

## 6. DomainBridge

```ts
interface DomainBridge<TSnapshot, TCommand, TResult> {
  getSnapshot(): { version: number; data: TSnapshot };
  subscribe(listener: () => void): () => void;
  dispatch(command: TCommand): Promise<TResult>;
  dispose?(): void;
}
```

规则：

1. snapshot version 必须单调递增。
2. subscribe 回调里不允许同步重入新的 host snapshot publish。
3. 若 host 需要联动 dispatch，必须进入新的 microtask / transaction。

## 7. Command Result Taxonomy

host command / domain command 必须复用 `03-kernel-transaction-and-async.md` 定义的统一 `RuntimeFailureKind`，本文件不再自定义第二套 taxonomy。

## 7.1 Host Command Envelope

```ts
interface HostCommandEnvelope {
  commandId: string;
  correlationId: string;
  target: 'host' | 'owner' | 'handle';
  targetId?: string;
  commandName: string;
  args: unknown;
  issuedAtSeq: number;
  expectedProjectionVersion?: number;
  idempotencyKey?: string;
  timeoutMs?: number;
}
```

规则：

1. 所有 host command 都必须带 `commandId` 和 `correlationId`。
2. 若 command 依赖当前 host snapshot，必须携带 `expectedProjectionVersion`。
3. 结果分类必须映射到统一 `RuntimeFailureKind`。

## 7.2 Command Lifecycle Phase

host command 的生命周期阶段与失败分类分开定义。

phase 只有：

1. `accepted`
2. `running`
3. `settled`

settled 后的 terminal result 必须映射到 `03-kernel-transaction-and-async.md` 定义的 `RuntimeFailureKind`，或 `success`。

规则：

1. `expectedProjectionVersion` 过期时，host 可返回 `stale-dropped` 或要求 caller 重试。
2. target handle 不存在时，默认映射到 `contract-mismatch`。
3. handle 已 dispose 且 command 迟到时，默认映射到 `stale-dropped`。

## 8. Component Handle Protocol

handle 只作为 instance-targeted capability target。

规则：

1. handle 生命周期跟随 owner lifecycle。
2. handle 不得泄露 document/store/controller。
3. handle methods 必须进入 capability resolution，而不是裸函数直接调用。

## 9. Surface host

```ts
interface SurfaceRuntime {
  open(entry: SurfaceOpenRequest): SurfaceEntry;
  close(surfaceId: string): void;
  getActive(): SurfaceEntry | undefined;
  subscribe(listener: () => void): () => void;
}

interface SurfaceEntry {
  surfaceId: string;
  kind: 'dialog' | 'drawer' | 'sheet' | 'popover';
  ownerId: string;
  scopeId: string;
  active: boolean;
  zOrder: number;
}

interface SurfaceSummarySnapshot {
  activeSurfaceId?: string;
  stack: Array<{ surfaceId: string; kind: string; ownerId: string; active: boolean }>;
}
```

规则：

1. root host 统一渲染 surface stack。
2. 只有顶层 active surface 拥有 focus trap、escape、backdrop dismiss。
3. close 后恢复前一个 active surface。

## 10. 后续阅读

继续读：`06-persistence-journal-collaboration.md`
