# NOP Next vs NOP Chaos Flux Discussion-Based Comparison

## Purpose

本文基于 `docs/discussions/2026-04-27-next-gen-lowcode-comparison-and-json-mapping-discussion.md` 的多轮讨论结果，整理当前阶段对 `nop-next` 与 `nop-chaos-flux` 的比较结论。

这不是最终定稿结论，而是一次经过多轮纠偏后的阶段性 analysis。它的重点不是给 `nop-next` 下最终死结论，而是把哪些判断已经成立、哪些判断被纠正、哪些问题仍待讨论，明确区分出来。

## Scope

本文只比较与前端 low-code runtime / authoring / scope / capability / owner 相关的部分。

本文明确不把以下问题当作当前同层比较的核心项：

1. 业务层幂等与防重
2. 宿主/后端 receipt 认账协议
3. 更重的 operation journal / outbox-first recovery
4. 权限策略在 DSL 合成层和宿主策略层的实现细节

这些问题可以讨论，但不应直接作为 `nop-chaos-flux` runtime core 的架构缺陷来判断。

## Corrected Baseline

这轮讨论最重要的纠偏是：

1. `nop-chaos-flux` 不是“只有成熟 owner family，没有统一定义”。
2. Flux 已经具备相当强的统一模型。
3. Flux 的核心不应被理解为“owner family 优先”，而应理解为：
   - 读路径与写路径显式分离
   - 读走 lexical data scope
   - 写走 capability path
   - owner semantics 在这个基础上统一 data ownership / validation / publish / lifecycle

因此，`nop-next` 与 Flux 的差异不是“统一 vs 不统一”，而是“统一中心不同”。

## Flux Current Center

Flux 当前更准确的统一中心是：

1. `ScopeRef` 作为 data lexical scope
2. `ActionScope` 作为 capability lexical scope
3. `ComponentHandleRegistry` 作为 instance-target capability lookup
4. `Capability` 作为唯一 author-visible effect authority path
5. `Data Domain Owner` 作为统一 owner semantics
6. `Semantic Lifecycle Entry` 作为 node-owned 语义入口

所以 Flux 的核心不是“把所有东西压成一种 cell/effect 语言”，而是：

1. 先把读和写拆开
2. 再用 owner semantics 统一数据边界

## NOP Next Current Center

`nop-next` 当前试图形成的统一中心主要是：

1. `Authority / Replica`
2. `Projection`
3. `Goal`
4. `Effect Request / Receipt`
5. reducer / patch / recovery

但经过本轮讨论后的更保守判断是：

1. 这组术语本身并不新
2. 其中大部分问题在 Flux 中已经有现实对应物或功能上近似对应
3. `nop-next` 还没有证明这组概念真的能形成比 Flux 更稳定、更自然、更低复杂度的 authoring/runtime 中心

## What Flux Already Has

### 1. Unified owner semantics

Flux 中 `owner` 不是零散 runtime family 的工程积累，而是已有统一定义。

最直接的证据是 `Data Domain Owner`：

1. owned data state
2. lexical read view
3. validation facet
4. publish facet
5. lifecycle
6. identity / conflict policy

这意味着：

1. Flux 不是没有统一 owner 模型
2. 只是它没有使用 `Authority / Replica` 这组术语来组织同一个问题域

### 2. Explicit data/action separation

Flux 已明确区分：

1. `ScopeRef` = data lexical scope
2. `ActionScope` = capability lexical scope
3. `ComponentHandleRegistry` = instance-target capability lookup
4. `Host Projection` = readonly data admission into data scope

这意味着：

1. Flux 不是把 data 和 behavior 混在一个 runtime bag 中
2. 它已经非常明确地把“读路径”和“写路径”拆开了

### 3. Strong lexical scope baseline

Flux 的 lexical scope 不是 incidental implementation，而是核心规则：

1. child scope 默认 lexical inheritance
2. own patch shadowing
3. isolate 是窄特例
4. 不提供 `$parentScope` 之类任意后门

这构成了 Flux 在 authoring 与 runtime 上的核心稳定边界。

### 4. Unified execution path

Flux 已有完整统一的 remote execution model：

1. `action + args`
2. `ajax`
3. `ApiSchema`
4. `executeApiSchema(...)`
5. `env.fetcher`
6. `ApiResponse -> Exception`
7. `then/onError`

因此不能说 Flux 缺统一执行路径。

## Where NOP Next Does Not Yet Win

