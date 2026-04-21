# 16 Current Implementation Comparison

## 1. 目标

本文不是泛泛说“新方案更好”，而是把当前实现的真实结构和新方案逐项对比，说明：

1. 现在是什么。
2. 新方案决定改什么。
3. 为什么改。
4. 哪些现有判断应保留。

## 1.1 比较边界说明

本文的比较对象是当前 `flux-core`、`flux-runtime`、`flux-react` 的**主路径实现**，不是未来架构文档的目标态。

因此：

1. 这里比较的是当前代码的真实组织方式。
2. 不拿未来文档目标态去反向苛责当前代码。

## 2. 当前实现的真实中心

从当前代码看，现状有几个中心：

### 2.1 `createRendererRuntime` 是总装配入口

当前 `packages/flux-runtime/src/runtime-factory.ts` 中：

1. runtime 创建 expression compiler
2. runtime 创建 schema compiler
3. runtime 创建 page runtime / surface runtime / form runtime
4. runtime 连接 source registry / reaction registry / async governance / action dispatcher

结论：

当前 runtime 的能力边界偏大，已经接近一个 God Runtime，总装太重。

### 2.2 React host 直接创建 runtime/page/surface

当前 `packages/flux-react/src/schema-renderer.tsx`：

1. 在 React `useMemo()` 中创建 runtime
2. 在 React component 内创建 page runtime / surface runtime
3. 用 context 直接包住 runtime/page/surface/scope

结论：

React host 仍是运行时生命周期的重要拥有者。

同时必须承认它的现实收益：

1. 单 React host 场景下 bootstrapping 更简单。
2. 调试链路更直观。
3. 当前 renderer API 更容易理解。

### 2.3 `FormRuntime` 仍是验证与字段状态的实现重心

当前 `packages/flux-runtime/src/form-runtime.ts`：

1. form store
2. field registration
3. validation runs
4. child contracts
5. subtree validation
6. array ops remap

结论：

虽然架构文档已经在往 owner substrate 走，但实现重心仍然是 `FormRuntime`。

### 2.4 data-source 与 reaction 已经有局部异步治理

当前：

1. `data-source-runtime.ts` 有 active request、request sequence、stale handling、structural share
2. `reaction-runtime.ts` 有 debounce、queued paths、fire count limit、async governance integration
3. `async-governance.ts` 已有 stale-dropped 诊断

结论：

当前实现已经识别了异步治理问题，但治理还没有收成统一内核。

## 3. 具体对比

## 3.1 Runtime 总装

| 维度 | 当前实现 | 新方案 |
| --- | --- | --- |
| runtime create | `createRendererRuntime()` 大总装 | `RuntimeSession + runtime-contracts + runtime-facade` 分层 |
| React 角色 | 创建 runtime/page/surface | 只消费 facade + published snapshot |
| compiler 关系 | runtime 内部直接创建/持有 compiler | compiler 独立生产 `ExecutionPackage` |

判断：

1. 当前实现适合快速内聚开发。
2. 新方案更适合 admission/recovery/conformance/debugger/多 host。

## 3.2 Scope / Store

| 维度 | 当前实现 | 新方案 |
| --- | --- | --- |
| scope storage | vanilla scope store + page/form stores | 继续 vanilla，但统一成 shared transaction substrate |
| path operations | 已有 path-based update | 保留并强化为 parsed-segment hot path |
| React subscription | `useSyncExternalStore` 已在用 | 保留 |

判断：

当前实现这块方向基本正确，新方案主要是更硬化 contract，而不是推倒重来。

应明确保留的资产：

1. `ScopeStore`
2. `ScopeRef`
3. path utils (`parsePath/getIn/setIn`)
4. React `useSyncExternalStore` 订阅模式

## 3.3 Validation

| 维度 | 当前实现 | 新方案 |
| --- | --- | --- |
| 主实现中心 | `FormRuntime` | `OwnerRuntime + ValidationOwnerRuntime` |
| compiled model | 平坦 nodes + dependents + order | 保留 |
| edge cases | 已覆盖很多 form-level细节 | 提升为 owner-level规范和 conformance family |

判断：

当前的 compiled validation model 是应保留的强资产；需要替换的是 form-centered orchestration。

## 3.4 Data source / Resource

| 维度 | 当前实现 | 新方案 |
| --- | --- | --- |
| producer model | formula 与 api data-source 分实现，但已共享部分 async governance、dependency tracking、structural sharing 思路 | `sync-value` + `refresh-capability` 两种 driver |
| publish | controller 直接写 scope/status | 统一 lowering 到 `ScopeWrite[]` |
| stale handling | request sequence + async governance | owner/lane/epoch authoritative gate |

