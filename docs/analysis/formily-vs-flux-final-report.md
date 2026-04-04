# Formily 与 NOP Chaos Flux 最终综合评估报告

> 日期: 2026-04-04
> 状态: 最终保留稿
> 说明: 本文替代此前所有 Formily 对比草稿。阅读这一篇即可了解完整结论，不需要再交叉阅读其他 Formily 分析文档。
> 边界: 本文是 Formily 对比结论的唯一入口，但不是最终实现合同；具体落地仍以 `docs/architecture/*` 和当前代码为准。

## 目的

本文的目标不是单纯比较 Formily 和 `nop-chaos-flux` 谁“更先进”，而是回答四个更实际的问题：

- 两个项目在目标、架构和性能假设上到底有什么根本差异。
- Formily 的哪些成熟设计对 Flux 有真实参考价值。
- Formily 的哪些能力不应被照搬到 Flux。
- 如果要继续演进 Flux，最值得优先投入的方向是什么。

## 最终结论

- Flux 不应迁移到 Formily 的整套 Proxy 响应式架构。
- Flux 当前的 `compile once + explicit selector subscription + identity reuse` 主干，比 Formily 更适合低代码渲染器这个目标。
- Formily 最值得 Flux 学的，不是底层响应式内核，而是表单子域里的运行时设计经验。
- 这些经验主要集中在七件事上：轻量字段图 / 查询接口、受限声明式联动模型、路径缓存、validation 写回合并提交、action 链表单写入收敛、数组热路径优化、延迟 `validating/submitting` 状态标志。
- Flux 当前在几个关键方向上更符合自身目标：编译型主干、静态节点快路径、AST 表达式执行、安全性、低代码 action pipeline、多目标渲染能力。
- Flux 当前最需要的不是“换架构”，而是“补强表单运行时结构能力，并继续收紧热路径成本”。

## 研究依据

本结论基于以下材料交叉得出：

- Formily 源码：`packages/reactive/`, `packages/core/`, `packages/json-schema/`, `packages/reactive-react/`, `packages/path/`
- Flux 源码：`packages/flux-core/`, `packages/flux-formula/`, `packages/flux-runtime/`, `packages/flux-react/`, `packages/flux-renderers-form/`
- Flux 当前架构基线：`docs/architecture/flux-core.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/form-validation.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/performance-design-requirements.md`

本报告没有做 micro benchmark。涉及性能的判断属于架构层与热路径层的工程判断，不应被解读为量化 benchmark 结果。

## 项目定位差异

| 维度 | Formily | Flux |
| --- | --- | --- |
| 核心定位 | 表单框架 | 低代码渲染器 |
| 主要目标 | 复杂动态表单 | 页面、表单、表格、设计器、报表等统一运行时 |
| 中心对象 | `Form` / `Field` 图 | `CompiledSchemaNode` + runtime/store/scope |
| 响应式核心 | Proxy + reaction | Zustand + `useSyncExternalStoreWithSelector` |
| Schema 路线 | 运行时解释和字段构造 | 编译时分类后运行时解析 |
| 表达式路线 | `new Function` + `with` | AST 编译 + 状态树求值 |
| 多框架支持 | React + Vue | 当前 React，核心 runtime 尽量框架无关 |
| 多目标渲染 | 否，主要是表单 | 是，表单只是子域之一 |

这张表决定了一个核心前提：

- Formily 的最优解是“表单运行时优先”。
- Flux 的最优解是“编译产物优先”。

因此，任何对比结论都不能脱离这个前提。Formily 在表单里的最优方案，不等于 Flux 在整个低代码 runtime 里的最优方案。

## 架构总览

### Formily 的主结构

Formily 的核心结构可以概括为：

- `@formily/reactive` 提供 Proxy 响应式原语、reaction、batch、computed。
- `@formily/core` 提供 `Form`、`Field`、`ArrayField`、`ObjectField`、`VoidField` 这些显式对象模型。
- `@formily/json-schema` 提供 schema 编译、transform 和 `x-reactions` 语义。
- React/Vue 层通过 `observer()` 和相关适配器把响应式对象接到组件树上。

它的核心优势不是某个单点 API，而是“字段对象图 + 自动依赖收集 + 生命周期 effect”这一整套运行时模型。

### Flux 的主结构

Flux 的核心结构可以概括为：

- `flux-core` 提供 contracts、纯工具和编译/运行共享类型。
- `flux-formula` 负责编译表达式和运行时状态树求值。
- `flux-runtime` 负责 schema 编译、scope、form/page runtime、validation、action、request。
- `flux-react` 负责 React 集成、selector 订阅、fragment rendering 和 runtime context wiring。

它的核心优势不是表单对象图，而是“先把 schema 编译成稳定结构，再让 runtime 只解决动态部分”。

## 详细对比

## 1. 响应式模型

### Formily

Formily 依赖 Proxy 做属性级依赖收集。

- `get` 时把当前 reaction 绑定到目标对象和属性。
- `set` 时从 `RawReactionsMap` 找出相关 reaction 触发。
- `batchStart()` / `batchEnd()` 合并一轮更新。
- `computed` 带脏标记和惰性求值。

这让 Formily 在复杂表单中具备一个明显优势：

- 组件只要读取了 `field.value`、`field.display`、`field.pattern`，后续就会被自动精确更新。

### Flux

Flux 不做自动依赖收集，而是显式订阅。

