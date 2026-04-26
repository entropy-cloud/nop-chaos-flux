# Data Domain Owner Architecture

## Purpose

本文定义 Flux 在未来长期演化中的统一数据边界模型，用于回答：

- 什么东西才算一个真正的数据 owner
- `ValidationScopeRuntime` 与 staged draft/editing 是什么关系
- `form` / `detail-*` / row editor / filter panel / wizard step 这类局部编辑语义应如何统一
- `dialog` / `drawer` / `loop` / `object-field` / `array-field` / `variant-field` 为什么不应被误判为同一种 owner
- 如何在不破坏现有代码的前提下，逐步把当前 runtime 收敛到更稳定的 owner 语义

本文是正式架构文档，不是讨论稿。

## Position

- `docs/architecture/frontend-programming-model.md` 仍拥有顶层 primitive identity 与 core-boundary precedence。
- `docs/architecture/flux-core.md` 仍拥有代码库当前高层 runtime 组合基线。
- `docs/architecture/form-validation.md` 仍拥有 validation 规则和 API 细节的 local precedence。
- `docs/architecture/scope-ownership-and-isolation.md` 仍拥有 lexical scope / isolation 规则。
- `docs/architecture/surface-owner.md` 仍拥有 surface owner 规则。

本文的职责是定义一个跨这些子系统的统一 owner 语义框架：

- 什么是数据域
- validation 如何挂接在数据域上
- live / staged 编辑如何被解释为同一数据域的不同发布模式

如果本文与更高层 primitive/core-boundary 规则冲突，`frontend-programming-model.md` 优先。

## Why This Doc Exists

Flux 已经具备以下局部事实：

- `form` 是 validation-capable owner
- `detail-field` / `detail-view` 已经具备局部 draft + confirm/cancel 语义
- row identity 已经与 index-addressed value path 分离
- `object-field` / `array-field` / `variant-field` 已经明确是 parent-owned inline editors
- `table` 已经具备多轴 interaction-owner 基线（pagination/selection/sort/filter/visible-columns 通过 state path 承载），而 `crud` 继续是聚合这些 owner 结果的 workflow shell，而不是第二个 data-domain owner
- `dialog` / `drawer` 已经明确是 surface owner，而不是业务提交 owner

这些事实方向上是一致的，但缺少一个更高层的统一命名和归纳模型。

如果未来 10 年要把 Flux 稳定演化成低代码底层框架，需要一个足够稳定的 owner 语义，用于统一：

- validation ownership
- staged/live edit semantics
- child-owner commit propagation
- row-local staged editing
- future local filter scopes, wizard steps, and non-form validation scopes

本文把这一层统一为 **Data Domain Owner**。

## Terminology Decision

本文统一使用 **Data Domain Owner**，不使用 `Data Scope Owner`。

原因：

1. `scope` 在 Flux 中已经有稳定且更窄的既有含义：lexical visibility、projection、inheritance、isolation、row scope、fragment scope
2. 本文要定义的是更高层的语义归属边界，而不是新的 scope 类型
3. 如果使用 `Data Scope Owner`，很容易误导读者把 owner creation 等同于 scope creation

因此术语边界应保持为：

- `scope` 强调读取视图与可见性
- `domain` 强调数据归属、validation 归属、publish 边界与 lifecycle

本仓库后续如需引用本文语义，应优先使用 `Data Domain Owner` 这一名称。

## Core Claim

Flux 中真正的一等数据语义边界应是 **Data Domain Owner**。

`ValidationScopeRuntime` 和 staged editing 不是两套平行的大系统，而是同一个数据域的两个 facet：

- `ValidationScopeRuntime` = 数据域的 validation facet
- staged/live editing = 数据域的 publish facet

`scope` 则是数据域的读取视图，不是主要 owner 语义本身。

推荐心智模型：

```text
Data Domain Owner =
  owned data state
  + lexical read view
  + validation facet
  + publish policy (live or staged)
  + lifecycle
  + identity/conflict policy
```

## Relationship To The Primitive Model

本文不引入新的顶层 primitive。

