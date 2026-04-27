# Flux Current Attractor Audit

## Purpose

本文总结基于新版 `docs/skills/next-gen-lowcode-attractor-discovery-prompt.md` 对当前 `nop-chaos-flux` 架构所做的阶段性 attractor audit。

目标不是发明新架构，而是回答三个问题：

1. Flux 当前是否仍困在主流 schema runtime / action graph 的平均盆地中。
2. 如果不是，Flux 当前稳定下来的 attractor 中心是什么。
3. `nop-next` 这类提案在当前阶段更适合被理解为替代架构，还是问题发现装置。

## Scope

本文只讨论前端 low-code runtime / authoring / scope / capability / owner / compile-runtime boundary 相关内容。

本文明确不把以下问题当作当前 attractor audit 的核心判据：

1. durable receipt / crash recovery / outbox-first protocol
2. operation-level proof / grant / bootstrap attestation
3. 更重的 host / application / backend 协议系统

这些问题可以作为平台级设计继续讨论，但不应用来证明 Flux runtime core 仍缺少自身中心。

## Audit Baseline

这轮审计采用的基线，不再是早期对 Flux 的误读，而是已经经过 discussion 纠偏后的版本：

1. `owner` 在 Flux 中已有统一定义，不能把它描述成分散 family 的经验积累。
2. `data scope` 与 `action scope` 分离是刻意设计，不是 incidental implementation。
3. lexical scope lookup 是核心规则，而不是局部实现习惯。
4. 比较时应先区分读路径和写路径。
5. `proof`、`request/receipt/recovery` 不应继续被拿来当作 Flux runtime core 的同层缺口。

## Attractor Judgment

当前阶段更准确的判断是：

1. Flux 已经形成自己的稳定 attractor。
2. 它不应再被描述为“工程成熟，但概念上仍停留在主流平均盆地”。
3. 它的中心不是更硬的 protocol 术语，而是 `Final Execution Schema` 约束下的一组稳定 execution boundaries。

换句话说，Flux 当前不是“等待下一代框架来替代的未完成底座”，而是已经具备自身中心语言的执行框架。

## Current Center

Flux 当前 attractor 的中心，最好由以下结构共同描述：

1. `Final Execution Schema`
2. 七原语闭包：
   - `Template`
   - `ScopeRef`
   - `Value`
   - `Resource`
   - `Reaction`
   - `Capability`
   - `Host Projection`
3. `ActionScope` 作为 capability lexical scope
4. `ComponentHandleRegistry` 作为 instance-target capability lookup
5. `Data Domain Owner` 作为统一 owner semantics
6. `Semantic Lifecycle Entry` 作为 node-owned semantic entry

这组结构已经足以约束 Flux 的演化方向，而不是零散 feature 的事后汇总。

## Core Structural Claim

Flux 当前最关键的 attractor 特征不是“owner family 优先”，而是：

1. 读路径与写路径显式分离。
2. 读通过 lexical data scope 完成。
3. 写通过 `Capability` path 完成。
4. owner semantics 在这个基础上统一数据归属、validation、publish、lifecycle。

具体说：

1. `ScopeRef` 负责 data lexical scope。
2. `ActionScope` 负责 namespaced capability lexical scope。
3. `ComponentHandleRegistry` 负责 explicit instance-target invocation。
4. `Host Projection` 负责 readonly host snapshot admission。
5. `xui:imports` 负责 declarative capability provisioning，而不是 data projection 或 generic host bag。

因此 Flux 的 attractor 不是“统一成一种 generic binding/cell/effect 语言”，而是“把本来会混在一起的问题拆开，并保持每个边界稳定”。

## Why This Is More Than A Mature Implementation

如果只是工程成熟，还不足以说明它形成 attractor。Flux 当前更强的一点在于，它已经同时具备：

1. 稳定的 primitive closure
2. 稳定的 compile/runtime boundary
3. 稳定的 author-visible effect path
4. 稳定的 lexical scope baseline
5. 稳定的 owner-semantics convergence direction

这使得 Flux 的很多局部实现会自然回到同一组边界上，而不是持续向主流 action-graph / schema-runtime 平均解漂移。

