# 10 Runtime Module Map

## 1. 目标

本文把“包”继续下钻成“模块”。

这里关心：

1. 核心接口落在哪。
2. 一个包内部至少要有哪些模块。
3. 哪些模块是实现核心，哪些只是装配层。

## 2. `package-compiler` 模块图

```text
package-compiler/
  src/
    authoring-normalizer/
    assembly/
    lowering/
    template-compiler/
    value-compiler/
    event-compiler/
    action-compiler/
    validation-compiler/
    resource-compiler/
    reaction-compiler/
    manifest-compiler/
    source-map/
    diagnostics/
    determinism/
    hash/
    index.ts
```

状态标记：

1. `assembly/` - phase-1 required
2. `lowering/` - phase-1 required
3. `template-compiler/` - phase-1 required
4. `event-compiler/` - phase-1 required
5. `diagnostics/` - phase-1 required
6. `determinism/` - phase-1 required
7. `hash/` - phase-1 required

### 核心模块

#### `assembly/`

职责：

1. profile 组装
2. 静态裁剪
3. extends/merge 解析
4. i18n/static default 展开

#### `lowering/`

职责：

1. 把 authoring constructs 路由到 template/value/event/action/resource/reaction/validation lowering
2. 确保每个 construct 只有一个 lowering owner
3. 负责 `itemKey -> itemKeyPath`、`useItemSchema -> itemTemplate reuse` 等 composite field bridge lowering

#### `determinism/`

职责：

1. canonical traversal
2. stable sort
3. deterministic diagnostics order
4. plugin purity checks

## 3. `kernel-core` 模块图

```text
kernel-core/
  src/
    session/
    scope/
    values/
    dependency/
    transaction/
    async/
    publish/
    resources/
    reactions/
    failures/
    snapshots/
    journal/
    diagnostics/
    index.ts
```

状态标记：

1. `session/` - phase-2 required
2. `scope/` - phase-2 required
3. `values/` - phase-2 required
4. `dependency/` - phase-2 required
5. `transaction/` - phase-2 required
6. `async/` - phase-2 required
7. `publish/` - phase-2 required
8. `resources/` - phase-2 required
9. `reactions/` - phase-2 required
10. `failures/` - phase-2 required
11. `snapshots/` - phase-2 required
12. `journal/` - stub until phase-7
13. `diagnostics/` - minimal sink in phase-2, full model later

### 核心模块

#### `session/`

职责：

1. `RuntimeSession`
2. admission attach/detach orchestration
3. snapshot import/export

#### `transaction/`

职责：

1. tx construction
2. phase runner
3. write arbitration
4. commit domain handling

#### `async/`

职责：

1. lane registry
2. run lifecycle
3. authoritative publish gate
4. timeout/retry/concurrency handling

#### `failures/`

职责：

1. `RuntimeFailureKind`
2. `RuntimeFailureEnvelope`
3. source -> failure mapping helpers

#### `journal/`

职责：

1. `TransactionJournalEntry` emit/load
2. keyed / index array identity metadata persistence
3. replay continuity checks
4. checkpoint anchor and cursor handling

## 4. `kernel-actions` 模块图

```text
kernel-actions/
  src/
    resolver/
    capability-pipeline/
    action-runtime/
    branch-runtime/
    parallel-runtime/
    finally-runtime/
    result-envelope/
    index.ts
```

### 关键接口

```ts
interface CapabilityPipeline {
  validateArgs(request: CapabilityRequest): void;
  checkPermissions(request: CapabilityRequest): void;
  resolveTarget(request: CapabilityRequest): ResolvedCapability;
  execute(request: CapabilityRequest): Promise<CapabilityResultEnvelope>;
}
```

## 5. `kernel-validation` 模块图

```text
kernel-validation/
  src/
    model/
    materialization/
    field-state/
    overlays/
    async-validation/
    edge-cases/
    summary/
    index.ts
```

### 关键模块

#### `edge-cases/`

职责：

1. hidden/disabled/readonly/suspended
2. variant switch
3. reorder/remove migration
4. stale async validation drop

## 6. `kernel-owners` 模块图

```text
kernel-owners/
  src/
    owner-runtime/
    page-owner/
    form-owner/
    draft-owner/
    surface-owner/
    collection-owner/
    domain-host-owner/
    child-contract/
    composite-values/
    structural-sharing/
    index.ts
```

### 关键模块

#### `draft-owner/`

职责：

1. draft scope lifecycle
2. confirm/cancel pipeline
3. `transformOut` orchestration
4. row draft commit target freeze / resolve

#### `collection-owner/`

职责：