- schema 先被编译成 `CompiledSchemaNode` 树。
- 静态节点通过 `flags.isStatic` 直接走零订阅路径。
- 动态节点在 `packages/flux-react/src/node-renderer.tsx` 中通过 `useSyncExternalStoreWithSelector` 订阅 scope 快照。
- 节点 meta 和 props 由 runtime 在 render 前解析，值层由 `flux-formula` 状态树维护引用复用。

### 判断

- 在纯表单、强联动、强派生状态场景里，Formily 的属性级自动追踪更精细。
- 在低代码页面、混合静态内容、非表单节点占多数的场景里，Flux 的静态快路径更合适。
- Flux 不应因为 Formily 的表单优势而放弃显式订阅模型。
- 如果 Flux 要进一步提升更新精度，正确方向不是回到 Proxy，而是“编译期依赖提取 + 更细 selector”。

## 2. 表单与字段模型

### Formily

Formily 有非常成熟的显式字段图。

- `form.fields` 保存字段实例。
- `form.query()` 支持按路径或 pattern 查询字段。
- `Field`、`ArrayField`、`ObjectField`、`VoidField` 共享统一的地址、路径、父子关系、pattern/display 继承语义。
- `VoidField` 让布局节点也参与表单图，但不持有值。

这带来两个非常强的能力：

- 任意字段查找和批量操作天然成立。
- 父级 `display/pattern` 向子级继承是运行时内建能力，不需要每个字段都写表达式。

### Flux

Flux 当前没有 Formily 那种重量级字段实例树。

- 字段信息分散在编译产物、validation model、runtime registration、store state 和 form hooks 中。
- `FormRuntime` 提供 `setValue`、`validateField`、`validateForm`、数组操作等能力。
- 复杂字段可以通过 runtime registration 暴露 `validate()`、`validateChild()`、`syncValue()` 等入口。
- 但当前没有一个统一、稳定、可查询的字段图抽象。

### 判断

- Formily 在字段建模这件事上，确实比 Flux 更成熟。
- Flux 不应复制 `Field` / `ArrayField` / `VoidField` 这套重量级对象模型。
- Flux 应吸收的是“字段图能力”，而不是“字段类体系”。
- 最合理的落地方向是给 `FormRuntime` 增加轻量只读字段图或查询接口，用来统一服务验证、联动、复杂字段、调试和工具能力。

## 3. Schema 编译与渲染管线

### Formily

Formily 更偏向运行时解释。

- Schema 会在运行时 transform 和 patch。
- `json-schema` 编译器会对 `{{...}}` 表达式做字符串编译。
- 字段是在渲染或 schema 遍历阶段逐步创建出来的。

Formily 也并非完全没有编译动作，但它的主心骨仍然是运行时字段构造和运行时联动。

### Flux

Flux 的主心骨是编译型管线。

- `SchemaCompiler` 会把 schema 分类成 meta、props、regions、events、validation 等编译产物。
- `CompiledSchemaNode` 树在 schema identity 稳定时可以复用。
- runtime 主要做动态值解析，而不是每次重新解释 schema。
- 静态节点可以直接零订阅、零动态求值返回。

### 判断

- 这是 Flux 最核心的优势之一。
- 对低代码系统来说，编译时分类比“每次渲染都重新解释 schema”更稳，也更容易做静态折叠、校验建模和 action enrichment。
- 这一块 Flux 不仅不该向 Formily 靠拢，反而应该继续强化。

## 4. 表达式系统

### Formily

Formily 的表达式路径本质上还是：

- `{{ expression }}`
- `new Function('$root', 'with($root) { ... }')`

这条路线的优点是灵活、低门槛、几乎无语法设计成本。

缺点也非常明确：

- `with` 不适合作为现代长期基础设施。
- 安全性和 CSP 兼容性较差。
- 静态分析和依赖提取能力弱。
- 值级复用和结构级优化空间较小。

### Flux

Flux 采用 AST 编译和状态树求值。

- `flux-formula` 负责 parse 和 exec。
- `evaluate.ts` 已经维护与编译树同构的 state tree。
- 未变化的叶子、对象和数组会复用上次引用。
- `node-runtime.ts` 对 static props 和浅比较 meta 也有复用路径。

### 判断

- 这是 Flux 目前最明确的架构胜点之一。
- Flux 不需要从 Formily 借表达式执行技术。
- 真正可以继续加强的，是“编译期依赖提取”和“更细的订阅切片”，不是执行模型本身。

## 5. 校验系统

### Formily

Formily 的校验是强运行时、强字段中心的。

- 字段值变化、focus、blur 等行为可直接触发校验。
- `feedbacks`、`errors`、`warnings`、`successes` 和字段生命周期高度耦合。
- `x-reactions` 让校验和联动可以围绕字段图展开。

它的优势是使用体验自然，特别适合复杂字段联动。

它的代价是：

- 规则和时机分散在字段对象和 reaction 中。
- 编译期可分析性较弱。

### Flux

Flux 的校验架构更低代码化，也更编译优先。

- 编译期收集字段、规则、依赖路径、触发器和可见性策略。
- 运行时有 `CompiledFormValidationModel`、`dependents`、`fields`、`nodes` 等结构。
- 异步规则支持 debounce 与 stale-run cancellation。
- `showErrorOn` 和 `validateOn` 被明确拆开。
- 复杂字段可以通过 runtime registration 补足。
- 同步规则注册表已经存在，不是缺口。

