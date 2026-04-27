# 在实现复杂度约束下，Flux 最值得做的架构升级

## 目的

本文只回答一个务实问题：

**如果把实现复杂度、迁移成本、验证成本、团队理解成本一起算进去，当前 Flux 最值得做的架构升级是什么？**

本文明确不讨论：

- clean-slate 重写
- 新内核幻想
- 只在概念上优雅、但落地成本失控的方案

## 结论

在“收益 / 实现复杂度 / 风险 / 代码复用率”四个维度一起衡量后，当前 Flux 最值得优先做的不是新架构，而是下面 5 类升级：

1. 统一异步结果 authoritative/stale 判定协议
2. 给 `ScopeChange` 补齐写入来源与 revision 元数据
3. 在 host projection 和 capability 返回值边界引入 schema-safe normalization
4. 为 value-oriented family 提取窄共享 substrate
5. 分解 `RendererRuntime` 内部服务，但保持外部 facade 不变

如果只保留一句建议：

**Flux 应该吸收更强的一致性协议和更窄的共享基底，而不是发明一个新的总内核。**

## 评估标准

每个候选升级按四项评估：

1. 收益
   是否直接解决当前或高概率即将出现的问题。
2. 实现复杂度
   需要改多少模块，是否涉及大面积 API 变化。
3. 风险
   是否容易破坏现有七原语闭包、owner 边界或 React/runtime 语义。
4. 复用率
   能否建立在已有 `flux-core` / `flux-runtime` / `flux-react` 资产上，而不是另起炉灶。

评分规则：

- 收益：高 / 中 / 低
- 复杂度：低 / 中 / 高
- 风险：低 / 中 / 高
- 复用率：高 / 中 / 低

## 排名

| 排名 | 升级项 | 收益 | 复杂度 | 风险 | 复用率 |
| --- | --- | --- | --- | --- | --- |
| 1 | Async authoritative/stale 协议 | 高 | 低 | 低 | 高 |
| 2 | `ScopeChange.source + revision` | 高 | 低 | 低 | 高 |
| 3 | Schema-safe normalization | 高 | 低 | 低 | 高 |
| 4 | Value-oriented shared substrate | 高 | 中 | 中 | 中 |
| 5 | `RendererRuntime` 内部分层 | 中 | 中 | 低 | 高 |
| 6 | Null-safe expression + renderer error boundary | 中 | 低 | 低 | 高 |
| 7 | diagnostics source-location 回溯链 | 中 | 中 | 低 | 中 |
| 8 | 窄订阅与依赖追踪收紧 | 高 | 中 | 中 | 中 |

说明：

- 前 5 项是“最值得写代码”的升级。
- 6-8 项也值得做，但优先级略低或范围更广。

## 1. Async authoritative/stale 协议

### 为什么排第一

当前 Flux 已经有：

- action timeout / retry / cancel
- source refresh 与 stale handling
- reaction async governance
- async validation

问题不是完全没有能力，而是规则分散。

最现实的缺口是：

- 旧异步结果覆盖新状态
- 不同子系统对 stale 的处理方式不一致
- debugger 很难回答“为什么这个结果被丢弃”

### 建议实现

只引入一个窄协议，不引入新内核：

```ts
interface AsyncEvaluationEpoch {
  ownerId: string;
  epoch: number;
  cause: 'mount' | 'invalidate' | 'manual' | 'retry';
}

interface AsyncEpochController {
  begin(cause: AsyncEvaluationEpoch['cause']): AsyncEvaluationEpoch;
  isCurrent(epoch: AsyncEvaluationEpoch): boolean;
  cancel(epoch: AsyncEvaluationEpoch): void;
}
```

先覆盖：

1. API/data-source
2. reaction
3. async validation

### 评估

- 收益：高
- 复杂度：低
- 风险：低
- 复用率：高

### 为什么不是完整 lane/kernel

因为完整 async lane/concurrency kernel 现在太重。

当前最值得先做的是：

- 统一 epoch
- authoritative run 判定
- stale discard
- debugger 可见性

## 2. `ScopeChange.source + revision`

### 为什么排第二

当前 `ScopeChange.paths` 已经很好，但还不够解释：

- 这次写入来自用户输入还是 action
- 某个 source 为什么自触发
- 某个 reaction 为什么循环

### 建议实现

```ts
interface ScopeWriteSource {
  kind: 'user' | 'action' | 'data-source' | 'reaction' | 'validation' | 'host' | 'system';
  producerId?: string;
  interactionId?: string;
}

interface ScopeChange {
  paths: readonly string[];
  sourceScopeId?: string;
  kind?: 'update' | 'merge' | 'replace';
  source?: ScopeWriteSource;
  revision?: number;
}
```

### 收益

1. source 自写过滤更正式
2. reaction 循环诊断更可解释
3. debugger 能展示写入来源
4. 为后续更强事务语义保留演进台阶

### 评估

- 收益：高
- 复杂度：低
- 风险：低
- 复用率：高

### 注意

这不是全局 `commit()`。

- `revision` 只是序列号/诊断 token
- 不是 public transaction id
- 不承诺跨 owner 全局顺序提交

## 3. Schema-safe normalization

### 为什么排第三

当前 host 边界方向是对的：

- host projection 只读
- 写通过 capability
- domain internals 不直接暴露给 schema

但还缺一个运行时边界：

**哪些值允许从 host 世界进入 schema 世界。**

这在：

- flow designer
- spreadsheet/report designer
- word editor
- imported domain libraries

里都会持续放大。

### 建议实现

```ts
interface SchemaValueNormalizer {
  normalize(input: unknown): unknown;
}
```

第一阶段只接两处：

1. host projection snapshot -> host scope
2. namespaced capability result -> schema-visible payload

### 默认规则