在 `frontend-programming-model.md` 的七原语模型下，`Data Domain Owner` 是对已有 runtime ownership 的解释层：

- `ScopeRef` 负责 lexical read/write view
- `Value` 负责读取/计算
- `Resource` 负责 runtime-owned value production
- `Reaction` 负责 watch/effect consequence
- `Capability` 负责 effect authority

而 `Data Domain Owner` 负责回答：

- 哪份数据属于谁
- 哪个 runtime 保存该数据域的 validation state
- 哪个 boundary 决定 commit/discard/submit
- 哪个 identity 规则用于 child-domain writeback 与 conflict handling

因此它是 owner semantics，不是新的执行 primitive。

## Data Domain Owner Definition

一个 runtime boundary 只有同时满足以下条件，才应被视为 `Data Domain Owner`：

1. 拥有一组语义上完整的数据值，而不仅仅是一个投影视图
2. 拥有这组值的 validation state 或 validation authority
3. 决定这些值何时对外发布，或何时视为提交成功
4. 拥有自己的 lifecycle，而不是纯粹依附于父级的瞬时 UI 壳层

反过来说，以下对象通常 **不是** `Data Domain Owner`：

1. 纯 surface shell
2. 纯 layout container
3. 纯 projected scope
4. 纯 path-prefix editor
5. 纯 repeated structural scope

## The Three Facets

### 1. Read Facet

每个数据域都需要一个读取视图。

在当前 Flux 中，这通常体现为：

- `ScopeRef`
- prefixed/projected form store proxy
- row-local scope payload

重要边界：

- read facet 不等于 owner creation
- isolated scope 也不等于 owner creation
- projected scope 也不等于 owner creation

因此：

- `object-field` 的 path-prefix projection 不是新数据域
- `array-field(item)` 的 item-local editor 不是默认新数据域
- `loop item` 的 lexical child scope 不是默认新数据域

### 2. Validation Facet

每个 `Data Domain Owner` 都应有自己的 validation facet。

这条规则解释了为什么 validation 最自然地挂在数据域上，而不是挂在 React 树、surface、或某个偶然的 renderer 名称上。

更准确地说：

- `ValidationScopeRuntime` 是数据域的 validation facet runtime
- `FormRuntime` 是带 submit/touched/dirty policy 的 specialized validation domain runtime

因此并不是“只有 form 才有 validation”。

以下都可以是 validation-capable data domain：

- `form`
- local draft editor
- row-local draft editor
- filter panel
- wizard step
- future non-submit validation owner

### 3. Publish Facet

每个数据域都必须定义自己的 publish policy。

推荐只保留两个主模式：

1. `live`
2. `staged`

#### Live

`live` 表示：

- 修改立即作用于 owner-owned current value
- 父级或外部消费者立即看到变化
- 无独立 confirm/cancel 边界

#### Staged

`staged` 表示：

- 编辑发生在 local working state 中
- 只有 confirm/commit 时才对外发布
- cancel/discard 会放弃 working state

`staged` 不一定意味着 surface，但具有 confirm/cancel 时，默认应采用 staged publish。

## Operational Boundary Rules

上面的定义还需要落到几个操作性判断上。

### Scope Creation Does Not Imply Owner Creation

推荐先分三层看：

1. 是否创建 lexical read scope
2. 是否创建 surface owner
3. 是否创建 data domain owner

这三件事有关联，但默认不等价。

例如：

- `dialog` 打开时可以创建 own scope，也一定会创建 `Surface Owner`，但这不等于 surface 本身就是 `Data Domain Owner`
- `object-field` / `array-field` / `variant-field` 可以创建 projected child scope 或 projected form/runtime view，但这不等于默认创建 child data domain
- table row 创建 row scope，也不等于 row scope 默认拥有独立 validation/publish boundary

### Page Or Root Owner Rule

`page` / root data scope 可以是 `Data Domain Owner`。

当前 live baseline 补充：