### 判断

- 从低代码系统架构角度看，Flux 的校验设计比 Formily 更可控，也更容易统一到 schema 编译流程里。
- 从表单开发体验角度看，Formily 仍然更圆润，尤其是在跨字段联动和字段图驱动的反馈传播上。
- Flux 当前真实缺口不是“没有校验架构”，而是三个更具体的点：字段图不足、验证写入批量化不足、`validateForm()` 仍偏顺序执行。

## 6. Action、Effects 与联动

### Formily

Formily 的副作用主要依赖两套机制：

- form/field lifecycle effects
- `x-reactions`

它非常适合表达“字段 A 变了，字段 B 的状态或值要如何变化”。

### Flux

Flux 的强项在 action pipeline。

- built-in action
- `component:<method>`
- namespaced action
- `then`
- debounce
- request cancellation
- `prevResult` 传播

这套机制明显比 Formily 更适合低代码页面和复杂交互，而不只是表单字段联动。

### 判断

- Flux 的 action runtime 已经比 Formily 更适合低代码系统。
- Formily 真正值得借鉴的不是 effect machine 本身，而是“受限声明式联动模型”。
- Flux 可以在 schema 层增加一类受限 `reactions` 描述，用来表达高频字段联动，但不应该引入任意副作用脚本和隐式全局依赖收集。

## 7. 性能特征

### 静态内容占多数的页面

- Flux 明显更占优。
- 原因不是 React 更快，而是很多节点在编译期就已经被判定为 static，运行时几乎不参与动态订阅。

### 高度联动的复杂表单

- Formily 在更新精度上更自然。
- 原因是字段对象和 Proxy 依赖收集让它天然适合“谁读了谁，谁就被更新”的模型。

### 大数组表单

- 两者都还没把问题做成“完全解决”。
- Formily 的数组字段地址补丁和字段图重排经验更成熟。
- Flux 当前已经实现数组状态重映射，但数组值本身仍主要走 immutable replacement，未受影响索引的值级稳定性还可以继续优化。

### 校验热路径

- Flux 的异步取消、debounce 和编译期依赖模型更现代。
- 但 `validateForm()` 当前仍然偏顺序执行，批量写回和并行化还有空间。

### 路径热路径

- Formily 明确有路径缓存和 match 缓存。
- Flux 当前 `parsePath()` 仍无共享缓存，这是一个明确且低风险的优化点。

### React 边界成本

- Flux 当前采用 split contexts，这是正确方向。
- 但 `NodeRenderer` 的 provider 层级是否已经成为实际瓶颈，需要 profile，而不是只看代码形态就下结论。

### 内存画像

- Formily 由于字段实例、Proxy、feedbacks、requests、reactions 的存在，运行时对象更重。
- Flux 由于没有重量级字段实例树，内存画像更偏“编译树 + store snapshot + runtime state”。
- 在没有 benchmark 的前提下，只能给出架构级判断：Flux 理论上更轻，Formily 理论上更精细。

## Flux 当前更占优或更符合目标的部分

- 编译型主干更适合低代码系统，而不只是表单。
- 静态节点零订阅快路径是 Formily 没有的核心优势。
- AST 表达式执行比 `new Function + with` 更安全、更可分析。
- 值级引用复用和状态树求值，在当前架构假设下更有利于控制重复计算和保持引用稳定性。
- action pipeline 比 Formily 的 effect/回调模型更适合低代码交互编排。
- 多目标渲染能力更符合 Flux 的系统边界，而不只是表单中心定位。
- 当前 package 边界和 runtime ownership 更清晰。

## Formily 最值得 Flux 借鉴的部分

### 1. 轻量字段图与查询接口

这是最有结构价值的借鉴点。

但这里的“字段图”必须刻意收窄：

- 它只应是 `FormRuntime` 内部或其近邻的只读查询 facade。
- 它服务于表单子域，不应先上升为整个 Flux 平台的统一对象模型。
- 它不应要求页面、设计器、报表等非表单子域都迁移到同一抽象之下。

Flux 需要的是：

- `getField(path)`
- `getChildren(path)`
- `getDependents(path)`
- `findByPrefix(path)`

而不是 `Field` 类大一统，也不是跨编译期、运行时、校验期的大统一总图。

### 2. 受限声明式联动模型

Flux 现在很多联动散落在 `visible/disabled/required/className/options` 表达式里，可读性和可分析性都一般。

应该增加的是：

- 显式 `dependencies`
- `when`
- `fulfill`
- `otherwise`

但目标只限于 schema 可分析、可编译、可预测的状态更新。
它必须被限定为表单字段联动能力，而不是扩张成第二套通用 DSL 或 effect runtime。

这里还必须明确吸取 Formily `x-reactions` 的复杂度教训。

- Formily 在真实项目里，`$deps`、`$self`、`$form`、`$observable`、`$effect`、`$memo` 这类隐式作用域变量会显著增加调试难度。
- 它们让 reaction 的依赖边界、可写范围和执行时机变得不透明。

因此，如果 Flux 实现“受限声明式联动模型”，第一版应明确排除：

- `$observable`
- `$effect`
- `$memo`

并尽量避免把 `$form`、`$self` 这类原始对象直接暴露给 schema。更稳妥的方式仍然是：

- 显式 `dependencies`
- 显式 `when`
- 显式 `fulfill/otherwise`
- 固定可写目标集合

### 3. 路径缓存