- 允许：`null`、boolean、number、string、plain array、plain object
- 禁止：function、class instance、DOM object、Promise、Symbol、proxy、framework internal object

### 评估

- 收益：高
- 复杂度：低
- 风险：低
- 复用率：高

### 为什么值这么高

因为它：

- 代码量小
- 收益直接
- 很容易减少 host 污染 scope 的问题
- debugger 看到的值也会更稳定

## 4. Value-oriented family shared substrate

### 为什么排第四

当前仓库已经有很多信号说明这个方向真实存在：

- `detail-field`
- `detail-view`
- `variant-field`
- `object-field`
- `array-field`

问题不是缺概念，而是协议重复：

- transformIn/transformOut
- validate
- draft
- action result payload
- staged/live owner 规则

### 建议实现

不要做全局 owner graph，只做窄共享 helper：

```ts
interface ValueOwnerHelper {
  runTransformIn(...): Promise<unknown>;
  runTransformOut(...): Promise<unknown>;
  runValidate(...): Promise<ValidationResult>;
  readActionResultData(...): unknown;
}
```

先覆盖：

1. `detail-field`
2. `detail-view`
3. `variant-field`

暂缓：

1. `object-field`
2. `array-field`

### 评估

- 收益：高
- 复杂度：中
- 风险：中
- 复用率：中

### 为什么不是第一

因为它的收益很高，但：

- 需要穿过多个 field family
- 容易碰到既有语义差异
- 验证成本比前 3 项高

## 5. `RendererRuntime` 内部分层

### 为什么值得做

当前 `RendererRuntime` facade 很强，但也偏大。

真正的问题不在外部作者 API，而在内部维护成本：

- compile
- evaluate
- dispatch
- scope creation
- data source registration
- reaction registration
- form/page/surface runtime creation

都挂在一个运行时 facade 上。

### 建议实现

只做内部服务化，不改对外 facade：

```ts
interface RendererRuntimeServices {
  compiler: RuntimeCompilerService;
  evaluation: RuntimeEvaluationService;
  capabilities: RuntimeCapabilityService;
  resources: RuntimeResourceService;
  forms: RuntimeFormService;
  surfaces: RuntimeSurfaceService;
}
```

### 评估

- 收益：中
- 复杂度：中
- 风险：低
- 复用率：高

### 为什么排第五

它很重要，但更像“基础设施整理”，不是最先修复的语义缺口。

## 6. Null-safe expression + renderer error boundary

### 为什么值得做

这类改动非常现实：

- 可以减少级联崩溃
- 可以改善线上稳定性
- 不会破坏现有主架构

### 评估

- 收益：中
- 复杂度：低
- 风险：低
- 复用率：高

### 排名没进前五的原因

它更像“韧性增强”，而不是当前最核心的结构性升级。

## 7. diagnostics source-location 回溯链

### 为什么值得做

这是当前生产线视角非常关键的一项：

- authoring source
- compiled path
- runtime mounted instance
- debugger/diagnostics UI

需要被贯通。

### 评估

- 收益：中
- 复杂度：中
- 风险：低
- 复用率：中

### 为什么没更靠前

因为它收益大，但跨 loader/compiler/runtime/tooling，协调成本高于前 3 项。

## 8. 窄订阅与依赖追踪收紧

### 为什么值得做

这项直接影响：

- 大页面局部更新成本
- 表达式重算范围
- 复杂 shell 内相互干扰
- debugger 开启时观察成本

### 建议方向

- 继续保留运行期动态依赖收集为基线
- 只对可静态证明的表达式增加编译期依赖推断
- 优先做 owner-local 和 hot-path 的窄订阅

### 评估

- 收益：高
- 复杂度：中
- 风险：中
- 复用率：中

### 为什么不排更前

因为它虽然很重要，但实现时容易碰到：

- dependency 语义灰区
- row scope invalidation
- `dependsOn` 与 runtime fallback 并存

它值得做，但不适合作为第一波“快速见效”的升级。

## 不值得现在做的事

以下方向当前不值得做：

1. 全局 `commit()` 事务公开面
2. 完整 `Commit Unit` / admission / journal 新内核
3. 全平台 owner graph public contract
4. 通用 projection patch 协议替换 React host 渲染路径
5. 完整 `program / kernel / session` 公开拓扑
6. Signal-first 重写
7. 表达式字节码 VM
8. 结构化路径替换字符串路径

共同原因：

- 收益不够确定
- 实现复杂度过高
- 迁移成本失控
- 会破坏当前已验证的基线

## 推荐实施顺序

### Phase 1

1. Async authoritative/stale 协议
2. `ScopeChange.source + revision`
3. Schema-safe normalization
4. Null-safe expression
5. Renderer error boundary

特点：

- 风险低
- 收益快
- 对 public surface 影响小

### Phase 2

1. Value-oriented shared substrate
2. diagnostics source-location 回溯链
3. 依赖追踪与窄订阅优化

特点：

- 收益高
- 需要更仔细的设计与验证

### Phase 3

1. `RendererRuntime` 内部分层
2. 更强的 settle/update turn discipline
3. 按真实需求再评估 staged owner shared base

特点：

- 更偏中长期整理
- 不应抢占前两阶段优先级

## 最终判断

如果把实现复杂度认真算进去，那么“更好的 Flux 方案”并不是另起一个新架构，而是：

- 保持当前 Flux 基线不变
- 在几个真实痛点上做协议级增强
- 用最小改动换最大收益

所以最务实的答案是：

**当前 Flux 不需要被替代，只需要被强化。**

而且强化的重点不是新本体，而是：

- async consistency
- write provenance
- host value boundary
- value-owner substrate
- runtime maintainability

这是在工程复杂度约束下，真正“比现在更好”的路线。