## Authoring Surface Audit

按新版 prompt 的作者面审计，Flux 的一个关键结论是：它已经有自然成立的 authoring surface。

主要依据：

1. schema-first 本身与 JSON authoring 同构。
2. `event -> action + args` 已经是自然的作者层 effect surface。
3. `name / id / componentId / componentName / targetId` 等定位规则已经形成实践基线。
4. semantic node 自带 `Semantic Lifecycle Entry`，无需把所有业务动作平铺成裸 UI trigger graph。

这意味着 Flux 的作者面不是“架构分析完成后才补写的一层故事”，而是已经在现有系统中成立。

## Compile/Runtime Reality Check

按新版 prompt 的 compile/runtime 现实检查，Flux 当前也通过了一个关键门槛：

1. `Final Execution Schema` 边界已经被明确写成顶层 architecture 规则。
2. loader / assembly / runtime / host/domain layering 已经有明确分层。
3. `Action Algebra`、`ApiSchema`、`FormRuntime`、`PageRuntime` 都被放在了清楚的 derived-system 边界中。
4. Host read/write boundary 也已明确为：read through `Host Projection`, write through `Capability`。

因此更准确的说法是：

1. Flux 的 compile/runtime separation 已经不只是文档宣称。
2. 它已经形成了具有实践约束力的 architecture baseline。

## Existing Counterparts To NOP Next-Like Terms

这轮 attractor audit 的一个重要副产物是：Flux 中已经存在许多与 `nop-next` 术语功能近似的现实对应物。

可以保守地写成：

1. authority-like
   - path-based logical publication
   - owner-controlled publish boundary
2. replica-like
   - local draft / staged working state
3. projection-like
   - `ScopeRef` visible read view
   - `expr` / `formula` derived read surface
4. semantic-entry-like
   - `Semantic Lifecycle Entry`

但这里必须保持边界：

1. 这些是功能对应或结构近似。
2. 不能把它们直接说成和 `nop-next` 同层同构。
3. 更不能因为出现了类似功能，就把 `proof`、`receipt` 之类跨层术语重新带回 runtime core 比较。

## Residual Tensions

当前仍值得继续讨论的 tension 主要是 attractor 内部的继续收敛，而不是“Flux 没有中心”的证据：

1. `Data Domain Owner` 是否还需要把更多局部 owner 语义继续统一进来。
2. `action + args` 是否需要进一步收束成更明确的 semantic action surface 解释。
3. authority-like / replica-like / projection-like / semantic-entry-like 这些结构，是否需要在正式文档中显式总结。

这些 tension 更接近：

1. 解释层补强
2. 文档显式化
3. attractor 内部继续收敛

而不是：

1. 需要另起一套协议中心来取代 Flux
2. 证明 Flux 仍然没有自己的稳定语言

## What This Means For NOP Next

一旦承认 Flux 已经形成稳定 attractor，`nop-next` 当前更准确的定位就会同步下调：

1. 它更像批判性草图。
2. 它更像分析框架或问题发现装置。
3. 它提出了一些值得保留的问题意识，但尚未证明自己形成了更强的新中心。

当前阶段不宜再把 `nop-next` 描述成比 Flux 更成熟的“下一代完整替代架构”。

## Interim Conclusion

当前阶段的更准确结论是：

1. Flux 已经是自己的稳定 attractor。
2. 其中心是 `Final Execution Schema`、七原语闭包、读写分离、lexical scope/capability scope 分治、显式 effect authority，以及 `Data Domain Owner` / `Semantic Lifecycle Entry` 这组统一解释语言。
3. `nop-next` 当前主要价值在于暴露问题与迫使比较边界收紧，而不是已经提供了更成熟的新中心。

## Related Docs

本文与以下文档直接相关：

- `docs/discussions/2026-04-27-next-gen-lowcode-comparison-and-json-mapping-discussion.md`
- `docs/analysis/2026-04-27-nop-next-vs-nop-chaos-flux-discussion-based-comparison.md`
- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/data-domain-owner.md`
- `docs/skills/next-gen-lowcode-attractor-discovery-prompt.md`