这是最明确、成本最低、收益最稳的热路径优化之一。

Formily 的路径系统不是一个简单的字符串 split 工具，而是把路径解析和匹配本身当成基础设施做了缓存。

- `@formily/path` 内部有 `pathCache`。
- 路径对象本身还维护 `matchCache`。
- 这意味着重复的 `parse/getIn/setIn/match` 不需要每次都重新做同样的字符串工作。

Flux 当前的情况更直接。

- `packages/flux-core/src/utils/path.ts` 里的 `parsePath()` 仍然是即时解析。
- `packages/flux-runtime/src/scope.ts`、`form-store.ts` 等热路径会重复调用它。
- 这在单次调用上成本不高，但在大表单、高频输入、重复验证和大量 scope 解析中会持续累积。

对 Flux 来说，这个改进的价值在于：

- 侵入性低。
- 不改变架构主干。
- 适用于表单、scope、validation、action 参数解析等多个子路径。

建议落地方式：

- 先给 `parsePath()` 增加共享缓存。
- 对编译期已知字段路径预解析为 `segments` 并挂到编译产物里。
- 热路径 API 优先走 `segments` 版本，避免重复字符串解析。

预期收益：

- 这类优化不会像“减少重渲染”那样显眼，但会稳定降低所有路径相关热路径的基础成本。
- 它特别适合作为 P0，因为低风险、可局部引入、几乎不改变外部行为。

### 4. Validation 写回合并提交

这项改进只针对表单校验写回，不涵盖 action 执行边界。

为什么它成立：

- `validateForm()`、dependent revalidation、async validation 结束写回，都会在一轮交互中产生多次离散 store 更新。
- `form-store.ts` 当前大多数状态更新都是单次 `setState()` 写回。
- `form-runtime-validation.ts` 里也会分开写 `validating[path]`、`errors[path]` 等状态。

它要解决的问题很明确：

- 不改变校验顺序。
- 不改变校验语义。
- 只减少同一轮校验流程中的碎片化 store 提交。

建议落地方式：

- 在 `FormStore` 层增加显式 patch/commit 或等价的局部合并写回能力。
- 让一轮 validation 结束时对 `errors/validating/touched` 等状态尽量合并提交。
- 保持监控、错误聚合、stale-run cancellation 的既有语义不变。

实施前提：

- 先 profile，确认瓶颈到底在 store 提交次数，还是在 dependent revalidation、selector 失效、validation rule 重跑等派生传播次数。
- 不要把 React 自动批处理或 Zustand 函数式更新误当成这里已经没有优化空间；真正要看的，是一次交互里的传播次数和派生逻辑触发次数。

风险与注意点：

- 不要把它泛化成全局事务系统。
- 不要让它吞掉字段级错误写回时序，影响调试或测试断言。

### 5. Action 链表单写入收敛

这项改进只针对 action 链里的表单写入，不应和 validation 写回混成同一个机制。

为什么它成立：

- `packages/flux-runtime/src/action-runtime.ts` 的 `dispatch()` 会顺序执行 action 与 `then` 链。
- 内建 `setValue` action 当前会直接调用 `ctx.form.setValue()` 或 `ctx.scope.update()`。
- 如果一条 action 链连续做多个字段写入、清错或相关派生更新，就可能把一次交互拆成多次独立传播。

它和 validation 写回的不同点在于：

- validation 写回是 store 层问题。
- action 链收敛是执行边界问题。
- 两者可以共享一个很薄的 `FormStore` 显式 patch/commit 原语，但不应共享同一套上层语义。

建议落地方式：

- 只在表单子域、单次 action chain 范围内引入显式写入收敛边界。
- 优先考虑显式 API 或受控 built-in action 形式，而不是对整个 `dispatch()` 隐式包裹黑盒事务。
- 不做跨请求、跨 runtime、跨页面的原子提交模型。

实施前提：

- 同样应先 profile，确认瓶颈是在多次 store 提交，还是在一次 action chain 中被反复触发的 dependent revalidation / 相关派生逻辑。
- 如果瓶颈主要来自派生传播次数，而不是提交次数，那么优先级应转向减少派生触发或增加局部缓存，而不是急着引入新的批边界。

风险与注意点：

- 必须保持 action step 边界可观测。
- 不能破坏 `prevResult`、`continueOnError`、取消语义、监控时序。
- 不要把它做成全局事务框架。

### 6. 数组热路径优化

这是所有可借鉴项里最容易转化成直接收益的一项。

Formily 在数组字段上的成熟度很高，不是因为它“支持数组”，而是因为它把数组变化当成字段图变化认真处理。

- `spliceArrayState()` 会针对受影响区间做地址补丁。
- `exchangeArrayState()` 会对移动和交换做最小范围的字段状态重排。
- 它不会把整个数组子树简单当成“删掉重来”。

Flux 当前并不是完全没有对应处理。

- `packages/flux-runtime/src/form-runtime-array.ts` 已经会重映射 `errors/touched/dirty/visited/validating/validationRuns`。
- `form-runtime.ts` 中的 `appendValue`、`insertValue`、`removeValue`、`moveValue`、`swapValue`、`replaceValue` 都已经统一走数组 mutation 路径。

但当前仍然有两个关键缺口。

第一，值层仍然主要是 immutable replacement。

- 也就是说，数组本身会得到一个新的容器。
- 对 React 来说，这意味着后续订阅路径仍可能感知到较大的变化范围。