1. `SchemaRenderer` 的 page-owned root render 已经落地为第一个 concrete non-form validation owner family
2. 该 fallback 只适用于 render tree 使用自身 `page.scope` 的场景
3. 当 `SchemaRenderer` 通过 `props.parentScope` 嵌入到父作用域时，当前基线仍保持 parent-owned，而不会自动创建第二个 page/root owner

判断规则：

1. 如果当前页面级数据域承载了一组直接绑定的值
2. 且这些值没有被更近的 `form` 或 local draft owner 接管
3. 且当前 runtime 需要对这些值维护 validation 或 publish semantics

则 page/root data scope 应被视为当前 nearest data domain owner。

这条规则与 `form-validation.md` 保持一致：

- `form` 不是唯一 validation-capable owner
- page/root data scope 在没有更近 owner 时可以承接 validation ownership

需要注意：

- page shell 自身不是 surface owner family 的替代品
- page 作为 data domain owner，不意味着 dialog/drawer 状态应上卷到 page

### Surface Scope Rule

`dialog` / `drawer` 可以拥有 own scope，也可以通过 `data` 初始化该 scope。

这不与本文“surface 不是 data domain owner”冲突。

正确解释是：

1. surface own scope 解决的是 surface subtree 的 lexical read environment
2. `Surface Owner` 解决的是 open/close/active/opening/closing
3. `Data Domain Owner` 只在该 surface 内部明确承载业务值 + validation + publish boundary 时才成立

因此：

- “surface 里有 own scope” 不等于 “surface 本身拥有业务提交语义”
- “surface 里出现 form / detail / local draft editor” 才表示 surface subtree 内承载了 data domain owner

## Canonical Identity And Addressing

`Data Domain Owner` 不只回答“谁拥有值”，还必须回答“owner 内的 canonical address 是什么”。

### Owner-Local Absolute Path

在 owner 已知前提下，值路径、field path、validation path 的 canonical key 应继续使用 **owner-local absolute path**。

例如：

- `profile.firstName`
- `items.3.name`

这里的“绝对”指：

- 相对当前 owner 的 owning scope address space 是绝对路径
- 它不是跨所有 owner/runtime 的全局统一地址

### Owner-Qualified Identity

跨 owner bookkeeping 时，规范 identity 应是：

```text
OwnerQualifiedPath = ownerId + owner-local absolute path
```

它至少用于：

- validation bucket identity
- async validation run ownership
- child/parent owner bookkeeping
- debugger-facing owner-aware diagnostics

这与当前 `form-validation.md` 中的 `OwnerQualifiedPath` 基线一致。

### `rootPath` Rule

每个 data domain owner 都应有自己的 `rootPath` 语义。

它回答：

- 当前 owner 拥有哪些路径
- 哪些 runtime write / validation descriptor 应被 owner 接受或拒绝
- child-domain confirm 之后的 writeback 落到 parent owner 的哪个 subtree

因此：

- owner 不能接受落在其 `rootPath` 之外的 owned write
- projected editor 的 path rebasing 仍然只是把相对字段映射回 parent owner 的 `rootPath` 子树
- `instancePath` 不是值地址，也不替代 `rootPath`

### Row Identity And Addressing

row-local child domain 必须同时处理两条轴：

1. owner-local value path 仍可 index-addressed
2. commit target identity 必须优先按 `rowKey` resolve

这意味着：

- `items.3.name` 仍可作为 owner-local absolute path
- 但 child-domain confirm 时，不能假设原 index 仍然代表同一个逻辑 row
- table owner 必须维护当前 turn 的 `rowKey -> sourceIndex` resolve bridge

resolve 失败时的规范结果应是 owner-level semantic result，而不是静默盲写：

- `reject`
- `reopen-required`
- owner-specific conflict result

## Lifecycle And Generation Rules

`Data Domain Owner` 不是纯静态边界；它必须拥有 lifecycle。

推荐最小状态：

1. `bootstrapping`
2. `active`
3. `refreshing`
4. `disposed`

语义：

- `bootstrapping`：owner 已创建，但 compiled model / child contract / initial publish state 尚未完全可执行
- `active`：owner 当前可执行 validation、publish、submit、confirm 等正常工作
- `refreshing`：owner 正在经历 model replacement 或 owner-local refresh，不应把旧 generation 结果静默发布为新 baseline
- `disposed`：owner 已失效，必须拒绝新的 registration / validation / publish 请求

