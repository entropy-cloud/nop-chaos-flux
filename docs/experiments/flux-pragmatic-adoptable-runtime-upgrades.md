# Flux 可务实吸收的下一代设计要点

> 文档定位：从实验性下一代内核设计中，筛选出 **确实值得被当前 Flux 吸收** 的部分。
>
> 目标：只保留那些有明确实际价值、与当前 Flux 基线兼容、可渐进实施、风险可控的设计。
>
> 本文不是 clean-slate 重写提案，也不是“把实验稿整包搬进 Flux”。

## 1. 结论

当前 Flux 不应该吸收实验稿的全部内容。

真正有价值、值得吸收的，是那些同时满足四个条件的设计：

1. 能解决当前已经真实存在或即将高概率出现的问题。
2. 不会破坏 `frontend-programming-model.md` 的七 primitive closure。
3. 可以在现有 `RendererRuntime` / `FormRuntime` / `Source` / `Reaction` / host wiring 上渐进接入。
4. 收益足以覆盖引入的新复杂度。

按这个标准筛选，值得吸收的重点只有五类：

1. 异步消费者的 epoch / stale-result 协议。
2. 更丰富的 scope write source 元数据与循环诊断。
3. host projection / capability 返回值的 schema-safe normalization。
4. value-oriented 控件共享的窄 owner substrate。
5. `RendererRuntime` 的内部服务分层，而不是继续扩张 facade。

不建议当前 Flux 直接吸收的内容也很明确：

1. 全量 `program / kernel / session` 三层公开模型。
2. 全局统一 `commit()` 事务公开面。
3. 全平台通用 owner graph public contract。
4. 通用 projection patch 协议替换当前 React host 渲染路径。

## 2. 评估标准

为了避免“先进设计幻觉”，本文只接受下面三类价值：

### 2.1 真实问题价值

设计必须直接缓解以下至少一类问题：

1. 请求竞态。
2. reaction/source/validation 自触发与循环诊断。
3. host/domain 边界的值污染或不可诊断行为。
4. 复合字段家族重复发明生命周期和 payload 规则。
5. `RendererRuntime` 持续膨胀带来的维护成本。

### 2.2 兼容价值

设计必须兼容当前 Flux 的核心原则：

1. `Flux` 仍是 `Final Execution Schema` runtime。
2. 七 primitive closure 不重开。
3. `Capability` 仍是唯一 author-visible effect path。
4. host 仍然是 readonly projection + namespaced capability。

### 2.3 增量实施价值

设计必须能分阶段落地，并允许：

1. 新旧路径并存一段时间。
2. 先在少数 owner 或少数 host 上试点。
3. 不要求大规模同步重写 renderer 或 runtime。

## 3. 值得吸收的设计

## 3.1 异步消费者 epoch 协议

### 3.1.1 为什么值得吸收

当前 Flux 已经有：

1. action 级 `debounce` / `timeout` / `retry` / cancel。
2. source refresh 与依赖刷新。
3. reaction batching 与 fire-count guard。
4. async validation。

这些能力都很有价值，但它们还没有被统一为一个清晰的异步一致性协议。

更准确地说，这不是从零新增一套能力，而是把当前已经分散存在的：

1. `Operation Control`
2. stale-run suppression
3. owner-local cancel / timeout / retry

收敛成更清晰、可诊断的统一命名和共享机制。

最实际的缺口是：

1. 旧请求结果覆盖新状态。
2. reaction / source / async validation 的竞态规则分散在各自模块里。
3. 调试器很难回答“这个结果为什么被接受/丢弃”。

### 3.1.2 建议吸收的最小设计

不是引入完整 VM，而是引入一个窄协议：

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

先覆盖三类 owner：

1. API/data source
2. reaction
3. async validation

规则非常简单：

1. 每次重跑生成新 epoch。
2. 异步结果回到 runtime 时先检查是否仍是当前 epoch。
3. 不是当前 epoch 则直接丢弃，不写回状态。

### 3.1.3 为什么这比完整 `ReadView` 更适合现在的 Flux

完整 `ReadView` 很优雅，但现在吸收成本太高。

当前更值得先吸收的是：

1. epoch token
2. stale result discard
3. 对调试器可见

也就是先解决“结果竞态”和“可解释性”，而不是一次引入完整的新读模型。

### 3.1.4 实际收益

1. source/reaction/validation 的竞态规则统一。
2. 很多历史异步边界 bug 会更容易解释和定位。
3. 后续如果真的要升级到更强的 read-view 语义，也有自然演进路径。

## 3.2 更丰富的 `ScopeChange` 来源元数据

### 3.2.1 为什么值得吸收

当前 Flux 已经有 `ScopeChange.paths`，这很好。

但仅靠 `paths` 仍然不够回答：

1. 这次写入来自用户输入、action、source 还是 reaction？
2. 某个 source 为什么没刷新，或为什么自触发了？
3. 某个 reaction 为什么形成循环？

### 3.2.2 建议吸收的最小设计

扩展当前 `ScopeChange` 元数据，而不是立刻引入全局 `commit()`：