第二，状态重映射已经存在，但 mutation plan 还不够“值和状态一体化”。

- 目前更像是“先做数组值更新，再做相关状态重映射”。
- 未来可以收敛为一次明确的 mutation plan：哪些索引插入、哪些删除、哪些搬移、哪些状态可保留原引用、哪些需要重算。

这项优化为什么是高收益：

- 大数组表单、array-editor、表格型表单是低代码系统的常见瓶颈。
- 当前很多操作在语义上只是“局部索引变化”，但运行时传播范围仍可能偏大。
- 如果做得足够好，单项插入、删除、交换、移动将更接近局部影响，而不是把整个后续区间都拖进更新波及面。

更准确地说，这里的目标不是简单喊出“从 O(n) 变 O(1)”。

- 对数组值本身来说，完全严格的 O(1) 很多时候并不现实，因为 immutable array 至少要创建新容器。
- 但对 React 重渲染波及面和字段状态迁移来说，完全可以显著逼近“局部更新效果”。
- 也就是把“后续大量子项被连带影响”的情况，压缩成“真正受影响的项更新，未受影响项尽量稳定”。

建议落地方式：

- 在 `form-runtime-array.ts` 基础上引入更明确的 array mutation plan 抽象。
- 将数组值更新、字段状态重映射、validation run 重映射、初始状态重映射尽量统一建模。
- 对未受影响索引保留值引用稳定性。
- 审视 renderer 订阅边界，避免数组局部变动引发整片列表重渲染。

预期收益：

- 对 100+ 行数组字段、表格编辑器、复杂重复组会有最直接的交互改善。
- 这是最接近“用户可感知变快”的优化项之一。

风险与注意点：

- 不能只优化 values，而忽略 errors/touched/dirty/visited/validating 的一致性。
- 必须保证 `move/swap/remove` 后 related path、aggregate error、runtime registration child path 的语义不被破坏。
- 这项优化应该建立在现有状态重映射基础上继续深化，而不是重写整套数组运行时。

### 7. 延迟 `validating/submitting` 状态标志

这是另一项高收益、低风险、非常适合先做的改进。

Formily 在这个点上做得很务实。

- `setValidating()` 和 `setSubmitting()` 不会在进入请求或校验的瞬间立刻把状态置为 `true`。
- 它会经过一个短阈值，只有当操作确实没有在极短时间内结束，才显示 validating/submitting 状态。

这个机制的价值非常直接：

- 短 async validator 不会让输入框旁边的 loading 状态一闪而过。
- 很快完成的提交或请求不会让按钮瞬间进入又退出 loading，造成 UI 闪烁。

Flux 当前的行为更直接。

- 在 `form-runtime-validation.ts` 中，只要字段含有 async rule，就会较早设置 `validating[path] = true`。
- 在 `form-runtime.ts` 的 submit 流程中，`submitting` 也会直接进入状态。

这种实现的优点是简单清晰，但体验上会有一个实际问题：

- 如果 async 验证本身很快，用户看到的是“状态抖一下”。
- 如果提交很快完成，按钮 loading 也是“一闪”。

建议落地方式：

- 给 `validating` 和 `submitting` 增加延迟置真阈值，例如 80ms 到 150ms 量级。
- 如果请求或校验在阈值内完成，则根本不显示 loading/validating。
- 一旦进入 `true`，结束时仍然立即回落到 `false`。

为什么这是高收益：

- 实现非常小。
- 行为边界清晰。
- 不改变校验语义本身，只改善状态展示时机。
- 用户对“不卡顿”和“没有闪烁”的体感提升会很明显。

风险与注意点：

- 阈值不要过大，否则会让真实长任务的反馈显得迟钝。
- 需要和现有 debounce/cancellation 语义协同，避免延迟置真和取消逻辑互相打架。
- 这项优化本质上是展示策略优化，不应改变真实的 validation/submission 完成语义。

### 8. 字段 presentation 派生快照

这一节对应的是“惰性计算脏标记”在 Flux 里的更准确表达。

这里也要避免把它做成新的通用派生状态系统；它更适合被理解为字段展示层附近的局部只读 helper。

Flux 已有值级缓存，但字段 presentation state 仍然分散在多个判断点里。当前更合适的改进方向，不是再发明一套新的通用缓存系统，而是给字段展示态建立稳定的派生快照。

第一版最适合放在 `FormRuntime` / `flux-react` 字段 hooks 的交界处：

- `flux-runtime` 负责根据 store 状态、validation behavior、meta 和字段上下文生成只读派生结果。
- `flux-react` 通过稳定 hook 或 selector 消费这个结果。
- `FieldFrame`、字段 renderer hooks、错误展示逻辑使用它，而不是各处重复拼装同一套条件。
- 第一版不要建设独立缓存子系统；先作为局部派生 helper 落地即可。

这类派生快照的最小字段集合可以从下面几项开始：

- `effectiveDisabled`
- `effectiveRequired`
- `error visibility`
- `interactive/readOnly presentation`

后续再视需要扩展，例如：

- `showError`
- `displayErrors`
- `effectiveVisible` 或其他与展示层高度相关但不直接等同于原始 schema/meta 的状态

失效边界也要定义清楚：

- 它不是全局任意缓存。
- 只在影响字段展示态的输入变化时失效，例如 `disabled`、validation visibility、`touched/visited/submitting`、相关展示策略变化。