### 1. It does not yet have a proven natural authoring surface

这是本轮讨论最明确的结论之一。

Flux 天然支持 JSON authoring，因为：

1. 它是 schema-first
2. `event -> action + args` 结构天然与 JSON 同构
3. `name / id`、scope、component targeting 已经成型

`nop-next` 当前则更像：

1. 概念语言
2. IR 语言
3. runtime protocol

而不是已经证明自然成立的 JSON authoring system。

### 2. It has not proved compile/runtime split in the same strong way Flux has

`nop-next` 确实强调 compile/runtime split，但当前更多是文档和原型中的宣称，而不是像 Flux 这样已经形成稳定 package boundary、compiler boundary、execution boundary 的成熟实现。

所以更准确的判断是：

1. `nop-next` 有 compile/runtime split 的强意图
2. 但还没有足够证据证明它做得比 Flux 更实

### 3. Many of its concepts are not obviously new centers

`Authority / Replica / Projection / Goal / Effect Request / Receipt` 当前更像一组重命名/重收束尝试，而不是已经成立的新中心。

这并不意味着它们毫无价值，而是意味着：

1. 不能因为术语更“硬”就自动判定架构更优
2. 更强约束不等于更适合当前 low-code authoring/runtime 场景

## Concept Mapping: Strong, Weak, and Non-Equivalent

### Strong or functional counterparts in Flux

1. `Authority`
   - 对应 Flux 中 path-based logical publication 与 owner-controlled publish boundary
2. `Replica`
   - 对应 staged/local draft/working state
3. `Projection`
   - 对应 `ScopeRef` 可见读面、`expr` inline projection、`formula` 派生值
4. `Goal`
   - 最接近 Flux 的 semantic lifecycle entry

### Weak or non-equivalent counterparts

1. `Effect Request / Receipt`
   - Flux 有统一 execution path 与 result vocabulary
   - 但不应说它和 `nop-next` 的 receipt/protocol 中心完全等价

### Not appropriate for same-layer comparison

这一轮讨论进一步确认，下列内容不应继续当作 Flux runtime core 的“差距”来比较：

1. `Proof`
2. `Grant`
3. `Bootstrap Attestation`
4. `request/receipt/recovery` 作为更重的 durable operation protocol

原因不是说它们不存在差异，而是：

1. 这些更像 `nop-next` 自己额外上推的一层系统设计
2. 并不属于 Flux 当前 runtime core 必须等价回应的同层问题
3. 在 Flux 中，权限更多在 DSL 合成层、host policy 层、manifest/contract 层处理
4. durable receipt、防重、认账、outbox、更像应用/宿主/后端层问题

## Interim Judgment

在当前证据下，更准确的阶段性判断应是：

1. `nop-chaos-flux` 是一个已经具备强统一中心的成熟前端执行框架。
2. `nop-next` 当前更像一个批判性设计提案 / 分析框架 / 问题发现装置。
3. `nop-next` 的价值主要在于逼出一些值得继续讨论的问题，而不是它已经给出了足够厚实的新答案。

这些值得保留的问题意识包括：

1. authored action graph 是否承担了过多 durable business semantics
2. staged/live/draft/authority 是否值得进一步显式统一解释
3. semantic action surface 是否应该继续从 low-level execution step 后撤
4. compile/runtime split 在 low-code schema 场景下是否还能更强

## What This Analysis Does Not Claim

本文不声称：

1. `nop-next` 毫无价值
2. Flux 当前已经把所有相关问题都做到最好
3. `nop-next` 的所有独特部分都无意义

本文只声称：

1. 在当前证据下，`nop-next` 还不足以被判断为比 Flux 更强的“下一代完整架构”
2. 它当前更适合作为分析框架和批判工具
3. 真正应该被吸收的，主要是它逼出来的问题意识，而不是整套术语系统

## Follow-up Directions

后续如果继续推进这组讨论，更值得做的不是继续抽象扩展 `nop-next` 术语，而是：

1. 判断 Flux 是否需要把自身已有的 authority-like / replica-like / projection-like / semantic-entry-like 结构显式写出来
2. 判断 Flux 的 author-visible `action + args` 是否应该进一步形式化为更明确的 semantic action surface
3. 判断 compile/runtime boundary 在 Flux 中还有哪些可以继续实化的地方

## Related Discussion

本分析直接基于：

- `docs/discussions/2026-04-27-next-gen-lowcode-comparison-and-json-mapping-discussion.md`