```ts
interface ScopeWriteSource {
  kind: 'user' | 'action' | 'data-source' | 'reaction' | 'system';
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

这不是完整事务系统，但足够支持：

1. source 自写过滤更正式。
2. reaction 循环诊断更可解释。
3. debugger/monitor 能展示写入来源。

注意边界：

1. 这一步当前只直接增强 scope write、source invalidation 和 reaction diagnostics。
2. 它不自动把 validation 带入同一依赖/循环诊断体系。
3. validation 目前仍然属于独立 runtime family；是否未来收敛是另一项更大的架构工作。

### 3.2.3 为什么这个增量比统一 `commit()` 更适合现在

因为它：

1. 不要求改写所有公开写入口。
2. 不要求立即重构 `FormRuntime` / `SurfaceRuntime`。
3. 先把调试与循环控制的最小闭环补上。

这是一种高收益、低侵入的中间层升级。

`revision` 也应保持极小语义：

1. 它只是 scope write 序列号或 diagnostics token。
2. 它不是完整事务版本号，也不承诺跨 owner 的全局有序提交语义。
3. 当前阶段不要把它解释成 public transaction id。

## 3.3 host 边界的 schema-safe normalization

### 3.3.1 为什么值得吸收

当前 Flux 的 host 边界方向是对的：

1. host projection 只读。
2. 写通过 namespaced capability。
3. domain internals 不直接暴露给 schema。

但还缺一个更明确的边界：

**哪些值允许从 host 世界进入 schema 世界。**

这是非常实际的问题，尤其在：

1. flow designer
2. spreadsheet/report designer
3. word editor
4. future imported domain hosts

中会越来越重要。

### 3.3.2 建议吸收的最小设计

引入一个小而明确的 runtime contract：

```ts
interface SchemaValueNormalizer {
  normalize(input: unknown): unknown;
}
```

默认规则：

1. 允许：`null`、布尔、数值、字符串、普通数组、普通对象，以及平台后续明确白名单支持的少量可序列化标量包装值。
2. 禁止：函数、类实例、DOM 对象、Promise、Symbol、代理对象、框架内部对象引用。

应用位置只需要先覆盖两类入口：

1. host projection snapshot -> host scope
2. namespaced capability result -> schema-visible payload

### 3.3.3 实际收益

1. host 污染 schema scope 的风险明显下降。
2. debugger 看到的值形态更稳定。
3. 运行期值边界更明确，后续才更容易与 manifest/result-shape 文档逐步对齐。

这项设计小，但价值非常高。

这里要明确限制预期：

1. normalization 解决的是运行期值污染和运行期可诊断性。
2. 它本身不会自动让编译期 manifest 校验与运行期值约束完全一致。
3. 编译期对齐仍然依赖 manifest result shape、publication attribution 和 compiler-visible host boundary。

## 3.4 value-oriented 控件共享的窄 owner substrate

### 3.4.1 为什么值得吸收

当前仓库已经有很好的方向：

1. `value-adaptation-and-detail-field.md`
2. `object-field.md`
3. `variant-field.md`
4. `composite-value-owner-clean-slate.md`

这说明问题已经被正确识别：

1. `detail-field`
2. `detail-view`
3. `variant-field`
4. `object-field`
5. `array-field`

不应继续各写一套值适配、默认 payload、transform/validate 顺序和 draft 规则。

### 3.4.2 建议吸收的最小设计

不要引入全局 owner graph，而是只给 value-oriented family 提供一个窄共享 substrate：

```ts
interface ValueOwnerHelper {
  runTransformIn(...): Promise<unknown>;
  runTransformOut(...): Promise<unknown>;
  runValidate(...): Promise<ValidationResult>;
  readActionResultData(...): unknown;
}
```

再加上统一的 owner-mode 分类：

1. inline live-edit owner
2. surface-backed staged owner

先覆盖：

1. `detail-field`
2. `detail-view`
3. `variant-field` 的 detection / switch migration

谨慎覆盖：

1. `object-field`
2. `array-field`

因为当前基线已经明确它们默认不是 staged owner。

### 3.4.3 为什么这是高价值而非过度设计

因为它并不要求：

1. 新 public owner family
2. 全平台统一 owner graph
3. 所有 field 改写为 runtime owner

它只做一件很实际的事：

**把 value-oriented family 的重复协议收敛起来。**

这能明显减少未来在 `variant-field`、`detail-field`、复杂 value editor 上的重复实现和微妙分歧。

## 3.5 `RendererRuntime` 的内部服务分层

### 3.5.1 为什么值得吸收

当前 `RendererRuntime` 的 facade 已经很强，但也确实偏大。

不过，这一项的优先级应低于前四项。它更像内部实现整顿建议，而不是当前最紧迫的语义缺口修复。

这件事的真正问题不在作者 API，而在维护性：

1. compile
2. evaluate
3. dispatch
4. scope creation
5. data source registration
6. reaction registration
7. form/page/surface runtime creation

都挂在同一个运行时 facade 上。

这会让后续继续演进时越来越难保持边界清晰。

### 3.5.2 建议吸收的最小设计

不是立刻对外暴露 `kernel/session`，而是先做内部服务分层：

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

对外仍然保留当前 `RendererRuntime` facade。

也就是：

1. 内部收缩耦合。
2. 外部 API 尽量不动。

### 3.5.3 实际收益

1. 更容易给 data source / reaction / validation 接入共享异步 epoch 语义。
2. 更容易让 composite owner substrate 找到稳定挂点。
3. 为未来必要时的更强 runtime layering 留出台阶，但不强推 clean-slate 重写。

## 4. 不值得当前直接吸收的设计

下面这些不是“永远没价值”，而是 **现在吸收收益不够、风险过高**。

## 4.1 全局 `commit()` 事务公开面

问题不在理念，而在实施成本。

如果现在强推：

1. 需要统一 `ScopeRef`、`FormRuntime`、`SurfaceRuntime`、built-in actions 的写入口。
2. 会打断大量现有实现。
3. 容易出现“事务协议半落地、旧写法继续并存”的双轨混乱。

更好的路径是先做 `ScopeChange.source + revision` 和 async epoch，而不是一步到位 public `commit()`。

## 4.2 全平台 owner graph public contract

这在 clean-slate 设计里有吸引力，但对当前 Flux 来说太重。

真正值得先做的是：

1. value-oriented family 的窄 owner substrate
2. 复杂 host 的 manifest + bridge + namespace wiring

不要先发明一个覆盖所有 runtime family 的巨型 owner API。

## 4.3 通用 projection patch 协议

实验稿里 `snapshot() + RenderPatch` 很先进。

但当前 Flux 的现实重点还不是替换 React host 渲染协议，而是：

1. 让 host projection 边界更稳
2. 让 runtime async 语义更清楚
3. 让复合 value owner 更少重复逻辑

在这些问题还没收口前，通用 projection patch 的收益不够高。

## 4.4 全量 `program / kernel / session` 公开拓扑

这是 clean-slate 终局形态，不是当前最有性价比的改造项。

当前更现实的路径是：

1. 保持现有 `RendererRuntime` facade
2. 内部渐进服务化
3. 先在少数子系统上吸收更严格的一致性与边界规则

## 5. 推荐实施顺序

## 阶段 1：低风险高收益

1. 给 async source / reaction / async validation 接入 epoch token。
2. 扩展 `ScopeChange` source metadata 和 revision。
3. 在 host projection / capability result 边界接入 `SchemaValueNormalizer`。

这是最值得立刻做的一组。

原因：

1. 风险低。
2. 调试收益高。
3. 对现有 public authoring surface 影响小。
4. 但要明确：它们不是 dependency tracking 的完整收口，只是异步一致性和 host 边界上的增强。

阶段 1 还有一个必须同步承认的前提：

1. 当前 dependency tracking 本身仍有独立待收敛问题，例如 `unknown` / `empty` dependencies 语义、`dependsOn` 与 runtime fallback 并存、临时 evaluation 的 ownership 丢失、以及 row-scope invalidation translation。
2. 因此 phase 1 不应被宣称为“彻底解决依赖与循环问题”，它只是先补上最实际的一层一致性和诊断增强。

## 阶段 2：控件家族收敛

1. 落地 `ValueOwnerHelper`。
2. 先收敛 `detail-field` / `detail-view`。
3. 再把 `variant-field` detection / switch migration 对齐共享 helper。

这阶段的目标不是“统一所有 field runtime”，而是收敛最容易分叉的 value adaptation 语义。

## 阶段 3：内部运行时分层

1. `RendererRuntime` 内部服务化。
2. 把 compiler / evaluation / capabilities / resources / forms / surfaces 分开。
3. 为 future 更强 runtime layering 预留位置，但不急着公开新 API。

这阶段应明确降级为“可选内部重构方向”，不是和前两阶段同等优先级的架构增量。

## 6. 采纳标准

一项设计即使理论上更先进，也只有满足下面条件才值得进入当前 Flux：

1. 至少解决一个当前真实痛点。
2. 不要求重开 primitive closure。
3. 不要求作者学习一整套新 runtime 心智模型。
4. 可以先在一个子系统试点。
5. 能被 debugger/diagnostics 明确观察到收益。

## 7. 最终建议

如果只保留一句建议，我会给这句：

**Flux 应该吸收“更强的一致性协议”和“更窄的共享 substrate”，而不是直接吸收“更大的 clean-slate 架构”。**

具体说，就是优先吸收：

1. async epoch
2. scope write source metadata
3. schema-safe host normalization
4. value-oriented family shared helper

`RendererRuntime` 内部分层则更适合作为配套内部整理方向，而不是首批核心采纳项。

这些部分是真正有实际价值的部分。

它们能让当前 Flux 更稳、更可诊断、更可维护，也确实为未来更强的 runtime kernel 演进铺路；但它们不会把当前项目拖进一次高风险、低确定性的“伪 clean-slate 重写”。