这样做的价值在于：

- 它能把“惰性计算/脏标记”的有效内核落到一个明确层次。
- 它比重新引入自动依赖收集更符合 Flux 当前架构。
- 它会减少 `FieldFrame`、form hooks、renderer 层的重复判断逻辑。

## 不应采纳的方向

- 不要引入整套 Proxy 自动依赖收集。
- 不要把 Flux 重构成重量级 `Field` / `ArrayField` / `VoidField` 对象体系。
- 不要退回运行时 schema 解释优先。
- 不要把 Formily 的 `reactive-react` 生命周期问题，机械映射为 Flux 的主要问题。
- 不要因为表单联动体验优秀，就让整个 Flux runtime 重新围绕表单对象图设计。

## 对前期分析草稿的独立评估结论

前期几份草稿的大方向基本是对的，但需要做五个纠偏。

### 1. 正确判断

- 不要把 Flux 迁移到 Formily 的底层响应式路线。
- 字段图、路径缓存、数组热路径、延迟状态标志、受限声明式联动，确实是高价值借鉴点。

### 2. 需要纠正的地方

- Flux 已经有同步校验规则注册表，不应再把它当成核心缺口。
- Flux 已经有数组字段状态重映射，不应再把它描述成“完全整体重建”。
- Flux 已经有表达式状态树和引用复用，不应再把它描述成“缺少缓存基础”。

### 3. 需要降级的建议

- `NodeRenderer` context/provider 扁平化不是当前已被证实的 P0。
- validation 并行化值得研究，但必须先保证行为一致性，不能直接按“并行一定更快”推进。
- GC 安全网不是当前的主要迁移项。

## 对 7 项候选建议的最终判定

下面这 7 条，是前期分析里较集中的一组建议。为了避免后续再做二次猜测，这里给出逐条最终判定。

## 术语映射表

为避免后续 backlog、计划和实现讨论中一事多名，本文固定使用下面这组最终术语。旧名称只在这里保留一次。

| 旧说法 | 本文最终术语 |
| --- | --- |
| 编译时节点查询 API | 轻量字段图 / 查询接口 |
| 声明式 Reaction 支持 | 受限声明式联动模型 |
| 惰性计算脏标记 | 字段 presentation 派生快照 + 编译期依赖提取与更细 selector |
| Scope Proxy 自动选择器 | 编译期依赖提取与更细 selector |
| 细粒度 FormStore 追踪 | 更细 selector + 字段 presentation 派生快照 + 字段图支撑 |
| Action Pipeline 批处理 | Action 链表单写入收敛 |
| 表单验证批量写回 | Validation 写回合并提交 |

| 原建议 | 最终判定 | 当前报告中的吸收方式 |
| --- | --- | --- |
| 全局校验规则注册表 | 已有实现，不再作为缺口 | 只保留“可扩展能力”结论，不作为 P0 改进项 |
| Action Pipeline 批处理 | 有效，已吸收 | 体现在“Action 链表单写入收敛” |
| 惰性计算脏标记 | 有效，但应改写为 Flux 兼容表达 | 体现在“字段 presentation 派生快照”和“编译期依赖提取与更细 selector” |
| 编译时节点查询 API | 有效，已吸收 | 体现在“轻量字段图 / 查询接口” |
| 声明式 Reaction 支持 | 有效，已吸收 | 体现在“受限声明式联动模型” |
| Scope Proxy 自动选择器 | 不直接采纳，但保留有效内核 | 改写为“编译期依赖提取与更细 selector” |
| 细粒度 FormStore 追踪 | 不直接采纳，但保留有效内核 | 改写为“更细 selector + 派生快照 + 字段图支撑” |

### 1. 全局校验规则注册表

这条建议的“问题意识”是对的，但对当前代码状态已经不准确。

Flux 现在已经有同步校验规则注册表：

- `packages/flux-runtime/src/validation/registry.ts` 提供 `createValidationRegistry()`。
- 支持 `get()`、`has()`、`register()`、`list()`。
- `createBuiltInValidationRegistry()` 已经把内建规则注册进去。
- `validation-runtime.ts` 已经按 registry 执行同步规则。

所以这条建议里真正还有效的部分，不是“补 registry”，而是下面两个扩展方向：

- 是否需要让更多规则种类统一走 registry 扩展点。
- 是否需要对第三方/业务侧暴露更稳定的规则扩展接入面。

最终判定：

- 有效内核已存在。
- 不再作为 P0 缺口。
- 可以作为中期扩展能力，而不是当前核心改进项。

### 1A. 表单验证批量写回

这条建议是有效的，而且应与 `Action Pipeline 批处理` 分开理解。

为什么它成立：

- `form-store.ts` 当前大多数字段状态更新仍是单次 `setState()` 写回。
- `form-runtime-validation.ts` 会分开处理 `setValidating(path, true)`、`setPathErrors(path, errors)`、`setValidating(path, false)` 等状态写回。
- 在一轮 `validateForm()`、dependent revalidation 或 async validation 完成时，这些离散写回会放大传播次数。

它要解决的问题是：

- 校验写回过碎。
- 不是 action 执行语义。
- 也不是全局事务模型。

在本文里，这条建议对应的最终术语是：

- `Validation 写回合并提交`

最终判定：

- 这条建议有效。
- 应作为独立改进项保留。
- 它和 `Action 链表单写入收敛` 可共享底层 `FormStore` 显式 patch/commit 原语，但不共享同一套上层语义。