需要注意：

- owner-boundary changes across recompilation 是 lifecycle/model-replacement event，不是“在原 owner 上静默换语义”
- child owner activation 也必须是 generation-aware 的，不能让旧 child contract 污染新 owner generation

## Parent And Child Domain Contract

child data domain 不是随便“confirm 一下就行”，它和 parent 之间需要稳定 contract。

### Child Activation Rule

child owner 只有在进入 `active` 状态后，才应视为真正参与 parent coordination。

因此：

- 未打开的 staged child owner 不应影响 parent gating
- 已 dispose 的 child owner 不应继续保留 active contract
- parent 在一个 submit/confirm attempt 内，应基于 snapshot 的 active child contract 集合工作

### Parent Visibility Rule

parent 默认不枚举 child owner 的内部 field errors。

parent 读取 child 的规范方式应是：

1. child summary state
2. child commit result
3. explicit child contract metadata

而不是：

- 任意深挖 child field-state map
- 越过 child owner 直接把 child internals 当成 parent field tree 的一部分

### Contract Modes

与当前 `form-validation.md` 保持一致，child owner coordination 的基础模式应是：

1. `ignore`
2. `summary-gate`
3. `recurse-submit`

含义：

1. `ignore`：parent 不用 child 来做 gating 或 submit orchestration
2. `summary-gate`：parent 只读取 child summary state 来决定 owner readiness / gating
3. `recurse-submit`：parent 的 submit/confirm 会显式触发 child submit-time validation / commit coordination

当前推荐默认：

- child draft editor 默认 `ignore`，直到自己的 confirm/commit 发生
- filter/search/wizard 只在 action 或 page-level gating 需要时采用 `summary-gate`
- nested submit-capable form 默认仍应保持显式 contract，而不是隐式递归 submit

### Commit Propagation Rule

child owner commit 只写入其 **immediate parent owner**。

因此：

- child 不应直接写 grandparent owner
- grandchild 不能绕过 parent contract 直接落入更高层 owner
- parent 收到 child commit 结果后，再决定是否继续向上 publish

这条规则保证 owner tree 的 publish semantics 是逐层收敛的，而不是跨层跳写。

## Ingress And Egress Policies

同一个 staged data domain 是否合理，关键不在“是不是又开了一个 scope”，而在下面两条方向策略。

### Ingress: external -> local

推荐基础模式：

1. `seed-on-open`
2. `sync-when-clean`
3. `rebase-on-conflict`

默认推荐：`seed-on-open`

原因：

- 它最符合 confirm/cancel 语义
- 不会在用户编辑中途被外部更新直接覆盖
- 与当前 `detail-field` / `detail-view` 的 baseline 一致

### Egress: local -> external

推荐基础模式：

1. `commit-only`
2. `live-write-through`
3. owner-specific `publish-patch`

说明：

- `publish-patch` 是 `commit-only` 的结果形式特化，不是第三套并列编辑世界
- 有 confirm/cancel 的 owner 默认应使用 `commit-only` 或 `publish-patch`

### Recommended Family Defaults

| Owner family | Ingress default | Egress default | Notes |
| --- | --- | --- | --- |
| `form` | owner-local current value | `live-write-through` | form 默认是 live owner，但可承载 staged child domains |
| `detail-field` / `detail-view` | `seed-on-open` | `commit-only` or `publish-patch` | 当前最成熟的 staged child-domain baseline |
| row-local staged editor | `seed-on-open` | `publish-patch` | commit target resolve 必须优先按 `rowKey` |
| filter/search panel | owner-specific seed | `commit-only` | 是否发布到 page/query owner 由 action contract 决定 |
| wizard step | owner-specific seed | `commit-only` | staged boundary 由 step confirm/next 决定 |

这些默认值是 owner-family baseline，不排除更窄的 schema option 特化。

## Owner Taxonomy Under This Model

## Decision Matrix

下表用于回答三个问题：