判断：

当前实现已经有大量可复用算法，但仍是 controller-local 协议，新方案把它提升为统一 transaction contract。

## 3.5 Action runtime

当前实现已有成熟资产：

1. compiled action program
2. namespaced action dispatch
3. timeout/retry/control integration
4. component target / surface action

新方案不否定这些，而是要求把它们进一步收编到 `capability single-exit + transaction pipeline` 下。

## 3.6 Reaction

| 维度 | 当前实现 | 新方案 |
| --- | --- | --- |
| watch eval | compiled watch + runtime state | 保留 |
| scheduling | reaction registry 自己调度 | transaction settle + async lane 统一调度 |
| loop guard | max fire count + queued paths | 保留并纳入统一 diagnostics |

## 3.7 Async governance

| 维度 | 当前实现 | 新方案 |
| --- | --- | --- |
| 目标 | 调试与 stale explain | 真正治理 lane/policy/publish |
| owner model | owner current run + recent runs | owner + lane + epoch + policy |
| scope | mostly source/reaction/validation owners | all async-bearing subsystems |

## 3.8 Host projection

当前 `runtime-factory.ts` 里的 `createHostProjectionScope()` 已经明确：

1. projection fields 只读
2. 写 projected host field 会抛错

新方案保留这条判断，但会把它从 runtime helper 提升成：

1. package contract
2. host protocol
3. conformance family

## 3.9 Package / Admission

| 维度 | 当前实现 | 新方案 |
| --- | --- | --- |
| runtime input | schema + runtime compile | `ExecutionPackage` only |
| fragment attach | 未形成统一 admission 协议 | version/trust/namespace/atomic attach |
| recovery | 局部 runtime state | snapshot + journal + checkpoint + replay |

这是当前实现与新方案差异最大的部分。

## 3.10 Import / module cache / extension chain

当前实现已经有：

1. module cache
2. imports manager
3. runtime namespace binding

新方案不应忽略这条资产链。它未来应映射到：

1. compiler-level import normalization
2. admission-time fragment/module policy
3. capability / host contract extension registration

## 4. 当前实现保留项

以下内容不应被 clean-slate 误伤：

1. `useSyncExternalStore` 订阅模型
2. path-based structural updates
3. compiled validation model 平坦结构
4. host projection 只读边界
5. data-source 中对 structural share 和 stale sequence 的意识
6. reaction 的 fire-count safety guard

## 5. 当前实现替换项

以下内容是新方案明确要替换或重构的：

1. `createRendererRuntime` 总装一体化
2. React host 创建 runtime/page/surface 的生命周期中心地位
3. form-centered owner orchestration
4. resource / reaction / validation 各自持有一部分 async protocol
5. schema runtime compile 作为主执行入口

## 6. 为什么新方案更高性能

更准确地说，是：

**为什么新方案更有机会实现可控性能。**

不是因为“新”，而是因为它把成本热点真正抽成了内核级对象：

1. `ExecutionPackage` 避免 runtime 反复 compile
2. transaction collapse 避免多次中间 publish
3. owner/lane/epoch 减少 stale async 二次写入
4. row identity split 减少 collection 重建成本
5. facade + explicit caches 让 node resolution 更容易控成本

## 7. 为什么新方案更可扩展

1. 共享 contract 不再隐含在 runtime/react/compiler 之间
2. host protocol、renderer contract、capability contract 都有明确物理 owner
3. conformance catalog 可以先于完整功能面稳定
4. 实验阶段就明确了哪些是不可扩展的 core invariants

## 8. 对当前仓库的现实启示

即使现在不重写，也能从新方案反推几个现实改进方向：

1. 逐步把 `ExecutionPackage` 从 runtime compile 中抽出来
2. 逐步把 async governance 从 debug substrate 升为统一治理层
3. 逐步把 `FormRuntime` 的 owner 责任拆给更底层 substrate
4. 逐步让 React host 只依赖 facade 而不是 runtime internals

## 9. 总结

当前实现并不是“错的”，而是：

1. 语义判断很多是对的
2. 实现组织还不够硬边界
3. admission/session/recovery/performance-extensibility 的技术方案还没完全收口

新的具体技术方案保留了当前实现最强的资产，但把真正困难的地方从“局部聪明实现”提升为“统一内核 contract”。