### 2. Action Pipeline 批处理

这条建议是有效的，而且当前终稿里原本表达得还不够直白。

为什么它成立：

- `packages/flux-runtime/src/action-runtime.ts` 里的 `dispatch()` 会按顺序执行 action 与 `then` 链。
- `setValue` 内建 action 当前会直接调用 `ctx.form.setValue()` 或 `ctx.scope.update()`。
- 这意味着在链式 action 中，如果连续出现多个 `setValue` / `clearErrors` / 依赖重校验，就可能产生多次离散写入和多次派生副作用传播。

这条建议和“表单验证批量写回”可以共享底层原语，但不应再被视为同一个上层改进项。

- `表单验证批量写回` 更偏 store 写回合并。
- `Action Pipeline 批处理` 更偏 action chain 内的表单写入收敛。

在本文里，这条建议对应的最终术语是：

- `Action 链表单写入收敛`

为什么值得吸收：

- 低代码 action 往往天然是链式的。
- 单个交互里连续触发多个字段写入是常态，不是边角场景。
- 如果每一步都立刻触发完整的派生传播，成本会叠加。

建议改写后的落地方向：

- 不把它狭义理解成“给 Action Runtime 加一个 batch() 包起来”这么简单。
- 更适合只做 action chain 范围内的显式写入收敛边界。
- 如果需要共用底层能力，也只应复用 `FormStore` 的显式 patch/commit 原语，而不是共用同一套上层事务模型。
- 例如，让链式 `setValue` 在显式边界内先累积表单写入，再统一提交，最后再一次性触发相关 dependent revalidation 或聚合派生更新。

最终判定：

- 这条建议有效。
- 它不应再和“表单验证批量写回”合并成一个统一概念。
- 它和“Validation 写回合并提交”一起，构成两条相邻但不同的优化路径。

### 3. 惰性计算脏标记

这条建议有效，但原表述容易让人误以为 Flux 现在完全没有缓存基础，这不准确。

Flux 当前已经有：

- `flux-formula` 里的 state tree。
- 叶子/数组/对象级引用复用。
- `node-runtime.ts` 里的 static props 复用和 meta 浅比较复用。

所以真实问题不是“要不要从零引入惰性计算”，而是：

- 现有值级缓存，是否继续向字段展示态和依赖级订阅推进。

Formily 这条建议里真正值得借鉴的有效内核是：

- 脏标记不仅可以存在于表达式值层。
- 也可以存在于字段派生展示态层。
- 更可以通过明确依赖边界减少无效派生计算。

因此我在终稿里把它改写成两个更适合 Flux 的落地方向：

- `字段 presentation 派生快照`
- `编译期依赖提取与更细 selector`

最终判定：

- 原建议有效。
- 但必须改写后吸收。
- 不应表述为“补惰性计算基础”，而应表述为“把已有缓存体系继续向派生态和依赖边界推进”。

### 4. 编译时节点查询 API

这条建议有效，而且已经被吸收到终稿里，但名字换成了更贴近当前架构的版本。

为什么成立：

- Flux 当前缺一个统一、稳定、可查询的字段/节点视图。
- 而跨字段联动、复杂字段、调试、校验依赖追踪，本质上都在消费同一类结构能力。

为什么我没有直接沿用“编译时节点查询 API”这个说法：

- 因为仅仅“编译时”还不够。
- Flux 真正需要的是“在 `FormRuntime` 内把编译产物、runtime registration、validation model 暴露为可查询 facade 的轻量字段图”。
- 它不应被实现成平台级统一总图，也不应成为整个 Flux 的新中心对象模型。

所以最终落点被写成：

- `轻量字段图 / 查询接口`

最终判定：

- 这条建议有效。
- 已被吸收。
- 在当前终稿里属于 P0 的表单子域结构基础设施。

### 5. 声明式 Reaction 支持

这条建议有效，而且已被吸收为终稿的核心建议之一。

但这里有一个重要前提：

- Flux 不应引入 Formily 那种“任意 reaction + 任意副作用脚本”的整体心智。
- Flux 更适合的是“受限声明式联动模型”。

也就是说，真正要吸收的是：

- 显式 `dependencies`
- 显式 `when`
- 显式 `fulfill/otherwise`
- 可分析、可编译、可预测的状态变化

而不是：

- 隐式副作用
- 任意脚本
- 绕开 action/runtime 语义的自由写法
- `$observable`
- `$effect`
- `$memo`

最终判定：

- 这条建议有效。
- 已被吸收。
- 在终稿里以 `受限声明式联动模型` 命名，且优先级为 P1。
- 实现时应严格限制在表单字段联动，编译到现有 runtime/action/validation 机制，而不是新建通用 effect engine。
- 第一版应明确排除 Formily 式的隐式 observable/effect/memo 变量注入，避免把调试复杂度一起引入。

### 6. Scope Proxy 自动选择器

这条建议里有有效问题意识，但“解决方案”不适合 Flux。

它想解决的问题是对的：

- 当前手写 selector 或整 scope 快照感知，确实还可以更细。
- 动态节点未来应该更精确地只感知自己依赖的路径。

但它给出的方案是：

- 用 Proxy 自动捕获 scope 读取，再自动生成选择器。

这对 Flux 来说问题很大：

- 会把系统重新带回隐式依赖收集。
- 调试和边界可见性会下降。
- 与当前 `subscription-first` 和编译优先基线冲突。