1. 是否创建 scope
2. 是否创建 `Surface Owner`
3. 是否创建 `Data Domain Owner`

| Boundary | Own scope | Surface owner | Data domain owner | Default interpretation |
| --- | --- | --- | --- | --- |
| `page` root | yes | no | conditional yes | 在没有更近 form/draft owner 时可承接 page/root data ownership |
| `form` | yes | no | yes | live publish 的 submit-capable domain owner |
| `dialog` / `drawer` shell | yes | yes | no | own scope + surface state，不默认拥有业务 submit boundary |
| `detail-field` / `detail-view` | yes | usually hosted in surface | yes | 当前 staged child-domain baseline |
| `object-field` | maybe projected scope/view | no | no | parent-owned projected editor |
| `array-field(item)` | yes or projected item view | no | no | parent-owned item editor；item scope 不等于 item owner |
| `variant-field` | maybe projected scope/view | no | no | parent-owned polymorphic editor |
| table row scope | yes | no | no | isolated row scope 默认不是 child domain |
| row-local staged editor | yes | optional | conditional yes | 只有显式 local validation + publish boundary 时才 create-owner |
| filter/search panel | yes | optional | conditional yes | 非 form owner，但可以是 validation-capable data domain |
| wizard step | yes | no | conditional yes | 取决于是否拥有独立 publish boundary |
| `loop item` | yes | no | no | lexical repeated scope，不默认 create-owner |
| `recurse` | structural only | no | no | recursive structure 本身不构成 owner boundary |

## Owner Taxonomy Under This Model

### `form`

`form` 是 `Data Domain Owner`。

它拥有：

- current values
- touched/dirty/visited policy
- submit lifecycle
- validation state

默认 `form` 是 live publish。

但 `form` 可以承载 staged child domains。

### `page` / root data scope

`page` / root data scope 在没有更近 `form` 或 local draft owner 时，可以是 `Data Domain Owner`。

它不是最推荐的 submit-oriented owner family，但它可以承接：

- page-level bound values
- page-level validation ownership
- page-local publish semantics

需要保持的边界：

- page owner 不替代 `Surface Owner`
- page owner 不自动吞并 surface-local status

### `detail-field` / `detail-view`

它们是当前最明确的 staged child-domain baseline。

它们拥有：

- local working value
- local validation state
- confirm/cancel lifecycle
- owner-managed writeback contract

推荐长期把它们视为 Data Domain 的 concrete staged-owner pattern，而不是 renderer-level 特例。

### Row Editor

row-local staged editing 可以是 child data domain。

但它有额外规则：

- current value path 仍可 index-addressed
- commit target identity 必须优先按 `rowKey` resolve
- resolve 失败时需要 reject / reopen-required 一类结果

因此 row child domain 的关键复杂度不是 validation，而是 identity retarget semantics。

### Filter Panel / Search Panel / Wizard Step

这些场景都应被允许成为数据域。

判断标准不是“是不是 form 组件”，而是：

- 是否拥有自己的一组数据
- 是否拥有独立 validation
- 是否拥有独立 publish boundary

### `dialog` / `drawer`

它们 **不是** `Data Domain Owner`。

它们是 `Surface Owner`。

surface 负责：

- open/close/active/opening/closing

但 surface 内部可以承载一个或多个 data domain owner。

如果 surface 仅承载只读内容或 parent-owned live editor，则该 surface 内部可能根本没有新的 data domain owner。

### `object-field` / `array-field` / `variant-field`

它们默认 **不是** child data domains。

它们默认是：

- parent-owned projected/path-bound editors
- parent validation domain 内的 local editor
- live publish controls

原因：

- 它们默认没有 confirm/cancel
- 它们默认不创建新的 `FormRuntime`
- 它们的主要任务是局部 path rebasing、projection、variant switching，而不是建立独立提交边界

只有在显式包裹 staged owner 时，它们内部才可能参与 staged domain。

### `loop`

`loop` 不是 data domain owner。

它是 structural expansion。

`loop item scope` 默认也不是 data domain owner。