1. row identity map
2. row scope cache
3. collection-shape invalidation
4. reorder/remove migration handoff to validation
5. consume compiled keyed / index identity mode
6. rowKey derivation and continuity-risk diagnostics

## 7. `host-protocol` 模块图

```text
host-protocol/
  src/
    manifests/
    projection/
    commands/
    domain-bridge/
    permissions/
    handles/
    index.ts
```

### 关键模块

#### `commands/`

职责：

1. `HostCommandEnvelope`
2. command lifecycle phase
3. projection version checks
4. idempotency helpers

## 8. `renderer-contracts` 模块图

```text
renderer-contracts/
  src/
    definitions/
    template-bindings/
    regions/
    events/
    node-contract/
    metadata/
    index.ts
```

补充说明：

1. `ResolvedNodeContract` 的生成责任不属于 renderer 组件本身。
2. 它由 `runtime-facade` + `react-host/node-renderer` 共同完成：前者提供 resolved runtime view，后者负责 host-specific assembly。
3. `null-renderer` 仍是 runtime node family，不等于“必须依赖 React 才能存在”的无 UI 组件。

### 关键接口

```ts
interface RendererDefinition {
  rendererType: string;
  rendererClass: 'instance-renderer' | 'owner-renderer' | 'domain-host-renderer' | 'null-renderer';
  propContracts: Record<string, unknown>;
  eventContracts?: Record<string, unknown>;
}
```

## 8.1 `runtime-facade` 模块图

```text
runtime-facade/
  src/
    session-facade/
    node-resolution/
    owner-read-model/
    resource-read-model/
    capability-entry/
    validation-entry/
    surface-entry/
    hooks-api/
    index.ts
```

最小 API 面：

```ts
interface RuntimeFacade {
  getPublishedSnapshot(): PublishedSnapshot;
  subscribe(listener: (snapshot: PublishedSnapshot) => void): () => void;
  resolveNodeContract(input: NodeResolutionInput): ResolvedNodeContract;
  dispatch(request: CapabilityRequest): Promise<CapabilityResultEnvelope>;
}
```

规则：

1. `runtime-facade` 是 UI 层唯一允许直接依赖的运行时入口。
2. 它只能暴露稳定公开 API，不得成为新的语义 owner。

## 9. `react-host` 模块图

```text
react-host/
  src/
    runtime-context/
    hooks/
    schema-renderer/
    node-renderer/
    region-renderer/
    surface-host/
    host-snapshot-subscription/
    debugger-hooks/
    index.ts
```

### 规则

1. hooks 只消费 published snapshot 或 resolved node contract。
2. node-renderer 不得拥有 kernel 主逻辑。
3. surface-host 只做渲染与订阅，不成为第二状态源。
4. `react-host` 应只依赖 `runtime-facade` 的公开 API，不应直连 kernel 内部模块。

## 10. `builtin-renderers` 模块图

```text
builtin-renderers/
  src/
    page/
    form/
    fields/
    collections/
    surfaces/
    display/
    workbench/
    index.ts
```

### 规则

1. 每个 renderer 目录同时导出 metadata 和 UI 实现。
2. `data-source` / `reaction` 归 `null-renderer` 家族，仍在 builtin-renderers 中注册。
3. `null-renderer` 的主要生命周期语义在 kernel/runtime-facade 中完成；React 侧只是在需要时承载其 mount/unmount 对齐。

## 11. `conformance-kit` 模块图

```text
conformance-kit/
  src/
    cases/
    fixtures/
    package-fixtures/
    snapshot-fixtures/
    journal-fixtures/
    assertions/
    runner/
    index.ts
```

### 最关键子目录

#### `cases/`

按协议大类拆：

1. compiler-determinism/
2. admission/
3. transaction/
4. async/
5. validation/
6. host-command/
7. recovery/
8. collaboration/

## 12. 代码落点总表

| Concern | Package | Module |
| --- | --- | --- |
| package hash | `package-compiler` | `hash/` |
| canonicalization | `package-compiler` | `determinism/` |
| tx phases | `kernel-core` | `transaction/` |
| failure taxonomy | `kernel-core` | `failures/` |
| lane policy | `kernel-core` | `async/` |
| action DAG execution | `kernel-actions` | `action-runtime/` |
| validation edge cases | `kernel-validation` | `edge-cases/` |
| draft confirm/transformOut | `kernel-owners` | `draft-owner/` |
| row identity/cache | `kernel-owners` | `collection-owner/` |
| composite field lowering bridge | `package-compiler` | `lowering/` |
| host command envelope | `host-protocol` | `commands/` |
| node contract | `renderer-contracts` | `node-contract/` |
| React hooks | `react-host` | `hooks/` |
| conformance runner | `conformance-kit` | `runner/` |