因此，终稿里保留的是它的有效内核，而放弃其实现形式：

- 保留“更细依赖感知”的目标。
- 放弃“Scope Proxy 自动捕获”的做法。
- 改写为 `编译期依赖提取与更细 selector`。

最终判定：

- 原建议的问题意识有效。
- 原方案不采纳。
- 改写后作为 P2 长期方向保留。
- 第一阶段只应覆盖少量可静态提取的表达式形态和已知热路径，不以完备依赖分析为目标。

### 7. 细粒度 FormStore 追踪

这条建议和上一条类似，也是“问题意识有效，方案需要改写”。

它想解决的是：

- store 粒度还可以更细。
- 组件不应该因为不相关字段变化而被波及。

这没有问题。

但如果把它直接实现成属性级自动追踪式 store，代价就会接近重新引入 Formily 那类底层模型。

对 Flux 更合适的版本是：

- 继续使用显式 selector。
- 借助字段图和依赖提取把 selector 做细。
- 在 renderer/form hooks 层建立更稳定的派生快照。

所以这条建议在终稿里的吸收方式是三部分：

- `轻量字段图 / 查询接口`
- `字段 presentation 派生快照`
- `编译期依赖提取与更细 selector`

最终判定：

- 原建议的问题意识有效。
- 原方案不直接采纳。
- 以 Flux 兼容形式保留为长期优化方向。

## 优先级与实施顺序

本节只保留一套主排期顺序，供后续计划和 issue 拆分直接使用。若只谈收益/风险比，文中会单独注明，但不再和主排期顺序并列竞争。

## P0

- 延迟 `validating/submitting` 状态标志。
  - 原因：实现小、收益直接、能明显减少 UI 闪烁。
  - 目标：把“极快任务的闪烁型 loading”消掉，而不改变真实语义。
- 路径缓存与预解析。
  - 原因：低风险、适用面广、热路径稳定受益。
  - 目标：减少 `parsePath/getIn/setIn/resolveScopePath` 的重复解析成本。
- 轻量字段图 / 查询接口。
  - 原因：这是后续声明式联动、复杂字段、调试和验证优化的基础设施。
  - 目标：给 `FormRuntime` 提供只读查询 facade，而不是建设平台级统一字段对象模型。
- Validation 写回合并提交。
  - 原因：当前 validation 流程中的 `errors/validating/touched` 等状态写回仍偏碎片化。
  - 目标：在不改变校验顺序和语义的前提下，减少同一轮 validation 的 store 提交次数。
- Action 链表单写入收敛。
  - 原因：链式 action 中连续字段写入会把一次交互拆成多次独立传播。
  - 目标：只在单次 action chain 范围内收敛表单写入，不引入全局事务模型。

## P1

- 数组热路径深化优化。
  - 原因：这是最接近用户可感知性能提升的方向之一。
  - 目标：在现有状态重映射基础上，进一步缩小数组操作后的重渲染与状态扰动范围。
  - 备注：如果只从收益/风险比看，它与延迟状态标志一起属于最高收益项，但在主排期顺序上放在字段图和路径基础设施之后。
- 受限声明式联动模型。
  - 原因：当前联动过多埋在分散表达式中，可读性和可分析性都不足。
  - 目标：以显式 `dependencies/when/fulfill/otherwise` 覆盖高频表单字段联动场景，不扩张为第二套通用 DSL。
- 字段 presentation 派生快照。
  - 原因：当前展示态仍有一定重复拼装成本。
  - 目标：以局部派生 helper 方式减少 renderer 层对 `error visibility/effective disabled/effective required` 的重复计算。

## P2

- 编译期依赖提取与更细 selector。
  - 原因：这是比 Proxy 自动追踪更符合 Flux 主架构的长期方案。
  - 目标：让动态节点逐步从“scope 全快照感知”走向“依赖路径感知”，但只先覆盖少量可静态提取的热路径表达式。
- `NodeRenderer` provider 层级 profile 驱动优化。
  - 原因：这是可能的热点，但当前证据不足以直接提升优先级。
  - 目标：先用 profile 证明是否真是瓶颈，再决定是否压缩 context 边界。
- validation model 结构整理。
  - 原因：`fields/nodes` 双视图存在一定重复。
  - 目标：在不破坏当前行为的前提下，逐步减少冗余投影。

## 实施备注

- 如果只看收益/风险比，最醒目的两个动作仍然是：数组热路径优化、延迟 `validating/submitting` 状态标志。
- 但本文采用的主排期顺序不是纯 ROI 排序，而是“收益 + 架构依赖顺序”的综合排序。
- 因此数组优化虽然收益高，仍放在字段图和路径基础设施之后，避免后续实现时缺少结构支撑。

## 最终判断

Formily 对 Flux 的最大参考价值，不是告诉 Flux 应该换一套底层技术栈，而是证明了几件事：

- 表单子域确实需要比通用渲染层更强的运行时结构能力。
- 字段图、依赖图、数组热路径和状态调度，决定了复杂表单的长期可维护性。
- 这些能力完全可以在 Flux 现有编译型主干之上增量建设，而不必牺牲静态快路径、表达式安全性和多目标渲染能力。

如果只保留一句最终结论，那么就是：

- Flux 应继续坚持编译优先主架构，只在表单子域系统性吸收 Formily 的运行时设计经验，而绝不复制 Formily 的整体响应式底座。