只有当 repeated subtree 明确拥有 local validation + publish boundary 时，才应提升为 child owner。

### `recurse`

递归结构本身不构成 owner boundary。

是否 create-owner 仍由语义 owner 规则决定，而不是因为结构是 recursive。

## Relationship To Existing Validation Architecture

本文不是对 `form-validation.md` 的替代，而是其上层统一解释。

它与当前 validation architecture 的关系是：

1. `ValidationScopeRuntime` remains the correct runtime abstraction for the validation facet
2. `FormRuntime` remains a specialized validation domain runtime
3. `inherit-owner` / `create-owner` / `no-owner` remains the correct owner-resolution vocabulary
4. current renderer-level draft isolation remains a valid interim implementation

本文补充的是：

- 为什么 validation 应挂在数据域上
- 为什么 staged/live 是同一数据域的 publish policy
- 为什么并不是每个 local scope 都 create-owner

同时本文要求与 `form-validation.md` 的以下实现锚点保持一致：

- owner acceptance / rejection 仍按 `rootPath` 和 owner-qualified path 边界工作
- parent/child coordination 仍按 `ignore` / `summary-gate` / `recurse-submit` 解释
- current renderer-level draft `FormRuntime` 仍是合法 interim implementation，而不是文档错误

## Relationship To Existing Scope Architecture

本文明确拒绝以下误读：

1. isolated scope = new data domain owner
2. projected scope = new data domain owner
3. repeated child scope = new validation owner

`scope-ownership-and-isolation.md` 的 lexical inheritance / isolate 规则继续成立。

本文只补充一句更高层解释：

- `ScopeRef` 负责可见性
- `Data Domain Owner` 负责 ownership

二者相关，但不等价。

更具体地说：

- 创建 own scope 只回答“这棵子树从哪里读数据”
- 创建 data domain owner 才回答“谁拥有 validation / publish / lifecycle / commit authority”

## Relationship To Existing Composite Field Docs

本文要求以下解释保持一致：

### `object-field`

- parent-owned local object editor
- live publish
- no default child owner

### `array-field`

- parent-owned local array editor
- object items may have stable repeated identity
- no default child owner per item

### `variant-field`

- parent-owned polymorphic editor
- variant switching belongs to parent domain value lifecycle
- not a default staged owner

### `detail-field` / `detail-view`

- current staged child-domain baseline
- preferred place to carry confirm/cancel semantics today

## Explicit Rejections

本文明确拒绝以下设计：

1. 把 every local scope 都提升成 owner
2. 把 every repeated item 都提升成 owner
3. 把 `dialog` / `drawer` 变成 draft owner
4. 把 `object-field` / `array-field` / `variant-field` 默认改造成 staged submit controls
5. 因为引入 Data Domain 就强迫 validation 与通用 dependency graph 彻底合并
6. 把新的 lens-like 全局地址替换成 owner-local absolute path 作为当前 canonical runtime addressing

## Current Implementation Status

本文定义的是 target architecture baseline，但当前 live code 的成熟度并不均衡。

当前已成立的实现事实：

1. `ValidationScopeRuntime` / `FormRuntime` 已经具备 owner-local `rootPath`、owner-qualified error/path bookkeeping、child contract 以及 owner rejection rules 的基础能力
2. `detail-field` / `detail-view` 已经通过 renderer-level draft `FormRuntime` 落地 staged child-domain baseline
3. `object-field` / `array-field` / `variant-field` 已经通过 projected form/runtime view 与 path binding 实现 parent-owned local editing
4. table 已有 row scope isolation、`rowKey` identity、row scope cache；但 row-local staged editor 仍不是一个已经成熟落地的共享 owner family

当前尚未完全落地的部分：

1. compiler-aware `inherit-owner` / `create-owner` / `no-owner` owner tree partition 仍未在所有 renderer family 中完成
2. row-local staged child domain 仍缺正式 shared contract
3. filter/search/wizard 这类非-form validation owner 仍缺统一 reusable substrate；当前只落地了 `SchemaRenderer` page-owned root 这一条 non-form owner family

因此阅读本文时应明确区分：

- target owner semantics
- current implementation center of gravity

不要把“target baseline 已清晰”误读成“所有 owner family 都已同等成熟实现”。

## Migration Path

本文是长期架构基线，但不要求立即重写现有 runtime。

推荐迁移路径如下。

### Phase 0: Naming And Architecture Alignment

目标：统一术语，不改 runtime public API。

工作：

1. 在架构文档中把 validation owner 解释为 data-domain validation facet
2. 在 staged editing 文档中把 `detail-*` 解释为 child data domain baseline
3. 在 row 文档中明确 staged row edit 的 `rowKey` retarget semantics

本阶段不要求代码结构变化。

### Phase 1: Stabilize Validation As A Reusable Domain Facet

目标：让 `ValidationScopeRuntime` 真正成为可复用的 domain facet，而不是只在 `FormRuntime` 中成熟存在。

工作：

1. 保留 `FormRuntime extends ValidationScopeRuntime`
2. 引入更清晰的轻量 `ValidationScopeRuntime` factory 或 builder
3. 让 local draft editor / row editor / filter scope 不必强依赖完整 `FormRuntime` 才能获得 validation facet

退出条件：

- 至少一个非 submit-oriented child domain 可以复用该 validation substrate

### Phase 2: Formalize Staged Child-Domain Runtime Contract

目标：把当前 renderer-local draft pattern 提炼成共享 staged contract。

工作：

1. 抽出 shared staged status contract：`dirty` / `validating` / `canConfirm` / `confirming`
2. 明确 ingress/egress policy 枚举
3. 保持 `detail-field` / `detail-view` 作为第一批 concrete adopters

退出条件：

- `detail-field` / `detail-view` 不再各自手写完整 confirm/cancel lifecycle glue

### Phase 3: Row-Local Child Domain Semantics

目标：让 row-local staged editing 成为正式能力。

工作：

1. 明确 `rowKey`-based commit target resolve/reject
2. 明确 row child-domain validation 与 parent collection domain 的边界
3. 明确 resolve failure 的 reopen/reject contract

退出条件：

- row-local staged edit 不再依赖旧 index 盲写

### Phase 4: Compiler-Aware Owner Resolution Tightening

目标：让 owner resolution 从 renderer-level convention 进一步收敛成 compiler/runtime shared contract。

工作：

1. 强化 `inherit-owner` / `create-owner` / `no-owner` 的 compiler output
2. 让 concrete renderer family 按 schema options 解析为 parent-owned 或 child-domain owner
3. 保持 `loop` / projected editor 默认不 create-owner

退出条件：

- owner tree 在 compiler/runtime 之间具有稳定 shared contract

## Impact On Current Codebase

当前代码库不需要因为本文立即做以下变化：

1. 不需要重命名 `FormRuntime`
2. 不需要引入新的全局 `DataDomainRuntime` public type
3. 不需要把 every local editor 改成 create-owner
4. 不需要重写 `ScopeRef` 或七原语模型

本文的直接影响应优先体现在：

1. 文档统一
2. future runtime extraction priorities
3. owner-boundary decisions for new components

## Immediate Doc Follow-Ups

为了让本文真正接入现有 architecture baseline，优先需要收敛以下文档：

1. `docs/architecture/form-validation.md`
2. `docs/architecture/value-adaptation-and-detail-field.md`
3. `docs/architecture/table-row-identity-and-scope-performance.md`
4. `docs/architecture/object-field.md`
5. `docs/architecture/array-field.md`
6. `docs/architecture/variant-field.md`
7. `docs/architecture/scope-ownership-and-isolation.md`

其中前 3 份优先级最高。

## Final Rule

在未来新设计里，如果一个问题同时涉及：

- 值归属
- validation 归属
- staged/live publish
- child commit propagation
- row identity / conflict

优先先问：

> 这里的数据域 owner 是谁？

而不是先问：

- 需不需要再建一个 scope
- 需不需要再建一个 form runtime
- 需不需要把 surface 当成业务 owner

这是本文希望为未来 10 年 Flux 架构固定下来的核心判断顺序。
